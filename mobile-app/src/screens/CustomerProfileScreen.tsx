import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { authApi } from '../services/api';
import { publicWebUrl } from '../config/publicWeb';
import { colors } from '../theme/colors';
import { screenGutter } from '../theme/layout';
import { PublicWebsiteLinks } from '../components/PublicWebsiteLinks';

const NOTIF_EMAIL_KEY = 'ev_notif_email_orders';
const NOTIF_PUSH_KEY = 'ev_notif_push_offers';

export type ProfileAppUser = {
  id: string;
  role: string;
  email?: string;
  phone?: string;
  name?: string;
};

type AddressBookEntry = {
  id?: string;
  label?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  is_default?: boolean;
};

type MeUser = {
  name?: string;
  email?: string;
  phone?: string;
  gst_no?: string | null;
  gst_verified?: boolean | string | number;
  business_name?: string | null;
  business_address?: string | null;
  address_book?: AddressBookEntry[];
};

function isGstVerifiedFlag(v: unknown): boolean {
  return v === true || v === 'true' || v === 1 || v === '1';
}

function apiErr(err: unknown, fallback: string): string {
  const ax = err as { response?: { data?: { message?: string } }; message?: string };
  const m = ax?.response?.data?.message || ax?.message;
  return typeof m === 'string' && m.trim() ? m : fallback;
}

type Props = {
  user: ProfileAppUser | null;
  onLogout: () => void;
  fcmToken: string | null;
  onOpenServiceHistory?: () => void;
  /** Tab screen navigation — used for in-app About+Contact when nested under root stack. */
  navigation?: { getParent?: () => any; navigate?: (name: string) => void };
};

