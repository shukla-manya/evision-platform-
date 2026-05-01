import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  cartApi,
  productApi,
  type Product,
  publicContactApi,
} from '../services/api';
import { colors } from '../theme/colors';
import { screenGutter } from '../theme/layout';
import { publicWebUrl } from '../config/publicWeb';
import { getBrowseProductIds, recordProductBrowse } from '../lib/product-browse-history';

type RootProductDetail = { ProductDetail: { product: Product } };

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    Number(amount || 0),
  );
}

function isHotProduct(p: Product): boolean {
  return Number(p.rating_avg || 0) >= 4.6;
}

function getProductPriceForRole(product: Product, role?: string) {
  const isDealer = role === 'dealer';
  const preferred = isDealer ? product.price_dealer : product.price_customer;
  const fallback = isDealer ? product.price_customer : product.price_dealer;
  return Number(preferred ?? fallback ?? 0);
}

function shortBlurb(description: string | undefined): string {
  if (!description?.trim()) return '';
  const parts = description.trim().split(/\n\s*\n/);
  const head = parts.slice(0, 2).join('\n\n').trim();
  if (head.length > 600) return `${head.slice(0, 580).trim()}…`;
  return head;
}

function asApiError(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string | string[] } } };
  const msg = e?.response?.data?.message;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.join(', ');
  return fallback;
}

type Props = {
  route: RouteProp<RootProductDetail, 'ProductDetail'>;
  navigation: {
    navigate: (name: string, params?: Record<string, unknown>) => void;
    goBack: () => void;
    replace: (name: string, params?: Record<string, unknown>) => void;
  };
  userRole?: string;
};

