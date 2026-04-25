import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { adminApi } from '../services/api';
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

function asError(err: unknown, fallback: string) {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.join(', ');
  return fallback;
}

function DashboardScreen({ navigation }: any) {
  const [metrics, setMetrics] = useState({ products: 0, orders: 0, invoices: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const [products, orders, invoices] = await Promise.all([
          adminApi.products(),
          adminApi.orders(),
          adminApi.invoices(),
        ]);
        setMetrics({
          products: Array.isArray(products.data) ? products.data.length : 0,
          orders: Array.isArray(orders.data) ? orders.data.length : 0,
          invoices: Array.isArray(invoices.data) ? invoices.data.length : 0,
        });
      } catch {
        // best effort dashboard
      }
    };
    void load();
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.listPad}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Admin Dashboard</Text>
          <Text style={styles.cardMeta}>Products: {metrics.products}</Text>
          <Text style={styles.cardMeta}>Orders: {metrics.orders}</Text>
          <Text style={styles.cardMeta}>Invoices: {metrics.invoices}</Text>
        </View>
        <Pressable style={styles.button} onPress={() => navigation.navigate('Products')}>
          <Text style={styles.buttonText}>Manage Products</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={() => navigation.navigate('Orders')}>
          <Text style={styles.buttonText}>Manage Orders</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={() => navigation.navigate('Invoices')}>
          <Text style={styles.buttonText}>View Invoices</Text>
        </Pressable>
        <Pressable style={styles.buttonSecondary} onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.buttonSecondaryText}>Settings</Text>
        </Pressable>
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
      const { data } = await adminApi.products();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      Alert.alert('Error', asError(err, 'Failed to load products.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (id: string) => {
    try {
      await adminApi.deleteProduct(id);
      await load();
    } catch (err) {
      Alert.alert('Error', asError(err, 'Failed to delete product.'));
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
          <Pressable style={styles.button} onPress={() => navigation.navigate('ProductForm')}>
            <Text style={styles.buttonText}>Add Product</Text>
          </Pressable>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{String(item.name || '-')}</Text>
            <Text style={styles.cardMeta}>Customer price: {String(item.price_customer ?? '-')}</Text>
            <Text style={styles.cardMeta}>Dealer price: {String(item.price_dealer ?? '-')}</Text>
            <View style={styles.row}>
              <Pressable style={styles.buttonSecondary} onPress={() => navigation.navigate('ProductForm', { product: item })}>
                <Text style={styles.buttonSecondaryText}>Edit</Text>
              </Pressable>
              <Pressable style={styles.dangerButton} onPress={() => void remove(String(item.id))}>
                <Text style={styles.buttonText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function ProductFormScreen({ route, navigation }: any) {
  const product = route.params?.product;
  const [name, setName] = useState(String(product?.name || ''));
  const [description, setDescription] = useState(String(product?.description || ''));
  const [customerPrice, setCustomerPrice] = useState(String(product?.price_customer || ''));
  const [dealerPrice, setDealerPrice] = useState(String(product?.price_dealer || ''));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    try {
      setSaving(true);
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        price_customer: Number(customerPrice || 0),
        price_dealer: Number(dealerPrice || 0),
      };
      if (product?.id) {
        await adminApi.updateProduct(String(product.id), payload);
      } else {
        await adminApi.createProduct(payload);
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', asError(err, 'Failed to save product.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.listPad}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{product?.id ? 'Edit Product' : 'Add Product'}</Text>
          <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Description" value={description} onChangeText={setDescription} />
          <TextInput style={styles.input} placeholder="Customer Price" keyboardType="decimal-pad" value={customerPrice} onChangeText={setCustomerPrice} />
          <TextInput style={styles.input} placeholder="Dealer Price" keyboardType="decimal-pad" value={dealerPrice} onChangeText={setDealerPrice} />
          <Pressable style={styles.button} onPress={() => void save()} disabled={saving}>
            <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save Product'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function OrdersScreen({ navigation }: any) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await adminApi.orders();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      Alert.alert('Error', asError(err, 'Failed to load orders.'));
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
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => navigation.navigate('OrderDetail', { orderId: String(item.id) })}>
            <Text style={styles.cardTitle}>Order #{String(item.id).slice(0, 8)}</Text>
            <Text style={styles.cardMeta}>Status: <Text style={{ color: statusColor(String(item.status || '-')) }}>{String(item.status || '-')}</Text></Text>
            <Text style={styles.cardMeta}>Amount: {String(item.total_amount || '-')}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

function OrderDetailScreen({ route }: any) {
  const orderId = String(route.params?.orderId || '');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [shipping, setShipping] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await adminApi.order(orderId);
      setOrder(data || null);
    } catch (err) {
      Alert.alert('Error', asError(err, 'Failed to load order.'));
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
    } catch (err) {
      Alert.alert('Error', asError(err, 'Failed to create shipment.'));
    } finally {
      setShipping(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerBox}><Text style={styles.cardMeta}>Loading order...</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.listPad}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order #{String(order?.id || '-')}</Text>
          <Text style={styles.cardMeta}>Status: {String(order?.status || '-')}</Text>
          <Text style={styles.cardMeta}>Customer: {String(order?.customer_name || order?.customer_id || '-')}</Text>
          <Text style={styles.cardMeta}>AWB: {String(order?.awb_number || '-')}</Text>
          <Pressable style={styles.button} onPress={() => void ship()} disabled={shipping}>
            <Text style={styles.buttonText}>{shipping ? 'Shipping...' : 'Ship Order'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InvoicesScreen() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await adminApi.invoices();
        setRows(Array.isArray(data) ? data : []);
      } catch (err) {
        Alert.alert('Error', asError(err, 'Failed to load invoices.'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        contentContainerStyle={styles.listPad}
        data={rows}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={!loading ? <Text style={styles.cardMeta}>No invoices found.</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Invoice #{String(item.id).slice(0, 8)}</Text>
            <Text style={styles.cardMeta}>Order: {String(item.order_id || '-')}</Text>
            <Text style={styles.cardMeta}>Amount: {String(item.amount || '-')}</Text>
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
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await adminApi.me();
        setProfile(data || null);
      } catch {
        // non-blocking
      }
    };
    void load();
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.listPad}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Settings</Text>
          <Text style={styles.cardMeta}>Shop: {String(profile?.shop_name || '-')}</Text>
          <Text style={styles.cardMeta}>Owner: {String(profile?.owner_name || '-')}</Text>
          <Text style={styles.cardMeta}>Phone: {String(profile?.phone || '-')}</Text>
        </View>
        <Pressable style={styles.buttonSecondary} onPress={() => onOpenPasswordReset(profile?.phone)}>
          <Text style={styles.buttonSecondaryText}>Change Password (OTP)</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={onLogout}>
          <Text style={styles.buttonText}>Logout</Text>
        </Pressable>
      </View>
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
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Admin Dashboard' }} />
      <Stack.Screen name="Products" component={ProductsScreen} />
      <Stack.Screen name="ProductForm" component={ProductFormScreen} options={{ title: 'Product' }} />
      <Stack.Screen name="Orders" component={OrdersScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Order Detail' }} />
      <Stack.Screen name="Invoices" component={InvoicesScreen} />
      <Stack.Screen name="Settings" component={settings} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  listPad: { padding: 16, gap: 12 },
  input: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.surface,
  },
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
  row: { flexDirection: 'row', gap: 8 },
  button: {
    width: '100%',
    backgroundColor: colors.brandPrimary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  dangerButton: {
    flex: 1,
    backgroundColor: colors.error,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonSecondary: {
    width: '100%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonSecondaryText: { color: colors.textPrimary, fontWeight: '600' },
  buttonText: { color: colors.surface, fontWeight: '600' },
});
