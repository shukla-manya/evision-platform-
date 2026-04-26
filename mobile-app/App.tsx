import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  CommonActions,
  DefaultTheme,
  NavigationContainer,
  type Theme,
  RouteProp,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { Buffer } from 'buffer';
import {
  setApiTokenGetter,
  authApi,
  electricianApi,
  productApi,
  cartApi,
  checkoutApi,
  ordersApi,
  electricianRegisterApi,
  adminApi,
  PasswordResetRole,
  Product,
  CartResponse,
  CheckoutResponse,
  API_BASE_URL,
} from './src/services/api';
import { clearSession, getToken, setElectricianProfile, setToken } from './src/services/storage';
import { PasswordInputWithToggle } from './src/components/PasswordInputWithToggle';
import { setupPushNotifications, subscribeToPushTokenRefresh } from './src/services/notifications';
import { openRazorpayCheckout } from './src/services/razorpay';
import { TrackingScreen } from './src/screens/TrackingScreen';
import { ElectricianFlow } from './src/electrician/ElectricianFlow';
import { AdminFlow } from './src/admin/AdminFlow';
import { colors } from './src/theme/colors';
import { statusColor } from './src/theme/status';
import type { ServiceFlowStackParams } from './src/screens/ServiceRequestScreen';
import { ServiceRequestScreen } from './src/screens/ServiceRequestScreen';
import { ElectricianListScreen } from './src/screens/ElectricianListScreen';
import { ElectricianPublicProfileScreen } from './src/screens/ElectricianPublicProfileScreen';
import { ServiceBookingConfirmScreen } from './src/screens/ServiceBookingConfirmScreen';
import { LeaveReviewScreen } from './src/screens/LeaveReviewScreen';
import { ServiceHistoryScreen } from './src/screens/ServiceHistoryScreen';
import { EvisionLogo } from './src/components/EvisionLogo';
import { screenGutter } from './src/theme/layout';

type RegisterInitialRole = 'customer' | 'dealer' | 'electrician' | 'shop_owner';

type RootStackParamList = {
  Auth: undefined;
  OtpSignIn: undefined;
  AdminSignIn: undefined;
  Register: { email?: string; phone?: string; initialRole?: RegisterInitialRole };
  ShopPending: { shopName: string; email: string };
  PasswordReset: { role?: PasswordResetRole; phone?: string };
  Main: undefined;
  ProductDetail: { product: Product };
  Checkout: undefined;
  Payment: { checkoutData: CheckoutResponse };
  OrderDetail: { group: any; userRole?: string };
} & ServiceFlowStackParams;

type MainTabsParamList = {
  Home: undefined;
  Cart: undefined;
  Orders: undefined;
  ServiceTracking: { bookingId?: string } | undefined;
  DealerDashboard: undefined;
  Profile: undefined;
};

const queryClient = new QueryClient();

const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.brandPrimary,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.error,
  },
};

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.navbar },
  headerTintColor: '#FFFFFF',
  headerTitleStyle: { color: '#FFFFFF', fontWeight: '600' as const },
  contentStyle: { backgroundColor: colors.background },
};

const tabScreenOptions = {
  ...stackScreenOptions,
  tabBarActiveTintColor: colors.brandPrimary,
  tabBarInactiveTintColor: colors.textSecondary,
  tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
};
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

function getProductPriceForRole(product: Product, role?: string) {
  const isDealer = role === 'dealer';
  const preferred = isDealer ? product.price_dealer : product.price_customer;
  const fallback = isDealer ? product.price_customer : product.price_dealer;
  return Number(preferred ?? fallback ?? 0);
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

/** E.164 for public shop registration (matches web admin/register). */
function toAdminRegisterPhone(phone: string) {
  const raw = phone.trim();
  if (raw.startsWith('+')) return raw.replace(/\s/g, '');
  const digits = raw.replace(/\D/g, '');
  const last10 = digits.replace(/^91/, '').slice(-10);
  if (last10.length !== 10) return raw;
  return `+91${last10}`;
}

async function pickImageAsset(label: string) {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission denied', `Please allow media access to upload ${label}.`);
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.8,
  });
  if (result.canceled || !result.assets.length) return null;
  return result.assets[0];
}