export function ProductDetailScreen({ route, navigation, userRole }: Props) {
  const initial = route.params.product;
  const [product, setProduct] = useState<Product>(initial);
  const [detailLoading, setDetailLoading] = useState(false);
  const [related, setRelated] = useState<Product[]>([]);
  const [recent, setRecent] = useState<Product[]>([]);
  const [tab, setTab] = useState<'description' | 'reviews'>('description');
  const [qty, setQty] = useState(1);
  const [selImg, setSelImg] = useState(0);
  const [cartLoading, setCartLoading] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);

  const [enqName, setEnqName] = useState('');
  const [enqEmail, setEnqEmail] = useState('');
  const [enqMessage, setEnqMessage] = useState('');
  const [enqSending, setEnqSending] = useState(false);
  const [enqDone, setEnqDone] = useState(false);

  const images = useMemo(() => {
    const list = Array.isArray(product.images) && product.images.length ? product.images : [];
    if (list.length) return list;
    return product.image_url ? [product.image_url] : [];
  }, [product.images, product.image_url]);

  const loadDetail = useCallback(async () => {
    try {
      setDetailLoading(true);
      const { data } = await productApi.getById(initial.id);
      setProduct(data);
      setSelImg(0);
    } catch {
      setProduct(initial);
    } finally {
      setDetailLoading(false);
    }
  }, [initial]);

  useFocusEffect(
    useCallback(() => {
      void loadDetail();
    }, [loadDetail]),
  );

  useEffect(() => {
    void recordProductBrowse(product.id);
  }, [product.id]);

  useEffect(() => {
    const m = userRole === 'dealer' ? Math.max(1, Number(product.min_order_quantity || 1)) : 1;
    setQty((q) => (userRole === 'dealer' ? Math.max(m, q) : Math.max(1, q)));
  }, [product.id, product.min_order_quantity, userRole]);

  useEffect(() => {
    if (selImg >= images.length) setSelImg(0);
  }, [images.length, selImg]);

  useEffect(() => {
    if (!product.category_id) {
      setRelated([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await productApi.list({
          category_id: product.category_id,
          approved_shops_only: true,
        });
        const list = ((data as Product[]) || []).filter((p) => p.id !== product.id).slice(0, 6);
        if (!cancelled) setRelated(list);
      } catch {
        if (!cancelled) setRelated([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [product.category_id, product.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ids = (await getBrowseProductIds()).filter((x) => x !== product.id).slice(0, 8);
      const out: Product[] = [];
      for (const pid of ids) {
        try {
          const { data } = await productApi.getById(pid);
          out.push(data);
        } catch {
          /* skip */
        }
      }
      if (!cancelled) setRecent(out.slice(0, 6));
    })();
    return () => {
      cancelled = true;
    };
  }, [product.id]);

  const inStock = product.stock == null || Number(product.stock) > 0;
  const canAddToCart = (userRole === 'customer' || userRole === 'dealer') && inStock;
  const dealerMin = userRole === 'dealer' ? Math.max(1, Number(product.min_order_quantity || 1)) : 1;
  const maxQty = product.stock != null ? Math.max(1, Number(product.stock)) : 99;
  const ratingAvg = Number(product.rating_avg || 0);
  const reviewCount = Number(product.rating_count || 0);
  const blurbs = shortBlurb(product.description);
  const lowTh = Number(product.low_stock_threshold ?? 10);
  const stockNum = product.stock != null ? Number(product.stock) : null;
  const showUrgency = inStock && stockNum != null && stockNum > 0 && stockNum <= lowTh;

  const addToCart = async (thenCheckout: boolean) => {
    if (!inStock) return;
    const fn = thenCheckout ? setBuyLoading : setCartLoading;
    fn(true);
    try {
      const n = userRole === 'dealer' ? Math.max(dealerMin, qty) : qty;
      await cartApi.add(product.id, n);
      if (thenCheckout) {
        navigation.navigate('Checkout');
      } else {
        Alert.alert('Added', 'Product added to cart.', [
          { text: 'Continue shopping', style: 'cancel' },
          { text: 'View cart', onPress: () => navigation.navigate('Main', { screen: 'Cart' }) },
        ]);
      }
    } catch (err) {
      Alert.alert('Error', asApiError(err, 'Failed to add to cart.'));
    } finally {
      fn(false);
    }
  };

  const onShare = async () => {
    const url = publicWebUrl(`/products/${product.id}`);
    try {
      await Share.share({ message: `${product.name}\n${url}`, url });
    } catch {
      /* */
    }
  };

  const sendEnquiry = async () => {
    const name = enqName.trim();
    const email = enqEmail.trim();
    const message = enqMessage.trim();
    if (!name || !email || !message) {
      Alert.alert('Required', 'Please enter name, email, and message.');
      return;
    }
    const parts = name.split(/\s+/);
    const first_name = parts[0] || name;
    const last_name = parts.slice(1).join(' ') || first_name;
    setEnqSending(true);
    try {
      await publicContactApi.submitMessage({
        first_name,
        last_name,
        email,
        message: `[Product enquiry: ${product.name} (id: ${product.id})]\n\n${message}`,
      });
      setEnqDone(true);
      setEnqName('');
      setEnqEmail('');
      setEnqMessage('');
    } catch (err) {
      Alert.alert('Error', asApiError(err, 'Could not send enquiry.'));
    } finally {
      setEnqSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollPad} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => navigation.goBack()} style={styles.backRow}>
          <MaterialCommunityIcons name="chevron-left" size={22} color={colors.brandPrimary} />
          <Text style={styles.backText}>Back to products</Text>
        </Pressable>

        {detailLoading ? (
          <View style={styles.detailLoading}>
            <ActivityIndicator color={colors.brandPrimary} />
          </View>
        ) : null}

        <View style={styles.card}>
          {images.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbStrip}>
              {images.map((uri, i) => (
                <Pressable key={uri + i} onPress={() => setSelImg(i)} style={[styles.thumb, selImg === i && styles.thumbActive]}>
                  <Image source={{ uri }} style={styles.thumbImg} resizeMode="cover" />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
          {images[selImg] ? (
            <Image source={{ uri: images[selImg] }} style={styles.heroImg} resizeMode="contain" />
          ) : (
            <View style={[styles.heroImg, styles.heroPlaceholder]}>
              <MaterialCommunityIcons name="package-variant" size={64} color={colors.muted} />
            </View>
          )}
          {isHotProduct(product) ? (
            <View style={styles.hotBadge}>
              <Text style={styles.hotBadgeText}>Hot</Text>
            </View>
          ) : null}

          <Text style={styles.title}>{product.name}</Text>
          {product.brand ? <Text style={styles.brandLine}>{product.brand}</Text> : null}

          {ratingAvg > 0 ? (
            <Text style={styles.ratingBlock}>
              Rated {ratingAvg.toFixed(2)} out of 5
              {reviewCount > 0
                ? ` based on ${reviewCount} customer rating${reviewCount === 1 ? '' : 's'} (${reviewCount} review${
                    reviewCount === 1 ? '' : 's'
                  })`
                : ''}
            </Text>
          ) : null}

          {blurbs ? <Text style={styles.blurb}>{blurbs}</Text> : null}

          <Text style={[styles.stockLine, inStock ? styles.stockIn : styles.stockOut]}>
            {inStock ? (product.stock != null ? `${product.stock} in stock` : 'In stock') : 'Out of stock'}
          </Text>
          <Text style={styles.bigPrice}>{formatINR(getProductPriceForRole(product, userRole))}</Text>

          {showUrgency ? (
            <View style={styles.urgency}>
              <MaterialCommunityIcons name="flash" size={18} color="#B45309" />
              <Text style={styles.urgencyText}>Hurry! Only a few left — order now</Text>
            </View>
          ) : null}

          <View style={styles.qtyRow}>
            <Text style={styles.qtyLabel}>Quantity</Text>
            <View style={styles.qtyBox}>
              <Pressable
                onPress={() => setQty((q) => Math.max(userRole === 'dealer' ? dealerMin : 1, q - 1))}
                style={styles.qtyBtn}
                disabled={qty <= (userRole === 'dealer' ? dealerMin : 1)}
              >
                <Text style={styles.qtyBtnText}>−</Text>
              </Pressable>
              <Text style={styles.qtyNum}>{qty}</Text>
              <Pressable
                onPress={() => setQty((q) => Math.min(maxQty, q + 1))}
                style={styles.qtyBtn}
                disabled={!inStock || qty >= maxQty}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </Pressable>
            </View>
          </View>

          {canAddToCart ? (
            <View style={styles.actionsCol}>
              <Pressable
                style={[styles.button, cartLoading && styles.buttonDisabled]}
                onPress={() => void addToCart(false)}
                disabled={cartLoading || buyLoading}
              >
                <Text style={styles.buttonText}>{cartLoading ? 'Adding…' : 'Add to cart'}</Text>
              </Pressable>
              <Pressable
                style={[styles.buttonOutline, (buyLoading || cartLoading) && styles.buttonDisabled]}
                onPress={() => void addToCart(true)}
                disabled={buyLoading || cartLoading}
              >
                <Text style={styles.buttonOutlineText}>{buyLoading ? 'Please wait…' : 'Buy now'}</Text>
              </Pressable>
            </View>
          ) : !inStock ? (
            <Text style={styles.hint}>This item is out of stock.</Text>
          ) : (
            <Text style={styles.hint}>Sign in as a customer or dealer to purchase.</Text>
          )}

          <Pressable style={styles.shareRow} onPress={() => void onShare()}>
            <MaterialCommunityIcons name="share-variant" size={18} color={colors.brandPrimary} />
            <Text style={styles.shareText}>Share this product</Text>
          </Pressable>

          {product.amazon_url ? (
            <Pressable style={styles.amazonCard} onPress={() => void Linking.openURL(String(product.amazon_url))}>
              <Text style={styles.amazonTitle}>Buy now from Amazon</Text>
              <Text style={styles.amazonSub}>Opens in your browser</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.tabBar}>
          <Pressable onPress={() => setTab('description')} style={[styles.tab, tab === 'description' && styles.tabOn]}>
            <Text style={[styles.tabText, tab === 'description' && styles.tabTextOn]}>Description</Text>
          </Pressable>
          <Pressable onPress={() => setTab('reviews')} style={[styles.tab, tab === 'reviews' && styles.tabOn]}>
            <Text style={[styles.tabText, tab === 'reviews' && styles.tabTextOn]}>
              Reviews{reviewCount > 0 ? ` (${reviewCount})` : ''}
            </Text>
          </Pressable>
        </View>
        <View style={styles.tabPanel}>
          {tab === 'description' ? (
            <Text style={styles.bodyText}>{product.description || 'No description for this product.'}</Text>
          ) : (
            <View>
              {ratingAvg > 0 ? (
                <Text style={styles.bodyText}>
                  Average {ratingAvg.toFixed(2)} / 5
                  {reviewCount > 0 ? ` from ${reviewCount} review${reviewCount === 1 ? '' : 's'}.` : '.'}
                </Text>
              ) : (
                <Text style={styles.bodyText}>No ratings yet.</Text>
              )}
              <Text style={[styles.bodyText, { marginTop: 10 }]}>
                Written reviews will appear here when enabled. Use the enquiry form below for questions before you buy.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Send enquiry</Text>
          <Text style={styles.sectionSub}>Questions about this product? We will reply by email.</Text>
          {enqDone ? (
            <Text style={styles.success}>Thank you — your enquiry was sent.</Text>
          ) : (
            <>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput style={styles.input} value={enqName} onChangeText={setEnqName} placeholder="Your name" />
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={enqEmail}
                onChangeText={setEnqEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={styles.inputLabel}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={enqMessage}
                onChangeText={setEnqMessage}
                placeholder="Your question…"
                multiline
              />
              <Pressable style={[styles.button, enqSending && styles.buttonDisabled]} onPress={() => void sendEnquiry()} disabled={enqSending}>
                <Text style={styles.buttonText}>{enqSending ? 'Sending…' : 'Send enquiry'}</Text>
              </Pressable>
            </>
          )}
        </View>

        {related.length > 0 ? (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeading}>Related products</Text>
            {related.map((p) => {
              const img = p.images?.[0] || p.image_url;
              const ok = p.stock == null || Number(p.stock) > 0;
              return (
                <Pressable key={p.id} style={styles.relCard} onPress={() => navigation.replace('ProductDetail', { product: p })}>
                  {img ? <Image source={{ uri: img }} style={styles.relImg} resizeMode="cover" /> : null}
                  <View style={styles.relBody}>
                    <Text style={styles.relCat} numberOfLines={1}>
                      {p.category_name || p.brand || 'Product'}
                    </Text>
                    <Text style={styles.relName} numberOfLines={2}>
                      {p.name}
                    </Text>
                    <Text style={styles.relPrice}>{formatINR(getProductPriceForRole(p, userRole))}</Text>
                    <Text style={ok ? styles.relCta : styles.relOos}>{ok ? 'View' : 'Out of stock'}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {recent.length > 0 ? (
          <View style={[styles.sectionBlock, { marginBottom: 24 }]}>
            <Text style={styles.sectionHeading}>Recently viewed</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recent.map((p) => {
                const img = p.images?.[0] || p.image_url;
                const r = Number(p.rating_avg || 0);
                return (
                  <Pressable
                    key={p.id}
                    style={styles.recentCard}
                    onPress={() => navigation.replace('ProductDetail', { product: p })}
                  >
                    <View style={styles.recentImgWrap}>
                      {img ? <Image source={{ uri: img }} style={styles.recentImg} resizeMode="cover" /> : null}
                    </View>
                    <Text style={styles.recentName} numberOfLines={2}>
                      {p.name}
                    </Text>
                    {r > 0 ? <Text style={styles.recentRate}>Rated {r.toFixed(2)} / 5</Text> : null}
                    <Text style={styles.recentPrice}>{formatINR(getProductPriceForRole(p, userRole))}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const g = screenGutter;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scrollPad: { paddingHorizontal: g, paddingTop: 8, paddingBottom: 32 },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backText: { fontSize: 14, fontWeight: '600', color: colors.brandPrimary },
  detailLoading: { paddingVertical: 8, alignItems: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 14,
  },
  thumbStrip: { marginBottom: 10, maxHeight: 72 },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  thumbActive: { borderColor: colors.brandPrimary },
  thumbImg: { width: '100%', height: '100%' },
  heroImg: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: colors.softPanel,
    marginBottom: 12,
  },
  heroPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  hotBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  hotBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  brandLine: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  ratingBlock: { fontSize: 13, color: colors.textSecondary, marginTop: 8, lineHeight: 20 },
  blurb: { fontSize: 13, color: colors.textSecondary, marginTop: 10, lineHeight: 20 },
  stockLine: { fontSize: 12, fontWeight: '700', marginTop: 10 },
  stockIn: { color: colors.serviceSuccess },
  stockOut: { color: colors.pending },
  bigPrice: { fontSize: 26, fontWeight: '800', color: colors.brandPrimary, marginTop: 6 },
  urgency: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  urgencyText: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 12 },
  qtyLabel: { fontSize: 13, color: colors.textSecondary },
  qtyBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 10 },
  qtyBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  qtyBtnText: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  qtyNum: { minWidth: 36, textAlign: 'center', fontWeight: '700', color: colors.textPrimary },
  actionsCol: { marginTop: 16, gap: 10 },
  button: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  buttonOutline: {
    borderWidth: 2,
    borderColor: colors.brandPrimary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.brandSoft,
  },
  buttonOutlineText: { color: colors.brandPrimary, fontWeight: '800', fontSize: 16 },
  hint: { fontSize: 13, color: colors.textSecondary, marginTop: 12 },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  shareText: { fontSize: 14, fontWeight: '600', color: colors.brandPrimary },
  amazonCard: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.softPanel,
    borderWidth: 1,
    borderColor: colors.border,
  },
  amazonTitle: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  amazonSub: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 0 },
  tab: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -1 },
  tabOn: { borderBottomColor: colors.brandPrimary },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.muted },
  tabTextOn: { color: colors.textPrimary },
  tabPanel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.border,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  bodyText: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  sectionSub: { fontSize: 13, color: colors.textSecondary, marginTop: 6, marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: 10 },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  success: { fontSize: 14, fontWeight: '600', color: colors.serviceSuccess, marginTop: 8 },
  sectionBlock: { marginTop: 8 },
  sectionHeading: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 12 },
  relCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    overflow: 'hidden',
  },
  relImg: { width: 100, height: 100, backgroundColor: colors.softPanel },
  relBody: { flex: 1, padding: 10, justifyContent: 'center' },
  relCat: { fontSize: 11, color: colors.muted },
  relName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginTop: 2 },
  relPrice: { fontSize: 15, fontWeight: '800', color: colors.brandPrimary, marginTop: 6 },
  relCta: { fontSize: 12, fontWeight: '700', color: colors.brandPrimary, marginTop: 4 },
  relOos: { fontSize: 12, fontWeight: '700', color: colors.pending, marginTop: 4 },
  recentCard: { width: 140, marginRight: 12 },
  recentImgWrap: {
    width: 140,
    height: 140,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.softPanel,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recentImg: { width: '100%', height: '100%' },
  recentName: { fontSize: 12, fontWeight: '700', color: colors.textPrimary, marginTop: 8 },
  recentRate: { fontSize: 10, color: colors.muted, marginTop: 4 },
  recentPrice: { fontSize: 14, fontWeight: '800', color: colors.brandPrimary, marginTop: 4 },
});
