import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { adminApi, catalogApi } from '../services/api';
import { colors } from '../theme/colors';
import { statusColor } from '../theme/status';

type AdminStackParamList = {
  Dashboard: undefined;
  Products: undefined;
  ProductForm: { product?: any };
  Orders: undefined;
  OrderDetail: { orderId: string };
  Invoices: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

type Category = { id: string; name: string; parent_id?: string | null };

type ShipForm = {
  delivery_name: string;
  delivery_phone: string;
  delivery_address: string;
  delivery_city: string;
  delivery_state: string;
  delivery_pincode: string;
  weight: string;
};

const EMPTY_SHIP_FORM: ShipForm = {
  delivery_name: '',
  delivery_phone: '',
  delivery_address: '',
  delivery_city: '',
  delivery_state: '',
  delivery_pincode: '',
  weight: '',
};

const STATUS_LABEL: Record<string, string> = {
  payment_confirmed: 'Payment confirmed',
  order_received: 'Order received',
  confirmed: 'Confirmed',
  pending: 'Pending',
  shipment_created: 'Shipped',
  picked_up: 'Picked up',
  in_transit: 'In transit',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  order_cancelled: 'Cancelled',
  payment_failed: 'Payment failed',
};

const SHIPPABLE = new Set(['order_received', 'payment_confirmed', 'confirmed', 'pending']);

const DELIVERY_STEPS = [
  { key: 'shipment_created', label: 'Shipped', timestamp: 'shipped_at' as const },
  { key: 'picked_up', label: 'Picked up', timestamp: 'picked_up_at' as const },
  { key: 'in_transit', label: 'In transit', timestamp: 'in_transit_at' as const },
  { key: 'out_for_delivery', label: 'Out for delivery', timestamp: 'out_for_delivery_at' as const },
  { key: 'delivered', label: 'Delivered', timestamp: 'delivered_at' as const },
];

function asError(err: unknown, fallback: string) {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.join(', ');
  return fallback;
}

function fmtIn(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function fmtDetail(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatInr(n: number | null | undefined) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

function statusLabel(status?: string | null) {
  const s = String(status || '');
  return STATUS_LABEL[s] || s || '—';
}

function assetToUploadFile(asset: ImagePicker.ImagePickerAsset) {
  return {
    uri: asset.uri,
    name: asset.fileName || `image-${Date.now()}.jpg`,
    type: asset.mimeType || 'image/jpeg',
  };
}

function DeliveryTimeline({ order }: { order: Record<string, unknown> }) {
  const statusOrder = DELIVERY_STEPS.map((s) => s.key);
  const currentIdx = statusOrder.indexOf(String(order.status || ''));
  if (currentIdx === -1) return null;

  return (
    <View style={{ marginTop: 8, gap: 6 }}>
      {DELIVERY_STEPS.map((step, idx) => {
        const done = idx <= currentIdx;
        const ts = fmtIn(order[step.timestamp] as string | undefined);
        return (
          <View key={step.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: done ? colors.brandPrimary : colors.border }} />
            <Text style={[styles.smallMuted, { flex: 1, color: done ? colors.textPrimary : colors.textSecondary }]}>{step.label}</Text>
            {ts ? <Text style={styles.smallMuted}>{ts}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

function DashboardScreen({ navigation }: any) {
  const [admin, setAdmin] = useState<{
    shop_name?: string;
    owner_name?: string;
    status?: string;
  } | null>(null);
  const [counts, setCounts] = useState<{ products: number | null; orders: number | null; invoices: number | null }>({
    products: null,
    orders: null,
    invoices: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meRes = await adminApi.me();
        if (cancelled) return;
        const me = (meRes.data || {}) as { shop_name?: string; owner_name?: string; status?: string };
        setAdmin(me);
        if (me.status === 'pending') {
          setLoading(false);
          return;
        }
        const [prod, ord, inv] = await Promise.all([
          adminApi.getProducts().catch(() => ({ data: [] })),
          adminApi.getOrders().catch(() => ({ data: [] })),
          adminApi.getInvoices().catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        setCounts({
          products: Array.isArray(prod.data) ? prod.data.length : 0,
          orders: Array.isArray(ord.data) ? ord.data.length : 0,
          invoices: Array.isArray(inv.data) ? inv.data.length : 0,
        });
      } catch {
        if (!cancelled) Alert.alert('Error', 'Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !admin) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.brandPrimary} />
          <Text style={[styles.cardMeta, { marginTop: 10 }]}>Loading dashboard…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (admin.status === 'pending') {
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.listPad}>
          <View style={[styles.card, { alignItems: 'center', paddingVertical: 22 }]}>
            <Text style={styles.cardTitle}>Awaiting approval</Text>
            <Text style={[styles.cardMeta, { textAlign: 'center', marginTop: 8 }]}>
              Your shop <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{admin.shop_name || '—'}</Text> is under review. You
              will be notified by email once a superadmin approves your account.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const tiles = [
    { label: 'Products', value: counts.products ?? '—', onPress: () => navigation.navigate('Products') },
    { label: 'Orders', value: counts.orders ?? '—', onPress: () => navigation.navigate('Orders') },
    { label: 'Invoices', value: counts.invoices ?? '—', onPress: () => navigation.navigate('Invoices') },
    { label: 'Status', value: admin.status === 'approved' ? 'Live' : '—', onPress: () => navigation.navigate('Settings') },
  ];

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.listPad}>
        <View style={{ marginBottom: 8 }}>
          <Text style={styles.pageTitle}>Dashboard</Text>
          <Text style={styles.pageSubtitle}>
            {admin.shop_name ?? 'Your shop'} —{' '}
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        <View style={styles.tileGrid}>
          {tiles.map((t) => (
            <Pressable key={t.label} style={styles.tile} onPress={t.onPress}>
              <Text style={styles.tileValue}>{t.value}</Text>
              <Text style={styles.tileLabel}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick actions</Text>
          <Pressable style={styles.buttonSecondary} onPress={() => navigation.navigate('ProductForm')}>
            <Text style={styles.buttonSecondaryText}>Add product</Text>
          </Pressable>
          <Pressable style={styles.buttonSecondary} onPress={() => navigation.navigate('Orders')}>
            <Text style={styles.buttonSecondaryText}>View orders</Text>
          </Pressable>
          <Pressable style={styles.buttonSecondary} onPress={() => navigation.navigate('Invoices')}>
            <Text style={styles.buttonSecondaryText}>Invoices</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProductsScreen({ navigation }: any) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await adminApi.getProducts();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      Alert.alert('Error', asError(err, 'Failed to load products'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = (id: string, name: string) => {
    Alert.alert('Delete product', `Delete "${name}" permanently?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminApi.deleteProduct(id);
            await load();
          } catch (err) {
            Alert.alert('Error', asError(err, 'Could not delete'));
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        contentContainerStyle={styles.listPad}
        data={rows}
        onRefresh={() => void load()}
        refreshing={loading}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 8 }}>
            <Text style={styles.pageTitle}>Products</Text>
            <Text style={styles.pageSubtitle}>Retail and dealer prices, stock, and images</Text>
            <Pressable style={styles.button} onPress={() => navigation.navigate('ProductForm')}>
              <Text style={styles.buttonText}>Add product</Text>
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={[styles.card, { alignItems: 'center', paddingVertical: 24 }]}>
              <Text style={styles.cardTitle}>No products yet</Text>
              <Text style={[styles.cardMeta, { textAlign: 'center', marginTop: 6 }]}>
                Create your first product with customer and dealer prices.
              </Text>
              <Pressable style={[styles.button, { marginTop: 14, width: '80%' }]} onPress={() => navigation.navigate('ProductForm')}>
                <Text style={styles.buttonText}>Add product</Text>
              </Pressable>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.productRow}>
            <View style={styles.thumb}>
              {item.images?.[0] ? (
                <Image source={{ uri: String(item.images[0]) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              ) : (
                <Text style={styles.thumbPlaceholder}>No image</Text>
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {String(item.name || '-')}
                </Text>
                {item.is_low_stock ? (
                  <View style={styles.badgeWarn}>
                    <Text style={styles.badgeWarnText}>Low stock</Text>
                  </View>
                ) : null}
                {item.active === false ? (
                  <View style={styles.badgeMuted}>
                    <Text style={styles.badgeMutedText}>Inactive</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.monoSmall} numberOfLines={1}>
                {String(item.id)}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                <View>
                  <Text style={styles.kicker}>Customer price</Text>
                  <Text style={styles.priceStrong}>{formatInr(Number(item.price_customer))}</Text>
                </View>
                <View>
                  <Text style={styles.kicker}>Dealer price</Text>
                  <Text style={styles.priceStrong}>{formatInr(Number(item.price_dealer))}</Text>
                </View>
                <View>
                  <Text style={styles.kicker}>Stock</Text>
                  <Text style={styles.priceStrong}>{String(item.stock ?? '—')}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                <Pressable style={[styles.buttonSecondary, { flex: 1 }]} onPress={() => navigation.navigate('ProductForm', { product: item })}>
                  <Text style={styles.buttonSecondaryText}>Edit</Text>
                </Pressable>
                <Pressable style={[styles.dangerOutline, { flex: 1 }]} onPress={() => void remove(String(item.id), String(item.name || 'Product'))}>
                  <Text style={styles.dangerOutlineText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function ProductFormScreen({ route, navigation }: any) {
  const product = route.params?.product as any | undefined;
  const isEdit = Boolean(product?.id);

  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(isEdit);

  const [name, setName] = useState(String(product?.name || ''));
  const [description, setDescription] = useState(String(product?.description || ''));
  const [priceCustomer, setPriceCustomer] = useState(String(product?.price_customer ?? ''));
  const [priceDealer, setPriceDealer] = useState(String(product?.price_dealer ?? ''));
  const [stock, setStock] = useState(String(product?.stock ?? ''));
  const [categoryId, setCategoryId] = useState(String(product?.category_id || ''));
  const [brand, setBrand] = useState(String(product?.brand || ''));
  const [active, setActive] = useState(product?.active !== false);
  const [lowStockThreshold, setLowStockThreshold] = useState(String(product?.low_stock_threshold ?? '10'));
  const [existingImages, setExistingImages] = useState<string[]>(Array.isArray(product?.images) ? product.images.map(String) : []);
  const [newAssets, setNewAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);

  useEffect(() => {
    catalogApi
      .getCategories()
      .then((r) => setCategories(Array.isArray(r.data) ? (r.data as Category[]) : []))
      .catch(() => Alert.alert('Error', 'Could not load categories'));
  }, []);

  useEffect(() => {
    if (!isEdit || !product?.id) return;
    adminApi
      .getProduct(String(product.id))
      .then((r) => {
        const p = r.data as any;
        setName(String(p.name || ''));
        setDescription(String(p.description || ''));
        setPriceCustomer(String(p.price_customer ?? ''));
        setPriceDealer(String(p.price_dealer ?? ''));
        setStock(String(p.stock ?? ''));
        setCategoryId(String(p.category_id || ''));
        setBrand(String(p.brand || ''));
        setActive(p.active !== false);
        setLowStockThreshold(String(p.low_stock_threshold ?? 10));
        setExistingImages(Array.isArray(p.images) ? p.images.map(String) : []);
      })
      .catch(() => {
        Alert.alert('Not found', 'Product not found.');
        navigation.goBack();
      })
      .finally(() => setLoadingProduct(false));
  }, [isEdit, navigation, product?.id]);

  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery permission is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.75,
    });
    if (result.canceled || !result.assets?.length) return;
    setNewAssets((prev) => [...prev, ...result.assets]);
  };

  const save = async () => {
    if (!isEdit && !categoryId) {
      Alert.alert('Category required', 'Choose a category.');
      return;
    }
    try {
      setSaving(true);
      let uploadedUrls: string[] = [];
      if (newAssets.length > 0) {
        const files = newAssets.map(assetToUploadFile);
        const up = await adminApi.uploadProductImages(files);
        uploadedUrls = ((up.data as { urls?: string[] })?.urls || []).map(String);
      }

      const nextImages = [...existingImages, ...uploadedUrls];

      const body: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim(),
        price_customer: Number(priceCustomer),
        price_dealer: Number(priceDealer),
        stock: Number(stock),
        category_id: categoryId,
        brand: brand.trim() ? brand.trim() : isEdit ? null : undefined,
        active,
        low_stock_threshold: Number(lowStockThreshold) || 10,
      };

      if (isEdit) {
        body.images = nextImages;
        await adminApi.updateProduct(String(product.id), body);
      } else {
        if (nextImages.length) body.images = nextImages;
        await adminApi.createProduct(body);
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', asError(err, isEdit ? 'Could not update product' : 'Could not create product'));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    if (!isEdit) return;
    Alert.alert('Delete product', 'Delete this product permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminApi.deleteProduct(String(product.id));
            navigation.goBack();
          } catch (err) {
            Alert.alert('Error', asError(err, 'Could not delete'));
          }
        },
      },
    ]);
  };

  if (loadingProduct) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.brandPrimary} />
          <Text style={[styles.cardMeta, { marginTop: 10 }]}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.listPad}>
        <Text style={styles.pageTitle}>{isEdit ? 'Edit product' : 'New product'}</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Name" />

          <Text style={[styles.label, { marginTop: 10 }]}>Description</Text>
          <TextInput style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} multiline placeholder="Description" />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Customer price (₹)</Text>
              <TextInput style={styles.input} value={priceCustomer} onChangeText={setPriceCustomer} keyboardType="number-pad" placeholder="0" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Dealer price (₹)</Text>
              <TextInput style={styles.input} value={priceDealer} onChangeText={setPriceDealer} keyboardType="number-pad" placeholder="0" />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Stock</Text>
              <TextInput style={styles.input} value={stock} onChangeText={setStock} keyboardType="number-pad" placeholder="0" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Low stock alert at</Text>
              <TextInput style={styles.input} value={lowStockThreshold} onChangeText={setLowStockThreshold} keyboardType="number-pad" placeholder="10" />
            </View>
          </View>

          <Text style={[styles.label, { marginTop: 10 }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
              {categories.map((c) => {
                const selected = categoryId === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setCategoryId(c.id)}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
                      {c.parent_id ? `↳ ${c.name}` : c.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <Text style={[styles.label, { marginTop: 10 }]}>Brand (optional)</Text>
          <TextInput style={styles.input} value={brand} onChangeText={setBrand} placeholder="Brand" />

          {isEdit && existingImages.length > 0 ? (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Current images</Text>
              <ScrollView style={{ maxHeight: 120, marginTop: 6 }} nestedScrollEnabled>
                {existingImages.map((u) => (
                  <View key={u} style={styles.imageUrlRow}>
                    <Text style={styles.monoTiny} numberOfLines={2}>
                      {u}
                    </Text>
                    <Pressable onPress={() => setExistingImages((prev) => prev.filter((x) => x !== u))}>
                      <Text style={styles.linkDanger}>Remove</Text>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
              <Text style={styles.hint}>Append more images below; full list is sent on save.</Text>
            </View>
          ) : null}

          <Text style={[styles.label, { marginTop: 12 }]}>Images (optional)</Text>
          <Pressable style={styles.buttonSecondary} onPress={() => void pickImages()}>
            <Text style={styles.buttonSecondaryText}>Pick images from gallery</Text>
          </Pressable>
          {newAssets.length > 0 ? (
            <Text style={[styles.cardMeta, { marginTop: 6 }]}>{newAssets.length} new image(s) selected</Text>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}>
            <Switch value={active} onValueChange={setActive} />
            <Text style={styles.cardMeta}>{active ? 'Active (visible in catalogue)' : 'Inactive'}</Text>
          </View>

          <Pressable style={styles.button} onPress={() => void save()} disabled={saving}>
            <Text style={styles.buttonText}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save product'}</Text>
          </Pressable>

          {isEdit ? (
            <Pressable style={[styles.dangerOutline, { marginTop: 10 }]} onPress={onDelete}>
              <Text style={styles.dangerOutlineText}>Delete</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function OrdersScreen({ navigation }: any) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [shipTarget, setShipTarget] = useState<any | null>(null);
  const [form, setForm] = useState<ShipForm>(EMPTY_SHIP_FORM);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await adminApi.getOrders();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      Alert.alert('Error', asError(err, 'Failed to load orders'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openShip = (order: any) => {
    setShipTarget(order);
    setForm(EMPTY_SHIP_FORM);
  };

  const submitShip = async () => {
    if (!shipTarget) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        delivery_name: form.delivery_name,
        delivery_phone: form.delivery_phone,
        delivery_address: form.delivery_address,
        delivery_city: form.delivery_city,
        delivery_state: form.delivery_state,
        delivery_pincode: form.delivery_pincode,
      };
      if (form.weight.trim()) body.weight = parseFloat(form.weight);
      await adminApi.shipOrder(String(shipTarget.id), body);
      setShipTarget(null);
      await load();
    } catch {
      Alert.alert('Shipment failed', 'Could not create shipment. Check Shiprocket credentials and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        contentContainerStyle={styles.listPad}
        data={rows}
        onRefresh={() => void load()}
        refreshing={loading}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          <View style={{ marginBottom: 10 }}>
            <Text style={styles.pageTitle}>Orders</Text>
            <Text style={styles.pageSubtitle}>Orders placed with your shop. Ship directly via Shiprocket.</Text>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={[styles.card, { alignItems: 'center', paddingVertical: 22 }]}>
              <Text style={styles.cardTitle}>No orders yet</Text>
              <Text style={[styles.cardMeta, { textAlign: 'center', marginTop: 6 }]}>
                When customers check out from your catalogue, orders will appear here.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => navigation.navigate('OrderDetail', { orderId: String(item.id) })}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
              <Text style={styles.monoSmall} numberOfLines={1}>
                {String(item.id).slice(0, 8)}…
              </Text>
              <View
                style={[
                  styles.statusPill,
                  { borderColor: statusColor(String(item.status || '-')) },
                ]}
              >
                <Text style={[styles.statusPillText, { color: statusColor(String(item.status || '-')) }]}>{statusLabel(item.status)}</Text>
              </View>
            </View>
            <Text style={[styles.priceStrong, { marginTop: 6 }]}>{formatInr(item.total_amount != null ? Number(item.total_amount) : null)}</Text>
            <Text style={[styles.cardMeta, { marginTop: 6 }]}>Placed: {fmtIn(item.created_at) ?? '—'}</Text>

            {item.awb_number ? (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.kicker}>AWB</Text>
                <Text style={styles.monoSmall}>{String(item.awb_number)}</Text>
                <Text style={[styles.cardMeta, { marginTop: 4 }]}>{String(item.courier_name || 'Shiprocket')}</Text>
                {item.tracking_url ? (
                  <Pressable onPress={() => void Linking.openURL(String(item.tracking_url))}>
                    <Text style={styles.link}>Track shipment →</Text>
                  </Pressable>
                ) : null}
                <DeliveryTimeline order={item} />
              </View>
            ) : (
              <Text style={[styles.smallMuted, { marginTop: 10 }]}>Not shipped</Text>
            )}

            {SHIPPABLE.has(String(item.status || '').toLowerCase()) ? (
              <Pressable style={[styles.buttonSecondary, { marginTop: 12 }]} onPress={() => openShip(item)}>
                <Text style={styles.buttonSecondaryText}>Generate shipment</Text>
              </Pressable>
            ) : null}
          </Pressable>
        )}
      />

      <Modal visible={Boolean(shipTarget)} transparent animationType="fade" onRequestClose={() => !submitting && setShipTarget(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => !submitting && setShipTarget(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.cardTitle}>Generate shipment</Text>
            <Text style={[styles.cardMeta, { marginTop: 4 }]}>
              Order {shipTarget ? String(shipTarget.id).slice(0, 8) : ''}… · via Shiprocket
            </Text>
            <Text style={[styles.smallMuted, { marginTop: 10 }]}>
              Enter the customer&apos;s delivery address to book this shipment on Shiprocket.
            </Text>

            <ScrollView style={{ maxHeight: 420, marginTop: 12 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Recipient name *</Text>
              <TextInput style={styles.input} value={form.delivery_name} onChangeText={(t) => setForm((f) => ({ ...f, delivery_name: t }))} />
              <Text style={[styles.label, { marginTop: 8 }]}>Phone *</Text>
              <TextInput style={styles.input} value={form.delivery_phone} onChangeText={(t) => setForm((f) => ({ ...f, delivery_phone: t }))} keyboardType="phone-pad" />
              <Text style={[styles.label, { marginTop: 8 }]}>Street address *</Text>
              <TextInput style={styles.input} value={form.delivery_address} onChangeText={(t) => setForm((f) => ({ ...f, delivery_address: t }))} />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>City *</Text>
                  <TextInput style={styles.input} value={form.delivery_city} onChangeText={(t) => setForm((f) => ({ ...f, delivery_city: t }))} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>State *</Text>
                  <TextInput style={styles.input} value={form.delivery_state} onChangeText={(t) => setForm((f) => ({ ...f, delivery_state: t }))} />
                </View>
              </View>
              <Text style={[styles.label, { marginTop: 8 }]}>Pincode *</Text>
              <TextInput style={styles.input} value={form.delivery_pincode} onChangeText={(t) => setForm((f) => ({ ...f, delivery_pincode: t }))} keyboardType="number-pad" />
              <Text style={[styles.label, { marginTop: 8 }]}>Weight (kg)</Text>
              <TextInput style={styles.input} value={form.weight} onChangeText={(t) => setForm((f) => ({ ...f, weight: t }))} keyboardType="decimal-pad" placeholder="0.5" />
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Pressable style={[styles.buttonSecondary, { flex: 1 }]} disabled={submitting} onPress={() => setShipTarget(null)}>
                <Text style={styles.buttonSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.button, { flex: 1 }]} disabled={submitting} onPress={() => void submitShip()}>
                <Text style={styles.buttonText}>{submitting ? 'Creating…' : 'Create shipment'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function OrderDetailScreen({ route, navigation }: any) {
  const orderId = String(route.params?.orderId || '');
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [shipping, setShipping] = useState(false);

  const canShip = useMemo(() => order && SHIPPABLE.has(String(order.status || '').toLowerCase()), [order]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await adminApi.getOrder(orderId);
      setOrder(data || null);
    } catch {
      Alert.alert('Error', 'Failed to load order detail');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const ship = async () => {
    try {
      setShipping(true);
      await adminApi.shipOrder(orderId);
      await load();
    } catch {
      Alert.alert('Error', 'Could not generate shipment');
    } finally {
      setShipping(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.brandPrimary} />
          <Text style={[styles.cardMeta, { marginTop: 10 }]}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.listPad}>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.link}>← Orders</Text>
          </Pressable>
          <View style={[styles.card, { marginTop: 12 }]}>
            <Text style={styles.cardMeta}>Order not found.</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.listPad}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.link}>← Orders</Text>
        </Pressable>

        <View style={[styles.card, { marginTop: 12 }]}>
          <Text style={styles.cardTitle}>Order {String(order.id)}</Text>
          <Text style={[styles.cardMeta, { marginTop: 6 }]}>Placed: {fmtDetail(order.created_at)}</Text>
          <View style={{ marginTop: 12 }}>
            <Text style={styles.kicker}>Current delivery status</Text>
            <Text style={styles.pageTitle}>{String(order.status || '—')}</Text>
            {order.total_amount != null ? <Text style={[styles.priceStrong, { marginTop: 6 }]}>{formatInr(Number(order.total_amount))}</Text> : null}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Shipment</Text>
          <View style={{ marginTop: 10, gap: 10 }}>
            <View>
              <Text style={styles.kicker}>AWB Number</Text>
              <Text style={styles.monoSmall}>{order.awb_number ? String(order.awb_number) : 'Not generated'}</Text>
            </View>
            <View>
              <Text style={styles.kicker}>Courier</Text>
              <Text style={styles.cardMeta}>{String(order.courier_name || '—')}</Text>
            </View>
            <View>
              <Text style={styles.kicker}>Shipped At</Text>
              <Text style={styles.cardMeta}>{fmtDetail(order.shipped_at)}</Text>
            </View>
            <View>
              <Text style={styles.kicker}>Tracking</Text>
              {order.tracking_url ? (
                <Pressable onPress={() => void Linking.openURL(String(order.tracking_url))}>
                  <Text style={styles.link}>Open tracker</Text>
                </Pressable>
              ) : (
                <Text style={styles.cardMeta}>—</Text>
              )}
            </View>
          </View>
          <Pressable style={[styles.button, { marginTop: 14 }]} disabled={!canShip || shipping} onPress={() => void ship()}>
            <Text style={styles.buttonText}>{shipping ? 'Generating…' : 'Generate Shipment'}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Customer</Text>
          <View style={{ marginTop: 10, gap: 10 }}>
            <View>
              <Text style={styles.kicker}>Name</Text>
              <Text style={styles.cardMeta}>{String(order.customer?.name || '—')}</Text>
            </View>
            <View>
              <Text style={styles.kicker}>Role</Text>
              <Text style={styles.cardMeta}>{String(order.customer?.role || '—')}</Text>
            </View>
            <View>
              <Text style={styles.kicker}>Email</Text>
              <Text style={styles.cardMeta}>{String(order.customer?.email || '—')}</Text>
            </View>
            <View>
              <Text style={styles.kicker}>Phone</Text>
              <Text style={styles.cardMeta}>{String(order.customer?.phone || '—')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Items</Text>
          <View style={{ marginTop: 10, gap: 8 }}>
            {items.length === 0 ? <Text style={styles.cardMeta}>No line items.</Text> : null}
            {items.map((it: any) => (
              <View key={String(it.id)} style={styles.lineItem}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.cardMeta}>{String(it.product_name || 'Product')}</Text>
                  <Text style={styles.smallMuted}>
                    Qty: {String(it.quantity || 1)} x {formatInr(Number(it.unit_price || 0))}
                  </Text>
                </View>
                <Text style={styles.priceStrong}>{formatInr(Number(it.line_total || 0))}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InvoicesScreen() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await adminApi.getInvoices();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      Alert.alert('Error', asError(err, 'Failed to load invoices'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        contentContainerStyle={styles.listPad}
        data={rows}
        onRefresh={() => void load()}
        refreshing={loading}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          <View style={{ marginBottom: 10 }}>
            <Text style={styles.pageTitle}>Invoices</Text>
            <Text style={styles.pageSubtitle}>Invoices linked to orders from your shop</Text>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={[styles.card, { alignItems: 'center', paddingVertical: 22 }]}>
              <Text style={styles.cardTitle}>No invoices yet</Text>
              <Text style={[styles.cardMeta, { textAlign: 'center', marginTop: 6 }]}>
                Invoices generated for your shop orders will show here.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.invoiceRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.monoSmall} numberOfLines={1}>
                {String(item.id)}
              </Text>
              <Text style={[styles.cardMeta, { marginTop: 6 }]} numberOfLines={1}>
                Order: {String(item.order_id ?? '—')}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <View style={styles.badgeMuted}>
                <Text style={styles.badgeMutedText}>{String(item.status ?? '—')}</Text>
              </View>
              <Text style={styles.priceStrong}>{formatInr(item.amount != null ? Number(item.amount) : null)}</Text>
              <Text style={styles.smallMuted}>{fmtDetail(item.issued_at ?? item.created_at)}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function SettingsScreen({
  onLogout,
  onOpenPasswordReset,
}: {
  onLogout: () => void;
  onOpenPasswordReset: (phone?: string) => void;
}) {
  const [admin, setAdmin] = useState<{
    shop_name?: string;
    owner_name?: string;
    email?: string;
    phone?: string;
    gst_no?: string;
    address?: string;
    status?: string;
    logo_url?: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    adminApi
      .me()
      .then((r) => setAdmin((r.data || null) as any))
      .catch(() => Alert.alert('Error', 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const pickLogo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery permission is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (result.canceled || !result.assets?.[0]) return;
    const file = assetToUploadFile(result.assets[0]);
    try {
      setUploading(true);
      const { data } = await adminApi.uploadLogo(file);
      const logo_url = (data as { logo_url?: string })?.logo_url;
      setAdmin((a) => (a && logo_url ? { ...a, logo_url } : a));
    } catch (err) {
      Alert.alert('Error', asError(err, 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.listPad}>
        <Text style={styles.pageTitle}>Shop settings</Text>
        <Text style={styles.pageSubtitle}>Profile and branding</Text>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.brandPrimary} />
            <Text style={[styles.cardMeta, { marginTop: 10 }]}>Loading…</Text>
          </View>
        ) : admin ? (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
              <View style={styles.logoBox}>
                {admin.logo_url ? (
                  <Image source={{ uri: String(admin.logo_url) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <Text style={styles.thumbPlaceholder}>No logo</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Shop logo</Text>
                <Pressable style={[styles.buttonSecondary, { marginTop: 8 }]} onPress={() => void pickLogo()} disabled={uploading}>
                  <Text style={styles.buttonSecondaryText}>{uploading ? 'Uploading…' : 'Upload new logo'}</Text>
                </Pressable>
              </View>
            </View>

            <View style={{ marginTop: 16, gap: 12 }}>
              {[
                ['Shop name', admin.shop_name],
                ['Owner', admin.owner_name],
                ['Email', admin.email],
                ['Phone', admin.phone],
                ['GST', admin.gst_no],
                ['Address', admin.address],
                ['Status', admin.status],
              ].map(([label, val]) => (
                <View key={label as string}>
                  <Text style={styles.kicker}>{label}</Text>
                  <Text style={styles.cardMeta}>{val ? String(val) : '—'}</Text>
                </View>
              ))}
            </View>

            <Pressable style={[styles.button, { marginTop: 16 }]} onPress={() => onOpenPasswordReset(admin.phone)}>
              <Text style={styles.buttonText}>Change Password (OTP)</Text>
            </Pressable>
            <Pressable style={[styles.buttonSecondary, { marginTop: 10 }]} onPress={onLogout}>
              <Text style={styles.buttonSecondaryText}>Logout</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

export function AdminFlow({
  onLogout,
  onOpenPasswordReset,
}: {
  onLogout: () => void;
  onOpenPasswordReset: (phone?: string) => void;
}) {
  const settings = useMemo(
    () => () => <SettingsScreen onLogout={onLogout} onOpenPasswordReset={onOpenPasswordReset} />,
    [onLogout, onOpenPasswordReset],
  );

  return (
    <Stack.Navigator>
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
      <Stack.Screen name="Products" component={ProductsScreen} options={{ title: 'Products' }} />
      <Stack.Screen name="ProductForm" component={ProductFormScreen} options={{ title: 'Product' }} />
      <Stack.Screen name="Orders" component={OrdersScreen} options={{ title: 'Orders' }} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Order' }} />
      <Stack.Screen name="Invoices" component={InvoicesScreen} options={{ title: 'Invoices' }} />
      <Stack.Screen name="Settings" component={settings} options={{ title: 'Settings' }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  listPad: { padding: 16, gap: 12 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  pageSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  input: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
  },
  label: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  hint: { fontSize: 11, color: colors.textSecondary, marginTop: 6 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  cardMeta: { fontSize: 13, color: colors.textSecondary },
  smallMuted: { fontSize: 11, color: colors.textSecondary },
  monoSmall: { fontSize: 12, color: colors.textSecondary, fontFamily: 'Menlo' },
  monoTiny: { fontSize: 11, color: colors.textSecondary, fontFamily: 'Menlo', flex: 1, paddingRight: 8 },
  kicker: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  priceStrong: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  row: { flexDirection: 'row', gap: 8 },
  button: {
    width: '100%',
    backgroundColor: colors.brandPrimary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonSecondary: {
    width: '100%',
    backgroundColor: colors.indigo,
    borderWidth: 0,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonSecondaryText: { color: '#FFFFFF', fontWeight: '600' },
  buttonText: { color: colors.surface, fontWeight: '600' },
  dangerOutline: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.error,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  dangerOutlineText: { color: colors.error, fontWeight: '700' },
  link: { color: colors.brandPrimary, fontWeight: '600', fontSize: 13 },
  linkDanger: { color: colors.error, fontWeight: '700', fontSize: 12 },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileValue: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  tileLabel: { marginTop: 6, fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  productRow: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: {
    width: 96,
    height: 96,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlaceholder: { fontSize: 11, color: colors.textSecondary, paddingHorizontal: 8, textAlign: 'center' },
  badgeWarn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  badgeWarnText: { fontSize: 10, fontWeight: '800', color: colors.pending, textTransform: 'uppercase' },
  badgeMuted: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: `${colors.border}33`,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeMutedText: { fontSize: 10, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase' },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  statusPillText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    maxWidth: 260,
  },
  chipSelected: { borderColor: colors.brandPrimary, backgroundColor: `${colors.brandPrimary}14` },
  chipText: { color: colors.textSecondary, fontWeight: '600', fontSize: 12 },
  chipTextSelected: { color: colors.textPrimary },
  imageUrlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  lineItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  invoiceRow: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 4,
  },
  logoBox: {
    width: 96,
    height: 96,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 16,
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
});