function AuthWelcomeScreen({ navigation }: { navigation: any }) {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.splashContent, { flexGrow: 1 }]}
      >
        <View style={styles.splashLogoWrap}>
          <EvisionLogo variant="full" height={44} width={200} wordmarkOnLight />
        </View>
        <View style={styles.splashGap} />
        <Pressable style={styles.splashPrimaryBtn} onPress={() => navigation.navigate('OtpSignIn')}>
          <Text style={styles.splashPrimaryBtnText}>Sign in with mobile OTP</Text>
          <Text style={styles.splashCtaSub}>For customers, dealers and technicians</Text>
        </Pressable>
        <View style={styles.splashOrRow}>
          <View style={styles.splashOrLine} />
          <Text style={styles.splashOrLabel}>or</Text>
          <View style={styles.splashOrLine} />
        </View>
        <Pressable style={styles.splashSecondaryBtn} onPress={() => navigation.navigate('AdminSignIn')}>
          <Text style={styles.splashSecondaryBtnText}>Admin? Sign in here</Text>
          <Text style={styles.splashCtaSubMuted}>For shop owners</Text>
        </Pressable>
        <Pressable style={styles.splashRegisterLink} onPress={() => navigation.navigate('Register', {})}>
          <Text style={styles.splashRegisterLinkText}>New user? Create an account</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function OtpSignInScreen({ onLoggedIn, navigation }: { onLoggedIn: (token: string, user: AppUser) => void; navigation: any }) {
  const [phoneDigits, setPhoneDigits] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);

  const phoneE164 = () => normalizePhone(phoneDigits);

  const sendOtp = async () => {
    try {
      setLoading(true);
      const p = phoneE164();
      if (p.replace(/\D/g, '').length < 11) {
        Alert.alert('Invalid number', 'Enter a valid 10-digit mobile number.');
        return;
      }
      await authApi.sendOtp(p);
      setStep('otp');
      Alert.alert('OTP sent', 'Check your SMS for the 6-digit code.');
    } catch (err) {
      Alert.alert('Login failed', asApiError(err, 'Unable to send OTP.'));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtpLogin = async () => {
    try {
      setLoading(true);
      const p = phoneE164();
      const { data } = await authApi.verifyOtp(p, otp.replace(/\D/g, ''));
      if (!data.is_registered) {
        navigation.navigate('Register', { phone: p });
        setStep('phone');
        setOtp('');
        return;
      }
      const payload = parseJwt(data.access_token);
      const role = String(payload?.role || '');
      const userId = String(payload?.sub || '');
      if (!userId || !role) {
        Alert.alert('Error', 'Invalid session.');
        return;
      }
      onLoggedIn(data.access_token, {
        id: userId,
        role,
        email: payload?.email ? String(payload.email) : undefined,
        phone: payload?.phone ? String(payload.phone) : undefined,
      });
    } catch (err) {
      Alert.alert('Error', asApiError(err, 'OTP verification failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.centerBoxScrollable}
        >
          <Text style={styles.subtitle}>Sign in with your mobile number. We will send a 6-digit OTP.</Text>
          {step === 'phone' ? (
            <TextInput
              style={styles.input}
              placeholder="Mobile (10 digits)"
              keyboardType="phone-pad"
              value={phoneDigits}
              onChangeText={(t) => setPhoneDigits(t.replace(/\D/g, '').slice(0, 10))}
              maxLength={10}
            />
          ) : (
            <>
              <Text style={styles.cardMeta}>Code sent to +91 {phoneDigits}</Text>
              <TextInput
                style={styles.input}
                placeholder="6-digit OTP"
                keyboardType="number-pad"
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/\D/g, ''))}
                maxLength={6}
              />
            </>
          )}

          <Pressable style={styles.button} disabled={loading} onPress={step === 'phone' ? sendOtp : verifyOtpLogin}>
            <Text style={styles.buttonText}>
              {loading ? 'Please wait...' : step === 'phone' ? 'Send OTP' : 'Verify & sign in'}
            </Text>
          </Pressable>
          {step === 'otp' ? (
            <Pressable style={styles.buttonSecondary} onPress={() => { setStep('phone'); setOtp(''); }}>
              <Text style={styles.buttonSecondaryText}>Change number</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.buttonSecondary} onPress={() => navigation.navigate('Register', {})}>
            <Text style={styles.buttonSecondaryText}>New user? Create an account</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function AdminSignInScreen({
  navigation,
  onLoggedIn,
}: {
  navigation: any;
  onLoggedIn: (token: string, user: AppUser) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const em = email.trim().toLowerCase();
    if (!em || !password) {
      Alert.alert('Missing fields', 'Enter email and password.');
      return;
    }
    try {
      setLoading(true);
      const { data } = await authApi.adminLogin(em, password);
      const payload = parseJwt(data.access_token);
      const userId = String(payload?.sub || '');
      const role = String(payload?.role || '');
      if (!userId || !role) {
        Alert.alert('Error', 'Invalid session.');
        return;
      }
      onLoggedIn(data.access_token, {
        id: userId,
        role,
        email: payload?.email ? String(payload.email) : em,
        phone: payload?.phone ? String(payload.phone) : undefined,
      });
    } catch (err) {
      Alert.alert('Sign in failed', asApiError(err, 'Invalid credentials.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.listPad, styles.adminSignInScroll]}>
        <View style={styles.centerBoxNoFlex}>
          <Text style={styles.adminEmoji}>🏪</Text>
          <Text style={styles.title}>Admin</Text>
          <Text style={styles.subtitle}>Sign in to manage your shop on the go</Text>
        </View>
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="username"
          />
          <PasswordInputWithToggle
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            autoComplete="password"
            textContentType="password"
          />
          <Pressable style={styles.button} onPress={submit} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Please wait...' : 'Sign in'}</Text>
          </Pressable>
          <Pressable
            style={styles.buttonLinkWrap}
            onPress={() => navigation.navigate('PasswordReset', { role: 'admin' })}
          >
            <Text style={styles.link}>Forgot password? Reset</Text>
          </Pressable>
        </View>
        <View style={styles.captionBlock}>
          <Text style={styles.captionNote}>New shop? Register in the app (Create account → Shop owner), then sign in here after approval.</Text>
          <Pressable onPress={() => navigation.navigate('Register', { initialRole: 'shop_owner' })}>
            <Text style={styles.link}>Register as shop owner</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ShopPendingScreen({
  route,
  navigation,
}: {
  route: RouteProp<RootStackParamList, 'ShopPending'>;
  navigation: any;
}) {
  const { shopName, email } = route.params;
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.listPad}>
        <View style={[styles.card, { paddingVertical: 18 }]}>
          <Text style={styles.cardTitle}>We received your application</Text>
          <Text style={[styles.subtitle, { marginTop: 10, textAlign: 'left' }]}>
            <Text style={styles.subtitleEm}>Pending review</Text>
            {'\n\n'}
            Shop <Text style={styles.subtitleEm}>{shopName}</Text> is in the queue. We will email{' '}
            <Text style={styles.subtitleEm}>{email}</Text> when a platform admin approves your store.
            {'\n\n'}
            When you get that email, use the link to set your password. Then open this app and choose Admin sign in.
          </Text>
        </View>
        <Pressable
          style={styles.button}
          onPress={() => navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Auth' }] }))}
        >
          <Text style={styles.buttonText}>Back to sign in</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const REGISTER_ROLE_TABS: { value: RegisterInitialRole; label: string }[] = [
  { value: 'customer', label: 'Customer' },
  { value: 'dealer', label: 'Dealer' },
  { value: 'electrician', label: 'Technician' },
  { value: 'shop_owner', label: 'Shop owner' },
];

function RegisterScreen({ route, navigation, onLoggedIn }: { route: RouteProp<RootStackParamList, 'Register'>; navigation: any; onLoggedIn: (token: string, user: AppUser) => void }) {
  const [name, setName] = useState('');
  const [shopName, setShopName] = useState('');
  const [email, setEmail] = useState(route.params?.email || '');
  const [phone, setPhone] = useState(() => {
    const raw = route.params?.phone || '';
    const d = raw.replace(/\D/g, '');
    return d.length >= 10 ? d.slice(-10) : '';
  });
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [logoAsset, setLogoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [otp, setOtp] = useState('');
  const [address, setAddress] = useState('');
  const [gstNo, setGstNo] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [skills, setSkills] = useState('');
  const [aadharAsset, setAadharAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [photoAsset, setPhotoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [role, setRole] = useState<RegisterInitialRole>(() => {
    const r = route.params?.initialRole;
    if (r === 'shop_owner' || r === 'customer' || r === 'dealer' || r === 'electrician') return r;
    return 'customer';
  });
  const [sendingOtp, setSendingOtp] = useState(false);
  const [loading, setLoading] = useState(false);

  const goToSignInHome = () => {
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Auth' }] }));
  };

  const setLogoFromPickerResult = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets?.[0]) return;
    setLogoAsset(result.assets[0]);
  };

  const pickShopLogo = () => {
    Alert.alert('Shop logo', 'Use your camera or photo library', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Take photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission needed', 'Allow camera access to take a photo of your shop or logo.');
            return;
          }
          const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: false });
          setLogoFromPickerResult(r);
        },
      },
      {
        text: 'Photo library',
        onPress: async () => {
          const a = await pickImageAsset('shop logo');
          if (a) setLogoAsset(a);
        },
      },
    ]);
  };

  const sendOtp = async () => {
    if (role === 'shop_owner') return;
    try {
      setSendingOtp(true);
      await authApi.sendOtp(normalizePhone(phone));
      Alert.alert('OTP sent', 'Use this OTP to complete registration.');
    } catch (err) {
      Alert.alert('Error', asApiError(err, 'Failed to send OTP.'));
    } finally {
      setSendingOtp(false);
    }
  };

  const submit = async () => {
    if (role === 'shop_owner') {
      if (!shopName.trim() || !name.trim()) {
        Alert.alert('Required', 'Enter shop name and owner name.');
        return;
      }
      if (!email.trim() || !phone.trim() || !gstNo.trim() || !address.trim() || !city.trim() || !/^\d{6}$/.test(pincode.trim())) {
        Alert.alert('Required', 'Fill email, phone, GST, full address, city, and a 6-digit pincode.');
        return;
      }
      const e164 = toAdminRegisterPhone(phone);
      if (!/^\+[1-9]\d{9,14}$/.test(e164)) {
        Alert.alert('Invalid phone', 'Enter a valid 10-digit mobile number.');
        return;
      }
      try {
        setLoading(true);
        const fd = new FormData();
        fd.append('shop_name', shopName.trim());
        fd.append('owner_name', name.trim());
        fd.append('email', email.trim().toLowerCase());
        fd.append('phone', e164);
        fd.append('gst_no', gstNo.trim());
        fd.append('address', address.trim());
        fd.append('city', city.trim());
        fd.append('pincode', pincode.trim());
        if (logoAsset) {
          fd.append('logo', {
            uri: logoAsset.uri,
            name: logoAsset.fileName || `shop-logo-${Date.now()}.jpg`,
            type: logoAsset.mimeType || 'image/jpeg',
          } as never);
        }
        await adminApi.registerShop(fd);
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [
              {
                name: 'ShopPending',
                params: { shopName: shopName.trim(), email: email.trim().toLowerCase() },
              },
            ],
          }),
        );
      } catch (err) {
        Alert.alert('Error', asApiError(err, 'Could not submit shop registration.'));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (role === 'dealer' && !gstNo.trim()) {
      Alert.alert('GST required', 'GST number is required for dealer accounts.');
      return;
    }
    if (role === 'dealer' && !address.trim()) {
      Alert.alert('Address required', 'Business / delivery address is required for dealer accounts.');
      return;
    }
    if (role === 'electrician') {
      if (!lat.trim() || !lng.trim()) {
        Alert.alert('Location required', 'Latitude and longitude are required for technician registration.');
        return;
      }
      if (!aadharAsset || !photoAsset) {
        Alert.alert('Documents required', 'Aadhar and profile photo are required for technician registration.');
        return;
      }
    }
    try {
      setLoading(true);
      if (role === 'electrician') {
        const aadhar = aadharAsset;
        const photo = photoAsset;
        if (!aadhar || !photo) {
          Alert.alert('Documents required', 'Aadhar and profile photo are required for technician registration.');
          return;
        }
        const fd = new FormData();
        fd.append('name', name.trim());
        fd.append('phone', normalizePhone(phone));
        fd.append('email', email.trim().toLowerCase());
        fd.append('lat', lat.trim());
        fd.append('lng', lng.trim());
        if (address.trim()) fd.append('address', address.trim());
        if (skills.trim()) fd.append('skills', skills.trim());
        fd.append('aadhar', {
          uri: aadhar.uri,
          name: aadhar.fileName || `aadhar-${Date.now()}.jpg`,
          type: aadhar.mimeType || 'image/jpeg',
        } as never);
        fd.append('photo', {
          uri: photo.uri,
          name: photo.fileName || `photo-${Date.now()}.jpg`,
          type: photo.mimeType || 'image/jpeg',
        } as never);
        await electricianRegisterApi.register(fd);
        Alert.alert(
          'Registration submitted',
          'Technician registration is pending approval. You can sign in with OTP after approval.',
          [{ text: 'OK', onPress: goToSignInHome }],
        );
        return;
      }
      const { data } = await authApi.register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: normalizePhone(phone),
        otp,
        role: role as 'customer' | 'dealer',
        gst_no: role === 'dealer' ? gstNo.trim() : undefined,
        address: address.trim() || undefined,
        business_name: role === 'dealer' ? name.trim() : undefined,
        business_address: role === 'dealer' ? address.trim() : undefined,
      });
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
      Alert.alert('Error', asApiError(err, 'Registration failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.listPad, { paddingBottom: 32 }]}
        >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create account</Text>
          <Text style={styles.subtitle}>
            Customer · Dealer · Technician · Shop owner — same app, your dashboard matches your role after sign-in.
          </Text>
          <View style={styles.roleRow}>
            {REGISTER_ROLE_TABS.map(({ value, label }) => (
              <Pressable
                key={value}
                onPress={() => setRole(value)}
                style={[styles.roleChip, role === value && styles.roleChipActive]}
              >
                <Text style={[styles.roleChipText, role === value && styles.roleChipTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          {role === 'shop_owner' ? (
            <>
              <TextInput style={styles.input} placeholder="Shop name" value={shopName} onChangeText={setShopName} />
              <TextInput style={styles.input} placeholder="Owner full name" value={name} onChangeText={setName} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Mobile (10 digits)"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
                maxLength={10}
              />
              <TextInput
                style={styles.input}
                placeholder="GST number"
                value={gstNo}
                onChangeText={setGstNo}
                autoCapitalize="characters"
              />
              <TextInput
                style={styles.input}
                placeholder="Shop address (street / area)"
                value={address}
                onChangeText={setAddress}
              />
              <TextInput style={styles.input} placeholder="City" value={city} onChangeText={setCity} />
              <TextInput
                style={styles.input}
                placeholder="Pincode (6 digits)"
                keyboardType="number-pad"
                maxLength={6}
                value={pincode}
                onChangeText={(t) => setPincode(t.replace(/\D/g, '').slice(0, 6))}
              />
              <Pressable style={styles.buttonSecondary} onPress={pickShopLogo}>
                <Text style={styles.buttonSecondaryText}>
                  {logoAsset ? `Change logo (${logoAsset.fileName || 'selected'})` : 'Add shop logo (camera or gallery)'}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <TextInput style={styles.input} placeholder="Full name" value={name} onChangeText={setName} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Mobile (10 digits)"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
                maxLength={10}
              />
              {role === 'dealer' && (
                <TextInput
                  style={styles.input}
                  placeholder="GST number"
                  value={gstNo}
                  onChangeText={setGstNo}
                  autoCapitalize="characters"
                />
              )}
              {role === 'electrician' && (
                <>
                  <TextInput style={styles.input} placeholder="Latitude" keyboardType="decimal-pad" value={lat} onChangeText={setLat} />
                  <TextInput style={styles.input} placeholder="Longitude" keyboardType="decimal-pad" value={lng} onChangeText={setLng} />
                  <TextInput style={styles.input} placeholder="Skills (comma-separated)" value={skills} onChangeText={setSkills} />
                  <Pressable style={styles.buttonSecondary} onPress={async () => setAadharAsset(await pickImageAsset('Aadhar document'))}>
                    <Text style={styles.buttonSecondaryText}>
                      {aadharAsset ? `Aadhar: ${aadharAsset.fileName || 'selected'}` : 'Upload Aadhar document'}
                    </Text>
                  </Pressable>
                  <Pressable style={styles.buttonSecondary} onPress={async () => setPhotoAsset(await pickImageAsset('profile photo'))}>
                    <Text style={styles.buttonSecondaryText}>
                      {photoAsset ? `Photo: ${photoAsset.fileName || 'selected'}` : 'Upload profile photo'}
                    </Text>
                  </Pressable>
                </>
              )}
              <TextInput
                style={styles.input}
                placeholder={role === 'dealer' ? 'Business / delivery address (required)' : 'Address (optional)'}
                value={address}
                onChangeText={setAddress}
              />
            </>
          )}
          {role !== 'electrician' && role !== 'shop_owner' && (
            <>
              <TextInput
                style={styles.input}
                placeholder="6-digit OTP"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/\D/g, ''))}
              />
              <Pressable style={styles.buttonSecondary} onPress={sendOtp} disabled={sendingOtp}>
                <Text style={styles.buttonSecondaryText}>{sendingOtp ? 'Sending OTP...' : 'Send OTP'}</Text>
              </Pressable>
            </>
          )}
          <Pressable style={styles.button} onPress={submit} disabled={loading}>
            <Text style={styles.buttonText}>
              {loading
                ? 'Please wait...'
                : role === 'electrician'
                ? 'Submit technician registration'
                : role === 'shop_owner'
                ? 'Submit for approval'
                : 'Register'}
            </Text>
          </Pressable>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PasswordResetScreen({
  route,
  navigation,
}: {
  route: RouteProp<RootStackParamList, 'PasswordReset'>;
  navigation: any;
}) {
  const [role, setRole] = useState<PasswordResetRole>(route.params?.role || 'admin');
  const [phone, setPhone] = useState(route.params?.phone || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'start' | 'complete'>('start');
  const [loading, setLoading] = useState(false);

  const start = async () => {
    try {
      setLoading(true);
      await authApi.passwordResetStart(role, normalizePhone(phone));
      setStep('complete');
      Alert.alert('OTP sent', 'A password reset OTP was sent to your mobile number.');
    } catch (err) {
      Alert.alert('Error', asApiError(err, 'Could not start password reset.'));
    } finally {
      setLoading(false);
    }
  };

  const complete = async () => {
    try {
      setLoading(true);
      await authApi.passwordResetComplete(role, normalizePhone(phone), otp, newPassword);
      Alert.alert('Success', 'Password updated successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', asApiError(err, 'Could not update password.'));
    } finally {
      setLoading(false);
    }
  };

  const roleOptions: PasswordResetRole[] = ['electrician', 'admin'];

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.listPad}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reset Password</Text>
          <Text style={styles.subtitle}>Shop admin or technician only. Shoppers use mobile OTP — no password.</Text>
          <View style={styles.roleRow}>
            {roleOptions.map((option) => (
              <Pressable
                key={option}
                onPress={() => setRole(option)}
                style={[styles.roleChip, role === option && styles.roleChipActive]}
              >
                <Text style={[styles.roleChipText, role === option && styles.roleChipTextActive]}>
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="+91 9876543210"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          {step === 'complete' && (
            <>
              <TextInput
                style={styles.input}
                placeholder="6-digit OTP"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/\D/g, ''))}
              />
              <PasswordInputWithToggle
                style={styles.input}
                placeholder="New password"
                value={newPassword}
                onChangeText={setNewPassword}
                autoComplete="password-new"
                textContentType="newPassword"
              />
            </>
          )}
          <Pressable style={styles.button} onPress={step === 'start' ? start : complete} disabled={loading}>
            <Text style={styles.buttonText}>
              {loading
                ? 'Please wait...'
                : step === 'start'
                ? 'Send OTP'
                : 'Update Password'}
            </Text>
          </Pressable>
          {step === 'complete' && (
            <Pressable style={styles.buttonSecondary} onPress={() => setStep('start')} disabled={loading}>
              <Text style={styles.buttonSecondaryText}>Resend OTP</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function HomeScreen({ navigation, userRole }: { navigation: any; userRole?: string }) {
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
              {formatINR(getProductPriceForRole(item, userRole))}
            </Text>
            {!!item.description && <Text style={styles.cardDesc}>{item.description}</Text>}
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No products found.</Text>}
      />
    </SafeAreaView>
  );
}

function ProductDetailScreen({
  route,
  navigation,
  userRole,
}: {
  route: RouteProp<RootStackParamList, 'ProductDetail'>;
  navigation: any;
  userRole?: string;
}) {
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
          <Text style={styles.bigPrice}>{formatINR(getProductPriceForRole(product, userRole))}</Text>
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
      const paymentResult = await openRazorpayCheckout({
        key: checkoutData.key_id,
        amountPaise: checkoutData.amount_paise,
        orderId: checkoutData.razorpay_order_id,
        prefillEmail: user?.email,
        prefillContact: user?.phone,
      });
      await checkoutApi.confirm({
        status: 'success',
        razorpay_order_id: String(paymentResult.razorpay_order_id || checkoutData.razorpay_order_id),
        razorpay_payment_id: String(paymentResult.razorpay_payment_id || ''),
        razorpay_signature: String(paymentResult.razorpay_signature || ''),
      });
      Alert.alert('Payment successful', 'Your order is being finalized.');
      navigation.navigate('Main', { screen: 'Orders' });
    } catch (err) {
      const errorDescription = asApiError(err, 'Could not complete payment.');
      try {
        await checkoutApi.confirm({
          status: 'failure',
          razorpay_order_id: checkoutData.razorpay_order_id,
          failure_reason: errorDescription,
        });
      } catch {
        // Webhook flow can still mark payment outcome even if confirm fails.
      }
      Alert.alert('Payment failed', errorDescription);
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

function MyOrdersScreen({ navigation, userRole }: { navigation: any; userRole?: string }) {
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
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('OrderDetail', { group: item, userRole })}
          >
            <Text style={styles.cardTitle}>Order Group #{item.id}</Text>
            <Text style={styles.cardMeta}>
              Status:{' '}
              <Text style={{ color: statusColor(String(item.status || 'unknown')), fontWeight: '700' }}>
                {String(item.status || 'unknown')}
              </Text>
            </Text>
            <Text style={styles.cardMeta}>Amount: {formatINR(Number(item.total_amount || 0))}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No orders yet.</Text>}
      />
    </SafeAreaView>
  );
}

function DealerDashboardScreen() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await ordersApi.listMyGroups();
      setGroups(data || []);
    } catch (err) {
      Alert.alert('Error', asApiError(err, 'Failed to load dealer dashboard.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const analytics = useMemo(() => {
    const confirmed = groups.filter((g) => String(g.status || '') !== 'payment_failed');
    const totalSpend = confirmed.reduce((sum, g) => sum + Number(g.total_amount || 0), 0);
    const totalOrders = confirmed.length;
    const averageOrderValue = totalOrders ? totalSpend / totalOrders : 0;
    const invoiceUrls = Array.from(
      new Set(
        confirmed.flatMap((g) =>
          (g.sub_orders || []).flatMap((sub: any) =>
            [sub.dealer_invoice_url, sub.gst_invoice_url, sub.customer_invoice_url]
              .filter(Boolean)
              .map((url) => String(url)),
          ),
        ),
      ),
    );
    return { totalSpend, totalOrders, averageOrderValue, invoiceUrls };
  }, [groups]);

  const bulkOpenInvoices = async () => {
    if (!analytics.invoiceUrls.length) {
      Alert.alert('No invoices', 'No invoice URLs available yet.');
      return;
    }
    try {
      setDownloading(true);
      for (const [index, url] of analytics.invoiceUrls.entries()) {
        await Linking.openURL(url);
        if (index < analytics.invoiceUrls.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      }
      Alert.alert('Done', `Opened ${analytics.invoiceUrls.length} invoice links.`);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <Loader text="Loading dealer analytics..." />;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.listPad}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dealer Dashboard</Text>
          <Text style={styles.cardMeta}>Total spend: {formatINR(analytics.totalSpend)}</Text>
          <Text style={styles.cardMeta}>Orders placed: {analytics.totalOrders}</Text>
          <Text style={styles.cardMeta}>Avg order value: {formatINR(analytics.averageOrderValue)}</Text>
          <Text style={styles.cardMeta}>Invoice files: {analytics.invoiceUrls.length}</Text>
          <Pressable style={styles.button} onPress={bulkOpenInvoices} disabled={downloading}>
            <Text style={styles.buttonText}>
              {downloading ? 'Opening invoices...' : 'Bulk Download Invoices'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function OrderDetailScreen({ route }: { route: RouteProp<RootStackParamList, 'OrderDetail'> }) {
  const { group, userRole } = route.params;
  const navigation = useNavigation<any>();
  const subs = (group.sub_orders || []) as any[];
  const allDelivered =
    subs.length > 0 && subs.every((s) => String(s.status || '').toLowerCase() === 'delivered');
  const canRequestService =
    (userRole === 'customer' || userRole === 'dealer') && allDelivered;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.listPad}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Group: {String(group.id)}</Text>
          <Text style={styles.cardMeta}>
            Status:{' '}
            <Text style={{ color: statusColor(String(group.status || '-')), fontWeight: '700' }}>
              {String(group.status || '-')}
            </Text>
          </Text>
          {canRequestService ? (
            <Pressable
              style={[styles.button, { marginTop: 12 }]}
              onPress={() => navigation.navigate('ServiceRequest', { orderGroupId: String(group.id) })}
            >
              <Text style={styles.buttonText}>Request Service</Text>
            </Pressable>
          ) : null}
        </View>

        {(group.sub_orders || []).map((subOrder: any) => (
          <View key={String(subOrder.id)} style={styles.card}>
            <Text style={styles.cardTitle}>Shop: {String(subOrder.shop_name || 'Shop')}</Text>
            <Text style={styles.cardMeta}>Order: {String(subOrder.id)}</Text>
            <Text style={styles.cardMeta}>
              Status:{' '}
              <Text style={{ color: statusColor(String(subOrder.status || '-')), fontWeight: '700' }}>
                {String(subOrder.status || '-')}
              </Text>
            </Text>
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

function ProfileScreen({
  user,
  onLogout,
  fcmToken,
  onOpenServiceHistory,
}: {
  user: AppUser | null;
  onLogout: () => void;
  fcmToken: string | null;
  onOpenServiceHistory?: () => void;
}) {
  const showServiceExtras = user?.role === 'customer' || user?.role === 'dealer';
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
        {showServiceExtras && onOpenServiceHistory ? (
          <Pressable style={styles.buttonSecondary} onPress={onOpenServiceHistory}>
            <Text style={styles.buttonSecondaryText}>Service history & reviews</Text>
          </Pressable>
        ) : null}
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
        <ActivityIndicator color={colors.brandPrimary} />
        <Text style={styles.subtitle}>{text}</Text>
      </View>
    </SafeAreaView>
  );
}

function MainTabs({
  user,
  onLogout,
  fcmToken,
}: {
  user: AppUser | null;
  onLogout: () => void;
  fcmToken: string | null;
}) {
  const homeScreen = useMemo(
    () => (props: any) => <HomeScreen {...props} userRole={user?.role} />,
    [user?.role],
  );
  const ordersScreen = useMemo(
    () => (props: any) => <MyOrdersScreen {...props} userRole={user?.role} />,
    [user?.role],
  );
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Home" component={homeScreen} />
      <Tab.Screen name="Cart" component={CartScreen} />
      <Tab.Screen name="Orders" component={ordersScreen} options={{ title: 'My Orders' }} />
      <Tab.Screen name="ServiceTracking" component={TrackingScreen} options={{ title: 'Track Electrician' }} />
      {user?.role === 'dealer' && (
        <Tab.Screen
          name="DealerDashboard"
          component={DealerDashboardScreen}
          options={{ title: 'Dealer Dashboard' }}
        />
      )}
      <Tab.Screen name="Profile">
        {(props) => (
          <ProfileScreen
            user={user}
            onLogout={onLogout}
            fcmToken={fcmToken}
            onOpenServiceHistory={() => {
              const parent = props.navigation.getParent();
              if (parent && 'navigate' in parent) {
                (parent.navigate as (a: string) => void)('ServiceHistory');
              }
            }}
          />
        )}
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

    const unsubscribe = subscribeToPushTokenRefresh((nextToken) => {
      setFcmToken(nextToken);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const syncFcmToken = async () => {
      if (!token || !fcmToken) return;
      try {
        if (user?.role === 'electrician') {
          await electricianApi.saveDeviceToken(fcmToken);
        } else {
          await authApi.saveDeviceToken(fcmToken);
        }
      } catch {
        // Non-blocking: token sync can retry on next app start/login.
      }
    };
    void syncFcmToken();
  }, [token, fcmToken, user?.role]);

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

  const logout = useCallback(async () => {
    await clearSession();
    setAuthToken(null);
    setUser(null);
  }, []);

  const paymentScreen = useMemo(
    () => (props: any) => <PaymentScreen {...props} user={user} />,
    [user],
  );
  const productDetailScreen = useMemo(
    () => (props: any) => <ProductDetailScreen {...props} userRole={user?.role} />,
    [user?.role],
  );
  const mainTabs = useMemo(
    () => (props: any) => (
      <MainTabs {...props} user={user} onLogout={logout} fcmToken={fcmToken} />
    ),
    [user, logout, fcmToken],
  );
  const electricianFlow = useMemo(
    () => (props: any) => (
      <ElectricianFlow
        token={token || ''}
        onLogout={logout}
        onOpenPasswordReset={(phone?: string) =>
          props.navigation.navigate('PasswordReset', { role: 'electrician', phone })
        }
        fcmToken={fcmToken}
      />
    ),
    [token, logout, fcmToken],
  );
  const adminFlow = useMemo(
    () => (props: any) => (
      <AdminFlow
        onLogout={logout}
        onOpenPasswordReset={(phone?: string) =>
          props.navigation.navigate('PasswordReset', { role: 'admin', phone })
        }
      />
    ),
    [logout],
  );

  if (hydrating) return <Loader text="Preparing app..." />;

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style="dark" />
      <RootStack.Navigator screenOptions={stackScreenOptions}>
        {!token ? (
          <>
            <RootStack.Screen name="Auth" options={{ headerShown: false }}>
              {(props) => <AuthWelcomeScreen {...props} />}
            </RootStack.Screen>
            <RootStack.Screen name="OtpSignIn" options={{ title: 'Mobile sign-in' }}>
              {(props) => <OtpSignInScreen {...props} onLoggedIn={handleLoggedIn} />}
            </RootStack.Screen>
            <RootStack.Screen name="Register" options={{ title: 'Register' }}>
              {(props) => <RegisterScreen {...props} onLoggedIn={handleLoggedIn} />}
            </RootStack.Screen>
            <RootStack.Screen name="AdminSignIn" options={{ title: 'Admin' }}>
              {(props) => <AdminSignInScreen {...props} onLoggedIn={handleLoggedIn} />}
            </RootStack.Screen>
            <RootStack.Screen name="ShopPending" options={{ title: 'Shop pending' }}>
              {(props) => <ShopPendingScreen {...props} />}
            </RootStack.Screen>
          </>
        ) : (
          <>
            <RootStack.Screen
              name="Main"
              component={
                user?.role === 'electrician'
                  ? electricianFlow
                  : user?.role === 'admin'
                  ? adminFlow
                  : mainTabs
              }
              options={{ headerShown: false }}
            />
            {user?.role !== 'electrician' && user?.role !== 'admin' && (
              <>
                <RootStack.Screen name="ProductDetail" component={productDetailScreen} options={{ title: 'Product Detail' }} />
                <RootStack.Screen name="Checkout" component={CheckoutScreen} />
                <RootStack.Screen name="Payment" component={paymentScreen} />
                <RootStack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Order Detail' }} />
                <RootStack.Screen name="ServiceRequest" component={ServiceRequestScreen} options={{ title: 'Request Service' }} />
                <RootStack.Screen name="ElectricianList" component={ElectricianListScreen} options={{ title: 'Electricians' }} />
                <RootStack.Screen
                  name="ElectricianPublicProfile"
                  component={ElectricianPublicProfileScreen}
                  options={{ title: 'Electrician' }}
                />
                <RootStack.Screen
                  name="ServiceBookingConfirm"
                  component={ServiceBookingConfirmScreen}
                  options={{ title: 'Booking', headerBackVisible: false }}
                />
                <RootStack.Screen name="LeaveReview" component={LeaveReviewScreen} options={{ title: 'Leave Review' }} />
                <RootStack.Screen name="ServiceHistory" component={ServiceHistoryScreen} options={{ title: 'Service history' }} />
              </>
            )}
          </>
        )}
        <RootStack.Screen name="PasswordReset" component={PasswordResetScreen} options={{ title: 'Password Reset' }} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AppShell />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: screenGutter, paddingVertical: 24, gap: 12 },
  /** ScrollView content — no flex:1 (avoids layout glitches with RN ScrollView). */
  centerBoxScrollable: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: screenGutter,
    paddingVertical: 24,
    gap: 12,
    paddingBottom: 36,
  },
  centerBoxNoFlex: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 8, gap: 8 },
  adminSignInScroll: { paddingTop: 8, paddingBottom: 32, flexGrow: 1 },
  adminEmoji: { fontSize: 40, lineHeight: 48, textAlign: 'center' },
  buttonLinkWrap: { alignItems: 'center', marginTop: 4 },
  captionBlock: { marginTop: 8, paddingHorizontal: 4, alignItems: 'center', gap: 6 },
  captionNote: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  subtitleEm: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  listPad: {
    paddingHorizontal: screenGutter,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 14,
  },
  input: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.softPanel,
  },
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
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.surface, fontWeight: '600' },
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
  cardDesc: { fontSize: 13, color: colors.textSecondary },
  bigPrice: { fontSize: 20, fontWeight: '700', color: colors.brandPrimary },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  splashContent: {
    paddingHorizontal: screenGutter,
    paddingVertical: 28,
    justifyContent: 'center',
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  splashLogoWrap: { alignItems: 'center', width: '100%' },
  splashGap: { height: 40 },
  splashPrimaryBtn: {
    width: '100%',
    backgroundColor: colors.brandPrimary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  splashPrimaryBtnText: { color: colors.surface, fontWeight: '700', fontSize: 17 },
  splashCtaSub: { color: 'rgba(255,255,255,0.92)', fontSize: 13, marginTop: 8, textAlign: 'center' },
  splashCtaSubMuted: { color: colors.textSecondary, fontSize: 13, marginTop: 6, textAlign: 'center' },
  splashOrRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  splashOrLine: { flex: 1, height: 1, backgroundColor: colors.border },
  splashOrLabel: { fontSize: 13, color: colors.textSecondary, textTransform: 'lowercase' },
  splashSecondaryBtn: {
    width: '100%',
    borderWidth: 2,
    borderColor: colors.brandPrimary,
    backgroundColor: colors.surface,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  splashSecondaryBtnText: { color: colors.brandPrimary, fontWeight: '700', fontSize: 17 },
  splashRegisterLink: { marginTop: 28, alignItems: 'center' },
  splashRegisterLinkText: { color: colors.brandPrimary, fontWeight: '600', fontSize: 15 },
  roleChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  roleChipActive: { borderColor: colors.brandPrimary, backgroundColor: colors.softPanel },
  roleChipText: { color: colors.textSecondary, fontSize: 12, textTransform: 'capitalize' },
  roleChipTextActive: { color: colors.brandPrimary, fontWeight: '600' },
  remove: { color: colors.error, fontWeight: '600' },
  shopTotal: { marginTop: 8, fontWeight: '700', color: colors.textPrimary },
  link: { marginTop: 6, color: colors.brandPrimary, fontWeight: '600' },
});