export function CustomerProfileScreen({ user, onLogout, fcmToken, onOpenServiceHistory, navigation }: Props) {
  const { width } = useWindowDimensions();
  const isWide = width >= 720;
  const showServiceExtras = user?.role === 'customer' || user?.role === 'dealer';

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeUser | null>(null);
  const [emailOrders, setEmailOrders] = useState(true);
  const [pushOffers, setPushOffers] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await authApi.me();
      const u = (data as { user?: MeUser })?.user;
      setMe(u || null);
    } catch (err) {
      Alert.alert('Error', apiErr(err, 'Could not load profile.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    void (async () => {
      try {
        const [a, b] = await Promise.all([AsyncStorage.getItem(NOTIF_EMAIL_KEY), AsyncStorage.getItem(NOTIF_PUSH_KEY)]);
        if (a != null) setEmailOrders(a === '1');
        if (b != null) setPushOffers(b === '1');
      } catch {
        /* ignore */
      }
    })();
  }, []);

  async function persistNotif(key: string, val: boolean) {
    try {
      await AsyncStorage.setItem(key, val ? '1' : '0');
    } catch {
      /* ignore */
    }
  }

  const displayName = me?.name || user?.name;
  const displayEmail = me?.email || user?.email;
  const displayPhone = me?.phone || user?.phone;
  const book = Array.isArray(me?.address_book) ? me!.address_book! : [];

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.inner, { maxWidth: isWide ? 960 : undefined }]}>
          <Text style={styles.pageTitle}>Profile</Text>

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.brandPrimary} />
              <Text style={styles.muted}>Loading…</Text>
            </View>
          ) : (
            <>
              <View style={[isWide ? styles.splitRow : styles.splitCol]}>
                <View style={[styles.col, isWide && styles.colLeft]}>
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>My details</Text>
                    <View style={styles.field}>
                      <Text style={styles.dt}>Name</Text>
                      <Text style={styles.dd}>{displayName || '—'}</Text>
                    </View>
                    <View style={styles.field}>
                      <Text style={styles.dt}>Email</Text>
                      <Text style={styles.dd}>{displayEmail || '—'}</Text>
                    </View>
                    <View style={styles.field}>
                      <Text style={styles.dt}>Phone</Text>
                      <Text style={styles.dd}>{displayPhone || '—'}</Text>
                    </View>
                  </View>

                  {user?.role === 'dealer' ? (
                    <View style={styles.card}>
                      <Text style={styles.cardTitle}>Dealer account</Text>
                      <Text style={styles.bodyMuted}>
                        Dealer pricing in the shop and GST invoices — open the web dealer hub for full tools.
                      </Text>
                      <Text style={[styles.metaSmall, { marginTop: 8 }]}>
                        GST status:{' '}
                        <Text style={{ fontWeight: '700', color: isGstVerifiedFlag(me?.gst_verified) ? colors.success : colors.warning }}>
                          {isGstVerifiedFlag(me?.gst_verified)
                            ? 'Verified — wholesale pricing active'
                            : 'Pending — retail prices until verified'}
                        </Text>
                      </Text>
                      <Pressable style={styles.btnPrimary} onPress={() => void Linking.openURL(publicWebUrl('/dealer/dashboard'))}>
                        <Text style={styles.btnPrimaryText}>Dealer hub (web)</Text>
                      </Pressable>
                      {me?.gst_no ? (
                        <Text style={styles.metaSmall}>
                          GSTIN: <Text style={styles.mono}>{String(me.gst_no)}</Text>
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>

                <View style={[styles.col, isWide && styles.colRight]}>
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Saved addresses</Text>
                    {book.length === 0 ? (
                      <Text style={styles.bodyMuted}>No saved addresses yet.</Text>
                    ) : (
                      book.map((a, i) => (
                        <View key={String(a.id || i)} style={styles.addrRow}>
                          <View style={styles.addrHead}>
                            <Text style={styles.addrLabel}>{a.label || 'Address'}</Text>
                            {a.is_default ? (
                              <View style={styles.badgeDefaultWrap}>
                                <Text style={styles.badgeDefaultText}>Default</Text>
                              </View>
                            ) : null}
                          </View>
                          <Text style={styles.addrBody}>
                            {[a.address, a.city, a.state, a.pincode].filter(Boolean).join(', ')}
                          </Text>
                        </View>
                      ))
                    )}
                    <Pressable
                      style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]}
                      onPress={() => void Linking.openURL(publicWebUrl('/profile'))}
                      android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
                    >
                      <Text style={styles.btnPrimaryText}>Edit addresses on website</Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Notifications</Text>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Order updates by email</Text>
                  <Switch
                    value={emailOrders}
                    onValueChange={(v) => {
                      setEmailOrders(v);
                      void persistNotif(NOTIF_EMAIL_KEY, v);
                      Alert.alert('Saved', 'Preference stored on this device.');
                    }}
                    trackColor={{ false: colors.border, true: colors.brandSoft }}
                    thumbColor={emailOrders ? colors.brandPrimary : colors.textSecondary}
                  />
                </View>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Offers & promotions (push)</Text>
                  <Switch
                    value={pushOffers}
                    onValueChange={(v) => {
                      setPushOffers(v);
                      void persistNotif(NOTIF_PUSH_KEY, v);
                      Alert.alert('Saved', 'Preference stored on this device.');
                    }}
                    trackColor={{ false: colors.border, true: colors.brandSoft }}
                    thumbColor={pushOffers ? colors.brandPrimary : colors.textSecondary}
                  />
                </View>
                <Text style={styles.hint}>Device-only toggles. FCM: {fcmToken ? 'registered' : 'not registered yet'}.</Text>
              </View>

              {showServiceExtras && onOpenServiceHistory ? (
                <Pressable style={styles.btnSecondary} onPress={onOpenServiceHistory}>
                  <Text style={styles.btnSecondaryText}>Service history & reviews</Text>
                </Pressable>
              ) : null}

              <PublicWebsiteLinks
                audience="signed_in"
                onOpenAbout={() => {
                  const tab = navigation?.getParent?.();
                  const stack = tab?.getParent?.();
                  if (stack && typeof stack.navigate === 'function') {
                    (stack.navigate as (n: string) => void)('About');
                    return;
                  }
                  void Linking.openURL(publicWebUrl('/about'));
                }}
                onOpenContact={() => {
                  const tab = navigation?.getParent?.();
                  const stack = tab?.getParent?.();
                  if (stack && typeof stack.navigate === 'function') {
                    (stack.navigate as (n: string) => void)('Contact');
                    return;
                  }
                  void Linking.openURL(publicWebUrl('/contact'));
                }}
              />

              <Pressable style={styles.btnDanger} onPress={onLogout}>
                <Text style={styles.btnDangerText}>Sign out</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    paddingBottom: 32,
  },
  inner: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: screenGutter,
    paddingTop: 12,
    gap: 16,
  },
  pageTitle: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.3 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 24 },
  muted: { color: colors.textSecondary, fontSize: 14 },
  splitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, width: '100%' },
  splitCol: { flexDirection: 'column', gap: 16, width: '100%' },
  col: { width: '100%', minWidth: 0, gap: 16 },
  colLeft: { flex: 5, flexBasis: 0 },
  colRight: { flex: 7, flexBasis: 0 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  field: { gap: 4 },
  dt: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  dd: { fontSize: 15, color: colors.textPrimary, flexWrap: 'wrap' },
  bodyMuted: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  metaSmall: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  addrRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.softPanel,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: 8,
  },
  addrHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  addrLabel: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, flex: 1, minWidth: 0 },
  badgeDefaultWrap: {
    flexShrink: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(232, 83, 42, 0.35)',
    backgroundColor: 'rgba(232, 83, 42, 0.1)',
  },
  badgeDefaultText: { fontSize: 12, fontWeight: '800', color: colors.brandPrimary, letterSpacing: 0.2 },
  addrBody: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  hint: { fontSize: 12, color: colors.textSecondary, lineHeight: 18, marginTop: 4 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
  },
  switchLabel: { flex: 1, fontSize: 15, color: colors.textPrimary, minWidth: 0 },
  btnPrimary: {
    marginTop: 4,
    backgroundColor: colors.brandPrimary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 2,
      },
      android: { elevation: 2 },
    }),
  },
  btnPressed: { opacity: 0.92 },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnSecondary: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.softPanel,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnSecondaryText: { color: colors.textPrimary, fontWeight: '700', fontSize: 14 },
  btnDanger: {
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.35)',
    backgroundColor: 'rgba(220, 38, 38, 0.06)',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnDangerText: { color: colors.error, fontWeight: '700', fontSize: 16 },
});
