import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NavigationContainer, RouteProp, useFocusEffect } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { StatusBar } from 'expo-status-bar';
import { Buffer } from 'buffer';
import { setApiTokenGetter, authApi, productApi, cartApi, checkoutApi, ordersApi, Product, CartResponse, CheckoutResponse, API_BASE_URL } from './src/services/api';
import { clearToken, getToken, setToken } from './src/services/storage';
import { setupPushNotifications } from './src/services/notifications';
import { openRazorpayCheckout } from './src/services/razorpay';

type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  ProductDetail: { product: Product };
  Checkout: undefined;
  Payment: { checkoutData: CheckoutResponse };
  OrderDetail: { group: any };
};

type MainTabsParamList = {
  Home: undefined;
  Cart: undefined;
  Orders: undefined;
  Profile: undefined;
};

const queryClient = new QueryClient();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabsParamList>();

type AppUser = {
  id: string;
  role: string;
  email?: string;
  phone?: string;
  name?: string;
};

function formatINR(amount: number) {
  return `Rs. ${Number(amount || 0).toFixed(2)}`;
}

function asApiError(err: unknown, fallback: string) {
  const axiosErr = err as AxiosError<{ message?: string | string[] }>;
  const msg = axiosErr?.response?.data?.message;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.join(', ');
  return fallback;
}

function parseJwt(token: string): Record<string, any> | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(normalized, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

function normalizePhone(phone: string) {
  const trimmed = phone.trim();
  if (trimmed.startsWith('+')) return trimmed;
  return `+91${trimmed}`;
}

function LoginOtpScreen({ onLoggedIn }: { onLoggedIn: (token: string, user: AppUser) => void }) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    try {
      setLoading(true);
      await authApi.sendOtp(normalizePhone(phone));
      setStep('otp');
      Alert.alert('OTP sent', 'Check your phone for verification code.');
    } catch (err) {
      Alert.alert('Error', asApiError(err, 'Unable to send OTP.'));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    try {
      setLoading(true);
      const { data } = await authApi.verifyOtp(normalizePhone(phone), otp);
      if (!data.is_registered) {
        Alert.alert('Not registered', 'Please create account from web first, then login here.');
        return;
      }
      const payload = parseJwt(data.access_token);
      if (!payload?.sub || !payload?.role) {
        Alert.alert('Error', 'Invalid token payload.');
        return;
      }
      onLoggedIn(data.access_token, {
        id: String(payload.sub),
        role: String(payload.role),
        email: payload.email ? String(payload.email) : undefined,
        phone: payload.phone ? String(payload.phone) : undefined,
      });
    } catch (err) {
      Alert.alert('Error', asApiError(err, 'OTP verification failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.centerBox}>
        <Text style={styles.title}>E Vision Customer App</Text>
        <Text style={styles.subtitle}>Login with OTP</Text>

        <TextInput
          style={styles.input}
          placeholder="+91 9876543210"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        {step === 'otp' && (
          <TextInput
            style={styles.input}
            placeholder="Enter 6-digit OTP"
            keyboardType="number-pad"
            value={otp}
            onChangeText={(t) => setOtp(t.replace(/\D/g, ''))}
            maxLength={6}
          />
        )}

        <Pressable
          style={styles.button}
          disabled={loading}
          onPress={step === 'phone' ? sendOtp : verifyOtp}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Please wait...' : step === 'phone' ? 'Send OTP' : 'Verify OTP'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function HomeScreen({ navigation }: any) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await productApi.list();
      setProducts(data || []);
    } catch (err) {
      Alert.alert('Error', asApiError(err, 'Failed to load products.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) return <Loader text="Loading products..." />;

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        contentContainerStyle={styles.listPad}
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => navigation.navigate('ProductDetail', { product: item })}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardMeta}>
              {formatINR(Number(item.price_customer || item.price_dealer || 0))}
            </Text>
            {!!item.description && <Text style={styles.cardDesc}>{item.description}</Text>}
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No products found.</Text>}
      />
    </SafeAreaView>
  );
}

function ProductDetailScreen({ route, navigation }: { route: RouteProp<RootStackParamList, 'ProductDetail'>; navigation: any }) {
  const { product } = route.params;
  const [loading, setLoading] = useState(false);

  const addToCart = async () => {
    try {
      setLoading(true);
      await cartApi.add(product.id, 1);
      Alert.alert('Added', 'Product added to cart.');
      navigation.navigate('Main', { screen: 'Cart' });
    } catch (err) {
      Alert.alert('Error', asApiError(err, 'Failed to add to cart.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.listPad}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{product.name}</Text>
          <Text style={styles.bigPrice}>{formatINR(Number(product.price_customer || product.price_dealer || 0))}</Text>
          <Text style={styles.cardDesc}>{product.description || 'No description available.'}</Text>
          <Pressable style={styles.button} onPress={addToCart} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Adding...' : 'Add to Cart'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function CartScreen({ navigation }: any) {
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await cartApi.get();
      setCart(data);
    } catch (err) {
      Alert.alert('Error', asApiError(err, 'Failed to fetch cart.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const removeItem = async (itemId: string) => {
    try {
      await cartApi.remove(itemId);
      await load();
    } catch (err) {
      Alert.alert('Error', asApiError(err, 'Failed to remove cart item.'));
    }
  };

  if (loading) return <Loader text="Loading cart..." />;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.listPad}>
        {(cart?.shops || []).map((shop) => (
          <View key={shop.admin_id} style={styles.card}>
            <Text style={styles.cardTitle}>{shop.shop_name}</Text>
            {(shop.items || []).map((item) => (
              <View key={item.id} style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text>{item.product_name}</Text>
                  <Text style={styles.cardMeta}>
                    {item.quantity} x {formatINR(item.price_at_time)}
                  </Text>
                </View>
                <Pressable onPress={() => void removeItem(item.id)}>
                  <Text style={styles.remove}>Remove</Text>
                </Pressable>
              </View>
            ))}
            <Text style={styles.shopTotal}>Shop total: {formatINR(shop.shop_total)}</Text>
          </View>
        ))}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Grand total</Text>
          <Text style={styles.bigPrice}>{formatINR(Number(cart?.grand_total || 0))}</Text>
          <Pressable
            style={[styles.button, !cart?.shops?.length && styles.buttonDisabled]}
            disabled={!cart?.shops?.length}
            onPress={() => navigation.navigate('Checkout')}
          >
            <Text style={styles.buttonText}>Proceed to Checkout</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function CheckoutScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);

  const startCheckout = async () => {
    try {
      setLoading(true);
      const { data } = await checkoutApi.create();
      navigation.navigate('Payment', { checkoutData: data });
    } catch (err) {
      Alert.alert('Error', asApiError(err, 'Checkout creation failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.centerBox}>
        <Text style={styles.title}>Checkout</Text>
        <Text style={styles.subtitle}>Review and continue to Razorpay payment.</Text>
        <Pressable style={styles.button} onPress={startCheckout} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Creating order...' : 'Go to Payment'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function PaymentScreen({ route, navigation, user }: { route: RouteProp<RootStackParamList, 'Payment'>; navigation: any; user: AppUser | null }) {
  const { checkoutData } = route.params;
  const [loading, setLoading] = useState(false);

  const payNow = async () => {
    try {
      setLoading(true);
      await openRazorpayCheckout({
        key: checkoutData.key_id,
        amountPaise: checkoutData.amount_paise,
        orderId: checkoutData.razorpay_order_id,
        prefillEmail: user?.email,
        prefillContact: user?.phone,
      });
      Alert.alert('Payment initiated', 'Payment captured webhook will create your orders.');
      navigation.navigate('Main', { screen: 'Orders' });
    } catch (err) {
      Alert.alert('Payment failed', asApiError(err, 'Could not complete payment.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.centerBox}>
        <Text style={styles.title}>Razorpay Payment</Text>
        <Text style={styles.subtitle}>Amount: {formatINR(checkoutData.amount)}</Text>
        <Pressable style={styles.button} onPress={payNow} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Opening...' : 'Pay Now'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function MyOrdersScreen({ navigation }: any) {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await ordersApi.listMyGroups();
      setGroups(data || []);
    } catch (err) {
      Alert.alert('Error', asApiError(err, 'Failed to load orders.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) return <Loader text="Loading orders..." />;

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        contentContainerStyle={styles.listPad}
        data={groups}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => navigation.navigate('OrderDetail', { group: item })}>
            <Text style={styles.cardTitle}>Order Group #{item.id}</Text>
            <Text style={styles.cardMeta}>Status: {String(item.status || 'unknown')}</Text>
            <Text style={styles.cardMeta}>Amount: {formatINR(Number(item.total_amount || 0))}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No orders yet.</Text>}
      />
    </SafeAreaView>
  );
}

function OrderDetailScreen({ route }: { route: RouteProp<RootStackParamList, 'OrderDetail'> }) {
  const { group } = route.params;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.listPad}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Group: {String(group.id)}</Text>
          <Text style={styles.cardMeta}>Status: {String(group.status || '-')}</Text>
        </View>

        {(group.sub_orders || []).map((subOrder: any) => (
          <View key={String(subOrder.id)} style={styles.card}>
            <Text style={styles.cardTitle}>Shop: {String(subOrder.shop_name || 'Shop')}</Text>
            <Text style={styles.cardMeta}>Order: {String(subOrder.id)}</Text>
            <Text style={styles.cardMeta}>Status: {String(subOrder.status || '-')}</Text>
            {!!subOrder.courier_name && <Text style={styles.cardMeta}>Courier: {String(subOrder.courier_name)}</Text>}
            {!!subOrder.awb_number && <Text style={styles.cardMeta}>AWB: {String(subOrder.awb_number)}</Text>}
            {!!subOrder.tracking_url && (
              <Pressable onPress={() => void Linking.openURL(String(subOrder.tracking_url))}>
                <Text style={styles.link}>Open Tracking</Text>
              </Pressable>
            )}
            {(subOrder.items || []).map((item: any) => (
              <Text key={String(item.id || `${item.product_id}-${item.qty}`)} style={styles.cardMeta}>
                - {String(item.product_name || 'Item')} x {Number(item.qty || item.quantity || 1)}
              </Text>
            ))}
            {!!subOrder.customer_invoice_url && (
              <Pressable onPress={() => void Linking.openURL(String(subOrder.customer_invoice_url))}>
                <Text style={styles.link}>Download Invoice</Text>
              </Pressable>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileScreen({ user, onLogout, fcmToken }: { user: AppUser | null; onLogout: () => void; fcmToken: string | null }) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.listPad}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Profile</Text>
          <Text style={styles.cardMeta}>User ID: {user?.id || '-'}</Text>
          <Text style={styles.cardMeta}>Role: {user?.role || '-'}</Text>
          <Text style={styles.cardMeta}>Email: {user?.email || '-'}</Text>
          <Text style={styles.cardMeta}>Phone: {user?.phone || '-'}</Text>
          <Text style={styles.cardMeta}>API: {API_BASE_URL}</Text>
          <Text style={styles.cardMeta} numberOfLines={2}>FCM Token: {fcmToken || 'Not registered yet'}</Text>
        </View>
        <Pressable style={styles.button} onPress={onLogout}>
          <Text style={styles.buttonText}>Logout</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Loader({ text }: { text: string }) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.centerBox}>
        <ActivityIndicator />
        <Text style={styles.subtitle}>{text}</Text>
      </View>
    </SafeAreaView>
  );
}

function MainTabs({ user, onLogout, fcmToken }: { user: AppUser | null; onLogout: () => void; fcmToken: string | null }) {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Cart" component={CartScreen} />
      <Tab.Screen name="Orders" component={MyOrdersScreen} options={{ title: 'My Orders' }} />
      <Tab.Screen name="Profile">
        {() => <ProfileScreen user={user} onLogout={onLogout} fcmToken={fcmToken} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function AppShell() {
  const [hydrating, setHydrating] = useState(true);
  const [token, setAuthToken] = useState<string | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  useEffect(() => {
    setApiTokenGetter(() => token);
  }, [token]);

  useEffect(() => {
    const hydrate = async () => {
      const existing = await getToken();
      if (existing) {
        const payload = parseJwt(existing);
        if (payload?.sub && payload?.role) {
          setAuthToken(existing);
          setUser({
            id: String(payload.sub),
            role: String(payload.role),
            email: payload.email ? String(payload.email) : undefined,
            phone: payload.phone ? String(payload.phone) : undefined,
          });
        }
      }
      setHydrating(false);
    };
    void hydrate();
  }, []);

  useEffect(() => {
    const initNotifications = async () => {
      const tokenValue = await setupPushNotifications();
      setFcmToken(tokenValue);
    };
    void initNotifications();
  }, []);

  const handleLoggedIn = async (nextToken: string, nextUser: AppUser) => {
    await setToken(nextToken);
    setAuthToken(nextToken);
    setUser(nextUser);
    try {
      const { data } = await authApi.me();
      if (data?.user) {
        setUser((prev) => ({
          ...(prev || nextUser),
          id: String(data.user.id || prev?.id || nextUser.id),
          role: String(data.user.role || prev?.role || nextUser.role),
          email: data.user.email ? String(data.user.email) : prev?.email,
          phone: data.user.phone ? String(data.user.phone) : prev?.phone,
          name: data.user.name ? String(data.user.name) : prev?.name,
        }));
      }
    } catch {
      // Keep JWT payload user if /auth/me fails.
    }
  };

  const logout = async () => {
    await clearToken();
    setAuthToken(null);
    setUser(null);
  };

  const paymentScreen = useMemo(
    () => (props: any) => <PaymentScreen {...props} user={user} />,
    [user],
  );
  const mainTabs = useMemo(
    () => (props: any) => <MainTabs {...props} user={user} onLogout={logout} fcmToken={fcmToken} />,
    [user, fcmToken],
  );

  if (hydrating) return <Loader text="Preparing app..." />;

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <RootStack.Navigator>
        {!token ? (
          <RootStack.Screen name="Auth" options={{ headerShown: false }}>
            {() => <LoginOtpScreen onLoggedIn={handleLoggedIn} />}
          </RootStack.Screen>
        ) : (
          <>
            <RootStack.Screen name="Main" component={mainTabs} options={{ headerShown: false }} />
            <RootStack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Product Detail' }} />
            <RootStack.Screen name="Checkout" component={CheckoutScreen} />
            <RootStack.Screen name="Payment" component={paymentScreen} />
            <RootStack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Order Detail' }} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#475569', textAlign: 'center' },
  listPad: { padding: 16, gap: 12 },
  input: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  button: {
    width: '100%',
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  cardMeta: { fontSize: 13, color: '#334155' },
  cardDesc: { fontSize: 13, color: '#475569' },
  bigPrice: { fontSize: 20, fontWeight: '700', color: '#1d4ed8' },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 40 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  remove: { color: '#dc2626', fontWeight: '600' },
  shopTotal: { marginTop: 8, fontWeight: '700', color: '#0f172a' },
  link: { marginTop: 6, color: '#2563eb', fontWeight: '600' },
});
