import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { getExpoGeolocation, resolveRegistrationCoordinates, reverseGeocodeIndia } from './src/geo-registration';
import { suggestPincodeForIndianCity } from './src/india-postal-lookup';
import { Buffer } from 'buffer';
import {
  setApiTokenGetter,
  authApi,
  catalogApi,
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
import { PublicWebsiteLinks } from './src/components/PublicWebsiteLinks';
import { BlogListScreen, BlogPostScreen } from './src/screens/BlogScreens';
import { AboutScreen } from './src/screens/AboutScreen';
import { ContactScreen } from './src/screens/ContactScreen';
import { ProductDetailScreen } from './src/screens/ProductDetailScreen';
import { SuperadminWebQueueLinks } from './src/components/SuperadminWebQueueLinks';
import { setupPushNotifications, subscribeToPushTokenRefresh } from './src/services/notifications';
import { WebView } from 'react-native-webview';
import {
  buildPayuAutoSubmitHtml,
  isCheckoutFailureReturnUrl,
  isCheckoutSuccessReturnUrl,
} from './src/services/payu';
import { TrackingScreen } from './src/screens/TrackingScreen';
import { ElectricianFlow } from './src/electrician/ElectricianFlow';
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
import { publicWebUrl } from './src/config/publicWeb';
import {
  publicBrandName,
  publicMarketingHomeTagline,
  publicShopBrandMark,
  publicSupportPhoneDisplay,
  publicSupportTelHref,
} from './src/config/publicMarketing';
import { BrowseBySiteAnimatedSvg } from './src/components/BrowseBySiteAnimatedSvg';
import { FloatingWhatsAppFab } from './src/components/FloatingWhatsAppFab';
import { HomeLeadFormSection } from './src/components/HomeLeadFormSection';
import { CCTV_HOME_BROWSE_TILES } from './src/lib/home-cctv-mobile-tiles';
import {
  HOME_COMBO_COLLECTION_BODY,
  HOME_COMBO_COLLECTION_TITLE,
  HOME_COMBO_PREVIEW_ITEMS,
} from './src/lib/home-combo-collection';
import {
  HOME_CUSTOM_QUOTE_BODY,
  HOME_CUSTOM_QUOTE_CTA,
  HOME_CUSTOM_QUOTE_IMAGE_URI,
  HOME_CUSTOM_QUOTE_TITLE,
} from './src/lib/home-custom-quote';
import { HOME_HERO_SLIDES, HOME_PROMO_STRIP_CARDS, HOME_PROMO_STRIP_KICKER } from './src/lib/home-hero-slides';
import { HOME_HOW_SITE_CARDS, HOME_HOW_SITE_INTRO, HOME_HOW_SITE_KICKER } from './src/lib/home-how-site-works';
import { ACCOUNT_ROLES_SUMMARY } from './src/lib/userRoles';

type RegisterInitialRole = 'customer' | 'dealer' | 'electrician' | 'shop_owner';

type RootStackParamList = {
  Auth: undefined;
  OtpSignIn: undefined;
  AdminSignIn: undefined;
  Register: { email?: string; phone?: string; initialRole?: RegisterInitialRole };
  ShopPending: { shopName: string; email: string };
  PasswordReset: { role?: PasswordResetRole; email?: string };
  Main: undefined;
  Blog: undefined;
  BlogPost: { slug: string };
  About: undefined;
  Contact: undefined;
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
const SuperadminStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator<MainTabsParamList>();

type AppUser = {
  id: string;
  role: string;
  email?: string;
  phone?: string;
  name?: string;
};

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    Number(amount || 0),
  );
}

type CatalogueSortKey = 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'rating';

function priceValForRole(p: Product, role?: string) {
  const isDealer = role === 'dealer';
  const v = isDealer ? p.price_dealer ?? p.price_customer : p.price_customer ?? p.price_dealer;
  return Number(v ?? 0);
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

/** Open in-app Contact when nested under root stack + tabs; otherwise false. */
function tryNavigateRootContact(navigation: { getParent?: () => any } | undefined): boolean {
  const tab = navigation?.getParent?.();
  const stack = tab?.getParent?.();
  if (stack && typeof stack.navigate === 'function') {
    stack.navigate('Contact');
    return true;
  }
  return false;
}

function tryNavigateRootAbout(navigation: { getParent?: () => any } | undefined): boolean {
  const tab = navigation?.getParent?.();
  const stack = tab?.getParent?.();
  if (stack && typeof stack.navigate === 'function') {
    stack.navigate('About');
    return true;
  }
  return false;
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

function SuperadminHubScreen({ onLogout }: { onLogout: () => void }) {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.listPad}>
        <Text style={styles.title}>Platform administration</Text>
        <Text style={[styles.subtitle, { textAlign: 'left', marginTop: 6 }]}>
          Superadmin queues open in your browser. Sign in on the web if you are prompted.
        </Text>
        <View style={{ marginTop: 16 }}>
          <SuperadminWebQueueLinks showHeader={false} />
        </View>
        <Pressable style={[styles.buttonSecondary, { marginTop: 28 }]} onPress={() => void onLogout()}>
          <Text style={styles.buttonSecondaryText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function ShopPartnerPortalScreen({ onLogout }: { onLogout: () => void }) {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.listPad}>
        <Text style={styles.title}>Partner account</Text>
        <Text style={[styles.subtitle, { textAlign: 'left', marginTop: 8 }]}>
          The public catalogue and orders are managed on the platform. Use the website for storefront purchases; our team handles listing and fulfilment coordination.
        </Text>
        <Pressable style={[styles.buttonSecondary, { marginTop: 24 }]} onPress={() => void onLogout()}>
          <Text style={styles.buttonSecondaryText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
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
        <Text style={[styles.captionNote, { marginTop: 12, paddingHorizontal: 8 }]}>
          {publicMarketingHomeTagline}
        </Text>
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
          <Text style={styles.splashSecondaryBtnText}>Platform admin? Sign in here</Text>
          <Text style={styles.splashCtaSubMuted}>Catalogue & approvals (web queues linked below)</Text>
        </Pressable>
        <Pressable style={[styles.buttonSecondary, { marginTop: 20 }]} onPress={() => navigation.navigate('Register', {})}>
          <Text style={styles.buttonSecondaryText}>Create an account</Text>
        </Pressable>
        <SuperadminWebQueueLinks />
        <PublicWebsiteLinks audience="signed_out" />
      </ScrollView>
    </SafeAreaView>
  );
}

function OtpSignInScreen({ onLoggedIn, navigation }: { onLoggedIn: (token: string, user: AppUser) => void; navigation: any }) {
  const [emailInput, setEmailInput] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);

  const normalizedEmail = () => emailInput.trim().toLowerCase();

  const sendOtp = async () => {
    try {
      setLoading(true);
      const em = normalizedEmail();
      if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
        Alert.alert('Invalid email', 'Enter a valid email address.');
        return;
      }
      await authApi.sendOtp(em);
      setStep('otp');
      Alert.alert('OTP sent', 'Check your email for the 6-digit code.');
    } catch (err) {
      Alert.alert('Login failed', asApiError(err, 'Unable to send OTP.'));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtpLogin = async () => {
    try {
      setLoading(true);
      const em = normalizedEmail();
      const { data } = await authApi.verifyOtp(em, otp.replace(/\D/g, ''));
      if (!data.is_registered) {
        navigation.navigate('Register', { email: em });
        setStep('email');
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
          <Text style={styles.subtitle}>Sign in with your email. We will send a 6-digit OTP.</Text>
          {step === 'email' ? (
            <TextInput
              style={styles.input}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={emailInput}
              onChangeText={setEmailInput}
            />
          ) : (
            <>
              <Text style={styles.cardMeta}>Code sent to {normalizedEmail()}</Text>
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

          <Pressable style={styles.button} disabled={loading} onPress={step === 'email' ? sendOtp : verifyOtpLogin}>
            <Text style={styles.buttonText}>
              {loading ? 'Please wait...' : step === 'email' ? 'Send OTP' : 'Verify & sign in'}
            </Text>
          </Pressable>
          {step === 'otp' ? (
            <Pressable style={styles.buttonSecondary} onPress={() => { setStep('email'); setOtp(''); }}>
              <Text style={styles.buttonSecondaryText}>Change email</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.buttonSecondary} onPress={() => navigation.navigate('Register', {})}>
            <Text style={styles.buttonSecondaryText}>New user? Create an account</Text>
          </Pressable>
          <PublicWebsiteLinks audience="signed_out" />
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
      const { data } = await authApi.superadminLogin(em, password);
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
          <Text style={styles.adminEmoji}>🛡️</Text>
          <Text style={styles.title}>Platform admin</Text>
          <Text style={styles.subtitle}>Sign in with your superadmin email and password</Text>
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
        </View>
        <View style={styles.captionBlock}>
          <Text style={styles.captionNote}>
            Partner (shop) registration: use Create account → Shop owner. Approved partners do not use this screen.
          </Text>
          <Pressable style={[styles.buttonSecondary, { marginTop: 12 }]} onPress={() => navigation.navigate('Register', { initialRole: 'shop_owner' })}>
            <Text style={styles.buttonSecondaryText}>Register as shop partner</Text>
          </Pressable>
        </View>
        <SuperadminWebQueueLinks />
        <PublicWebsiteLinks audience="signed_out" />
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
        <PublicWebsiteLinks audience="signed_out" />
      </ScrollView>
    </SafeAreaView>
  );
}

const REGISTER_ROLE_TABS: { value: RegisterInitialRole; label: string }[] = [
  { value: 'customer', label: 'Customer' },
  { value: 'dealer', label: 'Dealer' },
  { value: 'electrician', label: 'Technician' },
  { value: 'shop_owner', label: 'Admin' },
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
  const [deliveryCity, setDeliveryCity] = useState('');
  const [deliveryPincode, setDeliveryPincode] = useState('');
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
  const [shopGeoLoading, setShopGeoLoading] = useState(false);
  const [deliveryGeoLoading, setDeliveryGeoLoading] = useState(false);
  /** After OTP is sent (customer / dealer / technician), lock identity & address fields — same policy as web. */
  const [registerDetailsLocked, setRegisterDetailsLocked] = useState(false);

  const deliveryCachedGpsRef = useRef<{ lat: number; lng: number } | null>(null);
  const deliveryPinSuggestSeq = useRef(0);
  useEffect(() => {
    if (role !== 'customer' && role !== 'dealer' && role !== 'electrician') return;
    const c = deliveryCity.trim();
    if (c.length < 3) return;
    const timer = setTimeout(() => {
      const seq = ++deliveryPinSuggestSeq.current;
      void suggestPincodeForIndianCity(c).then((pin) => {
        if (seq !== deliveryPinSuggestSeq.current || !pin) return;
        setDeliveryPincode(pin);
      });
    }, 450);
    return () => clearTimeout(timer);
  }, [deliveryCity, role]);

  const shopPinSuggestSeq = useRef(0);
  useEffect(() => {
    if (role !== 'shop_owner') return;
    const c = city.trim();
    if (c.length < 3) return;
    const timer = setTimeout(() => {
      const seq = ++shopPinSuggestSeq.current;
      void suggestPincodeForIndianCity(c).then((pin) => {
        if (seq !== shopPinSuggestSeq.current || !pin) return;
        setPincode(pin);
      });
    }, 450);
    return () => clearTimeout(timer);
  }, [city, role]);

  useEffect(() => {
    setRegisterDetailsLocked(false);
  }, [role]);

  const getRegisterOtpError = useCallback((): string | null => {
    if (role === 'shop_owner') return null;
    const phoneOk = phone.replace(/\D/g, '').length === 10;
    if (!name.trim() || !email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || !phoneOk) {
      return 'Enter your full name, a valid email, and a 10-digit mobile number.';
    }
    if (role === 'customer') {
      if (!address.trim() || !deliveryCity.trim() || !/^\d{6}$/.test(deliveryPincode.replace(/\D/g, ''))) {
        return 'Enter your delivery address, city, and a valid 6-digit pincode.';
      }
    }
    if (role === 'dealer') {
      if (!gstNo.trim() || !address.trim() || !deliveryCity.trim() || !/^\d{6}$/.test(deliveryPincode.replace(/\D/g, ''))) {
        return 'Enter GST, business / delivery address, city, and a valid 6-digit pincode.';
      }
    }
    if (role === 'electrician') {
      if (!skills.trim()) {
        return 'Enter your skills before requesting OTP.';
      }
      if (!deliveryCity.trim() || !/^\d{6}$/.test(deliveryPincode.replace(/\D/g, ''))) {
        return 'Enter service city and a valid 6-digit pincode.';
      }
    }
    return null;
  }, [
    role,
    name,
    email,
    phone,
    address,
    deliveryCity,
    deliveryPincode,
    gstNo,
    skills,
  ]);

  const registrationOtpReady = getRegisterOtpError() === null;

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
    const otpErr = getRegisterOtpError();
    if (otpErr) {
      Alert.alert('Required', otpErr);
      return;
    }
    try {
      setSendingOtp(true);
      if (role === 'customer' || role === 'dealer' || role === 'electrician') {
        await authApi.sendOtp(email.trim().toLowerCase(), { purpose: 'signup' });
      }
      Alert.alert('OTP sent', 'Check your email for the code to complete registration.');
      setRegisterDetailsLocked(true);
    } catch (err) {
      Alert.alert('Error', asApiError(err, 'Failed to send OTP.'));
    } finally {
      setSendingOtp(false);
    }
  };

  const lockReg = registerDetailsLocked && role !== 'shop_owner';

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
    const pin6 = deliveryPincode.replace(/\D/g, '').slice(0, 6);
    if (role === 'customer' || role === 'dealer' || role === 'electrician') {
      if (!deliveryCity.trim() || !/^\d{6}$/.test(pin6)) {
        Alert.alert('Location', 'Enter city and a valid 6-digit pincode (used for map location if GPS is unavailable).');
        return;
      }
    }
    if (role === 'customer' && !address.trim()) {
      Alert.alert('Address required', 'Enter your delivery address.');
      return;
    }
    try {
      setLoading(true);
      if (role === 'electrician') {
        const coords = deliveryCachedGpsRef.current ?? await resolveRegistrationCoordinates(deliveryCity, pin6);
        const otpDigits = otp.replace(/\D/g, '');
        if (otpDigits.length !== 6) {
          Alert.alert('OTP required', 'Enter the 6-digit code sent to your phone, or tap Send OTP first.');
          return;
        }
        const fd = new FormData();
        fd.append('name', name.trim());
        fd.append('phone', normalizePhone(phone));
        fd.append('otp', otpDigits);
        fd.append('email', email.trim().toLowerCase());
        if (coords) {
          fd.append('lat', String(coords.lat));
          fd.append('lng', String(coords.lng));
        }
        const addressLine = [address.trim() || null, `${deliveryCity.trim()}, ${pin6}, India`].filter(Boolean).join(' · ');
        fd.append('address', addressLine);
        if (skills.trim()) fd.append('skills', skills.trim());
        if (aadharAsset) {
          fd.append('aadhar', {
            uri: aadharAsset.uri,
            name: aadharAsset.fileName || `aadhar-${Date.now()}.jpg`,
            type: aadharAsset.mimeType || 'image/jpeg',
          } as never);
        }
        if (photoAsset) {
          fd.append('photo', {
            uri: photoAsset.uri,
            name: photoAsset.fileName || `photo-${Date.now()}.jpg`,
            type: photoAsset.mimeType || 'image/jpeg',
          } as never);
        }
        await electricianRegisterApi.register(fd);
        Alert.alert(
          'Registration submitted',
          'Technician registration is pending approval. You can sign in with OTP after approval.',
          [{ text: 'OK', onPress: goToSignInHome }],
        );
        return;
      }
      const fullShopperAddress = [address.trim(), deliveryCity.trim(), `Pincode: ${pin6}`].filter(Boolean).join('\n');
      const geo = await resolveRegistrationCoordinates(deliveryCity, pin6);
      const { data } = await authApi.register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: normalizePhone(phone),
        otp,
        role: role as 'customer' | 'dealer',
        gst_no: role === 'dealer' ? gstNo.trim() : undefined,
        address: fullShopperAddress || undefined,
        business_name: role === 'dealer' ? name.trim() : undefined,
        business_address: role === 'dealer' ? address.trim() : undefined,
        business_city: role === 'dealer' ? deliveryCity.trim() : undefined,
        business_pincode: role === 'dealer' ? pin6 : undefined,
        ...(geo ? { lat: geo.lat, lng: geo.lng } : {}),
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
      const axiosErr = err as AxiosError<{ message?: string | string[] }>;
      const status = axiosErr?.response?.status;
      const msg = asApiError(err, 'Registration failed.');
      if (status === 401) {
        Alert.alert('OTP', msg);
      } else if (status === 409) {
        Alert.alert('Already registered', msg);
      } else if (status === 400) {
        Alert.alert('Check your details', msg);
      } else {
        Alert.alert('Error', msg);
      }
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
            {ACCOUNT_ROLES_SUMMARY} — same app; your dashboard matches your role after sign-in. Admin tab is shop
            registration; Superadmin is provisioned separately.
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
              <Pressable
                style={[styles.buttonSecondary, shopGeoLoading && { opacity: 0.7 }]}
                disabled={shopGeoLoading}
                onPress={async () => {
                  setShopGeoLoading(true);
                  try {
                    const pos = await getExpoGeolocation();
                    if (!pos) {
                      Alert.alert(
                        'Location',
                        'Allow location access in Settings, or type your shop address, city, and pincode manually.',
                      );
                      return;
                    }
                    const parsed = await reverseGeocodeIndia(pos.lat, pos.lng);
                    if (!parsed) {
                      Alert.alert('Location', 'Could not resolve an address from GPS. Please enter details manually.');
                      return;
                    }
                    if (parsed.address) setAddress(parsed.address);
                    if (parsed.city) setCity(parsed.city);
                    if (parsed.pincode) setPincode(parsed.pincode);
                    Alert.alert(
                      'Address updated',
                      parsed.pincode
                        ? 'Street, city, and pincode were filled from your location. Review and edit if needed.'
                        : 'Street and city were filled. Add or confirm pincode if needed.',
                    );
                  } finally {
                    setShopGeoLoading(false);
                  }
                }}
              >
                <Text style={styles.buttonSecondaryText}>
                  {shopGeoLoading ? 'Getting location…' : 'Use current location for shop address'}
                </Text>
              </Pressable>
              <Text style={styles.captionNote}>Or enter address, city, and pincode manually.</Text>
              <TextInput style={styles.input} placeholder="City" value={city} onChangeText={setCity} />
              <TextInput
                style={styles.input}
                placeholder="Pincode (6 digits)"
                keyboardType="number-pad"
                maxLength={6}
                value={pincode}
                onChangeText={(t) => setPincode(t.replace(/\D/g, '').slice(0, 6))}
              />
              <Text style={styles.captionNote}>Pincode fills from city when available — change if needed.</Text>
              <Pressable style={styles.buttonSecondary} onPress={pickShopLogo}>
                <Text style={styles.buttonSecondaryText}>
                  {logoAsset ? `Change logo (${logoAsset.fileName || 'selected'})` : 'Add shop logo (camera or gallery)'}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Full name"
                value={name}
                onChangeText={setName}
                editable={!lockReg}
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                editable={!lockReg}
              />
              <TextInput
                style={styles.input}
                placeholder="Mobile (10 digits)"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
                maxLength={10}
                editable={!lockReg}
              />
              {role === 'dealer' && (
                <TextInput
                  style={styles.input}
                  placeholder="GST number"
                  value={gstNo}
                  onChangeText={setGstNo}
                  autoCapitalize="characters"
                  editable={!lockReg}
                />
              )}
              {role === 'electrician' && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Skills (comma-separated)"
                    value={skills}
                    onChangeText={setSkills}
                    editable={!lockReg}
                  />
                  <Pressable
                    style={styles.buttonSecondary}
                    disabled={lockReg}
                    onPress={async () => setAadharAsset(await pickImageAsset('Aadhar document'))}
                  >
                    <Text style={styles.buttonSecondaryText}>
                      {aadharAsset ? `Aadhar: ${aadharAsset.fileName || 'selected'}` : 'Upload Aadhar document (optional)'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.buttonSecondary}
                    disabled={lockReg}
                    onPress={async () => setPhotoAsset(await pickImageAsset('profile photo'))}
                  >
                    <Text style={styles.buttonSecondaryText}>
                      {photoAsset ? `Photo: ${photoAsset.fileName || 'selected'}` : 'Upload profile photo (optional)'}
                    </Text>
                  </Pressable>
                </>
              )}
              {(role === 'customer' || role === 'dealer' || role === 'electrician') && (
                <>
                  <Pressable
                    style={[styles.buttonSecondary, deliveryGeoLoading && { opacity: 0.7 }]}
                    disabled={deliveryGeoLoading || lockReg}
                    onPress={async () => {
                      setDeliveryGeoLoading(true);
                      try {
                        const pos = await getExpoGeolocation();
                        if (!pos) {
                          Alert.alert(
                            'Location',
                            'Allow location access in Settings, or enter city, pincode, and address manually.',
                          );
                          return;
                        }
                        deliveryCachedGpsRef.current = pos;
                        const parsed = await reverseGeocodeIndia(pos.lat, pos.lng);
                        if (!parsed) {
                          Alert.alert('Location', 'Could not resolve an address from GPS. Please enter details manually.');
                          return;
                        }
                        if (parsed.city) setDeliveryCity(parsed.city);
                        if (parsed.pincode) setDeliveryPincode(parsed.pincode);
                        if (parsed.address) setAddress(parsed.address);
                        Alert.alert(
                          'Address updated',
                          parsed.pincode
                            ? 'Street, city, and pincode were filled from your location. Review and edit if needed.'
                            : 'Street and city were filled. Add or confirm pincode if needed.',
                        );
                      } finally {
                        setDeliveryGeoLoading(false);
                      }
                    }}
                  >
                    <Text style={styles.buttonSecondaryText}>
                      {deliveryGeoLoading ? 'Getting location…' : 'Use current location for address'}
                    </Text>
                  </Pressable>
                  <Text style={styles.captionNote}>Or enter city, pincode, and street address manually below.</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="City"
                    value={deliveryCity}
                    onChangeText={setDeliveryCity}
                    editable={!lockReg}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Pincode (6 digits)"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={deliveryPincode}
                    onChangeText={(t) => setDeliveryPincode(t.replace(/\D/g, '').slice(0, 6))}
                    editable={!lockReg}
                  />
                  {role !== 'dealer' ? (
                    <Text style={styles.captionNote}>
                      Pincode fills from city when available (India Post data). Submit still uses GPS when allowed for map accuracy.
                    </Text>
                  ) : null}
                </>
              )}
              <TextInput
                style={styles.input}
                placeholder={
                  role === 'dealer'
                    ? 'Business / delivery address (required)'
                    : role === 'customer'
                      ? 'Delivery address (required)'
                      : 'Address / notes (optional)'
                }
                value={address}
                onChangeText={setAddress}
                editable={!lockReg}
              />
            </>
          )}
          {role !== 'shop_owner' && (
            <>
              <TextInput
                style={styles.input}
                placeholder="6-digit OTP"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/\D/g, ''))}
              />
              <Pressable style={styles.buttonSecondary} onPress={sendOtp} disabled={sendingOtp || !registrationOtpReady}>
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
        <PublicWebsiteLinks audience="signed_out" />
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
  const role: PasswordResetRole = 'admin';
  const [emailReset, setEmailReset] = useState(route.params?.email || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'start' | 'complete'>('start');
  const [loading, setLoading] = useState(false);

  const start = async () => {
    try {
      setLoading(true);
      await authApi.passwordResetStart(role, emailReset.trim().toLowerCase());
      setStep('complete');
      Alert.alert('OTP sent', 'A password reset OTP was sent to your email.');
    } catch (err) {
      Alert.alert('Error', asApiError(err, 'Could not start password reset.'));
    } finally {
      setLoading(false);
    }
  };

  const complete = async () => {
    try {
      setLoading(true);
      await authApi.passwordResetComplete(role, emailReset.trim().toLowerCase(), otp, newPassword);
      Alert.alert('Success', 'Password updated successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', asApiError(err, 'Could not update password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.listPad}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Shop admins only. We email a 6-digit OTP to the address on your shop account. Customers and dealers sign in
            with an email OTP — no password reset here. Superadmin uses the web sign-in flow.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="admin@shop.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={emailReset}
            onChangeText={setEmailReset}
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
        <PublicWebsiteLinks audience="signed_out" />
      </ScrollView>
    </SafeAreaView>
  );
}

function resolveCatalogBrowseParams(
  tile: { label: string; catalogSearch?: string },
  _index: number,
  categories: Array<{ id: string; name: string }>,
): { category_id?: string; search?: string } {
  const query = tile.catalogSearch ?? tile.label;
  const token = query.split(/\s+/)[0]?.toLowerCase() ?? '';
  const match = categories.find((c) => c.name.toLowerCase().includes(token));
  if (match?.id) return { category_id: match.id };
  return { search: query };
}

function HomeScreen({ navigation, userRole }: { navigation: any; userRole?: string }) {
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const padL = Math.max(screenGutter, insets.left);
  const padR = Math.max(screenGutter, insets.right);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogueReady, setCatalogueReady] = useState(false);
  const [approvedShopsOnly, setApprovedShopsOnly] = useState(true);
  const [approvedShopList, setApprovedShopList] = useState<Array<{ id: string; shop_name: string }>>([]);
  const [shopFilter, setShopFilter] = useState('');
  const [shopsPanelOpen, setShopsPanelOpen] = useState(false);
  const [apiCategories, setApiCategories] = useState<Array<{ id: string; name: string; parent_id?: string | null }>>([]);
  const [browseCategoryId, setBrowseCategoryId] = useState<string | undefined>();
  const [browseSearch, setBrowseSearch] = useState<string | undefined>();
  const [browseLabel, setBrowseLabel] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState<CatalogueSortKey>('price_asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [cartBusyId, setCartBusyId] = useState<string | null>(null);
  const heroScrollRef = useRef<ScrollView>(null);
  const [heroIdx, setHeroIdx] = useState(0);
  const heroSlideW = Math.max(1, winW - padL - padR);
  const collectionTwoColumn = winW >= 720;
  const quoteImgW = Math.ceil(winW * 1.2);
  const quoteImgH = 288;
  const customQuoteMotion = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(customQuoteMotion, {
          toValue: 1,
          duration: 14000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(customQuoteMotion, {
          toValue: 0,
          duration: 14000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [customQuoteMotion]);

  const customQuoteTx = customQuoteMotion.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });
  const customQuoteScale = customQuoteMotion.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });

  const canAddToCart = userRole === 'customer' || userRole === 'dealer';

  useEffect(() => {
    heroScrollRef.current?.scrollTo({ x: heroIdx * heroSlideW, animated: true });
  }, [heroIdx, heroSlideW]);

  useEffect(() => {
    const n = HOME_HERO_SLIDES.length;
    if (n <= 1) return;
    const id = setInterval(() => setHeroIdx((i) => (i + 1) % n), 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void catalogApi
      .getCategories()
      .then((r) => {
        if (!cancelled && Array.isArray(r.data)) {
          setApiCategories(r.data as Array<{ id: string; name: string; parent_id?: string | null }>);
        }
      })
      .catch(() => {
        if (!cancelled) setApiCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await productApi.list({
        approved_shops_only: approvedShopsOnly,
        ...(browseCategoryId ? { category_id: browseCategoryId } : {}),
        ...(browseSearch && !browseCategoryId ? { search: browseSearch } : {}),
        ...(minPrice.trim() ? { min_price: Number(minPrice.replace(/\D/g, '')) } : {}),
        ...(maxPrice.trim() ? { max_price: Number(maxPrice.replace(/\D/g, '')) } : {}),
      });
      setProducts(data || []);
    } catch (err) {
      Alert.alert('Error', asApiError(err, 'Failed to load products.'));
    } finally {
      setLoading(false);
      setCatalogueReady(true);
    }
  }, [approvedShopsOnly, browseCategoryId, browseSearch, minPrice, maxPrice]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await productApi.listApprovedShops();
        if (cancelled) return;
        setApprovedShopList(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setApprovedShopList([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  useEffect(() => {
    setPage(1);
  }, [shopFilter, browseCategoryId, browseSearch, minPrice, maxPrice, approvedShopsOnly, sort, pageSize]);

  const visibleProducts = useMemo(() => {
    if (!shopFilter.trim()) return products;
    const t = shopFilter.trim().toLowerCase();
    return products.filter((p) => String(p.shop_name || '').trim().toLowerCase() === t);
  }, [products, shopFilter]);

  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) {
      const id = String(p.category_id || '');
      if (!id) continue;
      m.set(id, (m.get(id) || 0) + 1);
    }
    return m;
  }, [products]);

  const cataloguePriceExtent = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const p of products) {
      const v = priceValForRole(p, userRole);
      if (v > 0) {
        min = Math.min(min, v);
        max = Math.max(max, v);
      }
    }
    if (!Number.isFinite(min)) return { min: 0, max: 0 };
    return { min: Math.floor(min), max: Math.ceil(max) };
  }, [products, userRole]);

  const appliedMin = minPrice.trim() ? Number(minPrice.replace(/\D/g, '')) : cataloguePriceExtent.min;
  const appliedMax = maxPrice.trim() ? Number(maxPrice.replace(/\D/g, '')) : cataloguePriceExtent.max;
  const priceBandLabel =
    cataloguePriceExtent.max > 0
      ? `Price: ${formatINR(appliedMin || cataloguePriceExtent.min)} — ${formatINR(appliedMax || cataloguePriceExtent.max)}`
      : 'Price: —';

  const sortedProducts = useMemo(() => {
    const list = [...visibleProducts];
    if (sort === 'price_asc') list.sort((a, b) => priceValForRole(a, userRole) - priceValForRole(b, userRole));
    else if (sort === 'price_desc') list.sort((a, b) => priceValForRole(b, userRole) - priceValForRole(a, userRole));
    else if (sort === 'rating') list.sort((a, b) => Number(b.rating_avg || 0) - Number(a.rating_avg || 0));
    return list;
  }, [visibleProducts, sort, userRole]);

  const totalFiltered = sortedProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = totalFiltered === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, totalFiltered);
  const pageSlice = useMemo(
    () => sortedProducts.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sortedProducts, safePage, pageSize],
  );

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const sortHuman =
    sort === 'price_asc'
      ? 'Sorted by price: low to high'
      : sort === 'price_desc'
        ? 'Sorted by price: high to low'
        : sort === 'newest'
          ? 'Sorted by newest'
          : sort === 'rating'
            ? 'Sorted by rating'
            : 'Sorted by relevance';

  const sortOptions: { key: CatalogueSortKey; label: string }[] = [
    { key: 'price_asc', label: 'Low' },
    { key: 'price_desc', label: 'High' },
    { key: 'rating', label: 'Rated' },
    { key: 'relevance', label: 'Default' },
  ];

  const addProductToCart = async (p: Product) => {
    try {
      setCartBusyId(p.id);
      const n = userRole === 'dealer' ? Math.max(1, Number(p.min_order_quantity || 1)) : 1;
      await cartApi.add(p.id, n);
      Alert.alert('Added', n > 1 ? `Added ${n} to cart (minimum order).` : 'Product added to cart.', [
        { text: 'OK', onPress: () => navigation.navigate('Main', { screen: 'Cart' }) },
        { text: 'Stay', style: 'cancel' },
      ]);
    } catch (err) {
      Alert.alert('Error', asApiError(err, 'Could not add to cart.'));
    } finally {
      setCartBusyId(null);
    }
  };

  if (loading && !catalogueReady) return <Loader text="Loading catalogue..." />;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <FlatList
        contentContainerStyle={[styles.listPad, { paddingLeft: padL, paddingRight: padR }]}
        data={pageSlice}
        keyExtractor={(item) => item.id}
        refreshing={loading && catalogueReady}
        onRefresh={() => void load()}
        ListHeaderComponent={
          <View style={{ marginBottom: 14, gap: 12 }}>
            <ScrollView
              ref={heroScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              style={{ width: heroSlideW, alignSelf: 'stretch' }}
              onMomentumScrollEnd={(e) => {
                const x = e.nativeEvent.contentOffset.x;
                const idx = Math.round(x / heroSlideW);
                setHeroIdx(Math.min(Math.max(0, idx), HOME_HERO_SLIDES.length - 1));
              }}
            >
              {HOME_HERO_SLIDES.map((slide) => (
                <Pressable
                  key={slide.title}
                  style={{ width: heroSlideW, height: 220 }}
                  onPress={() => void Linking.openURL(publicWebUrl(slide.href))}
                  accessibilityRole="button"
                  accessibilityLabel={`${slide.title}. ${slide.subtitle}`}
                >
                  <ImageBackground
                    source={{ uri: slide.imageUri }}
                    style={styles.homeHeroSlideBg}
                    imageStyle={styles.homeHeroSlideImage}
                  >
                    <View style={styles.homeHeroOverlay} />
                    <View style={styles.homeHeroTextBlock}>
                      <Text style={styles.homeHeroKicker}>All-new and loveable</Text>
                      <Text style={styles.homeHeroTitle}>{slide.title}</Text>
                      <Text style={styles.homeHeroSubtitle}>{slide.subtitle}</Text>
                      <View style={styles.homeHeroCtaRow}>
                        <Text style={styles.homeHeroCtaText}>{slide.cta}</Text>
                        <MaterialCommunityIcons name="chevron-right" size={18} color="#fff" />
                      </View>
                    </View>
                  </ImageBackground>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.homeHeroDots}>
              {HOME_HERO_SLIDES.map((s, i) => (
                <Pressable
                  key={s.title}
                  onPress={() => setHeroIdx(i)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={`Show hero slide: ${s.title}`}
                  accessibilityState={{ selected: i === heroIdx }}
                >
                  <View style={[styles.homeHeroDot, i === heroIdx ? styles.homeHeroDotActive : null]} />
                </Pressable>
              ))}
            </View>
            <Text style={styles.homePromoStripKicker}>{HOME_PROMO_STRIP_KICKER}</Text>
            <View style={styles.homePromoStripList}>
              {HOME_PROMO_STRIP_CARDS.map((c) => (
                <Pressable
                  key={c.title}
                  onPress={() => void Linking.openURL(publicWebUrl(c.href))}
                  accessibilityRole="link"
                  accessibilityLabel={`${c.title}, ${c.cta}`}
                >
                  <ImageBackground
                    source={{ uri: c.imageUri }}
                    style={styles.homePromoStripCard}
                    imageStyle={styles.homeHeroSlideImage}
                  >
                    <View style={styles.homePromoStripOverlay} />
                    <View style={styles.homePromoStripTextWrap}>
                      <Text style={styles.homePromoStripTitle}>{c.title}</Text>
                      <View style={styles.homePromoStripBuyRow}>
                        <Text style={styles.homePromoStripBuyText}>{c.cta}</Text>
                        <MaterialCommunityIcons name="chevron-right" size={16} color="#fff" />
                      </View>
                    </View>
                  </ImageBackground>
                </Pressable>
              ))}
            </View>
            <View style={styles.homeMarketingHero}>
              <Text style={styles.homeMarketingKicker}>24/7 support · Free shipping, all over India</Text>
              <Pressable onPress={() => void Linking.openURL(publicSupportTelHref())} accessibilityRole="link">
                <Text style={styles.homeMarketingPhone}>{publicSupportPhoneDisplay}</Text>
              </Pressable>
              <Text style={styles.homeMarketingTitle}>Advanced CCTV & security</Text>
              <Text style={styles.homeMarketingBody}>
                Wi-Fi cameras, PoE switches, solar and 4G outdoor lines — then scroll for live listings from approved partner
                shops.
              </Text>
              <View style={styles.homeMarketingActions}>
                <Pressable
                  style={styles.homeMarketingBtnPrimary}
                  onPress={() => void Linking.openURL(publicWebUrl('/'))}
                  accessibilityRole="link"
                >
                  <Text style={styles.homeMarketingBtnPrimaryText}>Full storefront (web)</Text>
                </Pressable>
                <Pressable
                  style={styles.homeMarketingBtnSecondary}
                  onPress={() => void Linking.openURL(publicWebUrl('/shop'))}
                  accessibilityRole="link"
                >
                  <Text style={styles.homeMarketingBtnSecondaryText}>Open web shop</Text>
                </Pressable>
              </View>
            </View>

            <View style={[styles.collectionBand, collectionTwoColumn ? styles.collectionBandRow : null]}>
              <View style={[styles.collectionCopy, collectionTwoColumn ? styles.collectionCopyRow : null]}>
                <Text style={[styles.collectionTitle, collectionTwoColumn ? styles.collectionTitleRow : null]}>
                  {HOME_COMBO_COLLECTION_TITLE}
                </Text>
                <Text style={[styles.collectionBody, collectionTwoColumn ? styles.collectionBodyRow : null]}>
                  {HOME_COMBO_COLLECTION_BODY}
                </Text>
                <Pressable
                  style={[styles.collectionCta, collectionTwoColumn ? styles.collectionCtaRow : null]}
                  onPress={() => void Linking.openURL(publicWebUrl('/shop'))}
                  accessibilityRole="link"
                  accessibilityLabel="More combos, open shop on web"
                >
                  <Text style={styles.collectionCtaText}>More combos</Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#fff" />
                </Pressable>
              </View>
              <View style={[styles.collectionCards, collectionTwoColumn ? styles.collectionCardsRow : null]}>
                {HOME_COMBO_PREVIEW_ITEMS.map((item) => (
                  <Pressable
                    key={item.name}
                    style={[styles.collectionCard, collectionTwoColumn ? styles.collectionCardRow : null]}
                    onPress={() =>
                      void Linking.openURL(publicWebUrl(`/shop?search=${encodeURIComponent(item.searchQuery)}`))
                    }
                    accessibilityRole="link"
                    accessibilityLabel={`${item.name}, ${formatINR(item.priceInr)}`}
                  >
                    <View style={styles.collectionCardImageArea}>
                      <MaterialCommunityIcons name="video-outline" size={34} color={colors.muted} style={{ opacity: 0.4 }} />
                    </View>
                    <View style={styles.collectionCardInner}>
                      <Text style={styles.collectionCardCat} numberOfLines={2}>
                        {item.categoryLine}
                      </Text>
                      <Text style={styles.collectionCardName} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text style={styles.collectionCardPrice}>{formatINR(item.priceInr)}</Text>
                      <Text style={styles.collectionCardStock}>{item.inStock ? 'In stock' : 'Out of stock'}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.homeHowSiteBand}>
              <View style={styles.homeHowSiteHeader}>
                <Text style={styles.homeHowSiteKicker}>{HOME_HOW_SITE_KICKER}</Text>
                <Text style={styles.homeHowSiteTitle}>Why {publicBrandName}?</Text>
                <Text style={styles.homeHowSiteIntro}>{HOME_HOW_SITE_INTRO}</Text>
              </View>
              <View style={styles.homeHowSiteCards}>
                {HOME_HOW_SITE_CARDS.map((card) => (
                  <View key={card.title} style={styles.homeHowSiteCard}>
                    <View style={styles.homeHowSiteCardTop}>
                      <View style={styles.homeHowSiteCardIconWrap}>
                        <MaterialCommunityIcons name={card.icon} size={22} color={colors.brandPrimary} />
                      </View>
                      <Text style={styles.homeHowSiteCardKicker}>{card.kicker}</Text>
                    </View>
                    <Text style={styles.homeHowSiteCardTitle}>{card.title}</Text>
                    <Text style={styles.homeHowSiteCardBody}>
                      {card.body.split('**').map((part, i) =>
                        i % 2 === 1 ? (
                          <Text key={i} style={styles.homeHowSiteCardBodyStrong}>
                            {part}
                          </Text>
                        ) : (
                          part
                        ),
                      )}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.customQuoteOuter, { marginLeft: -padL, marginRight: -padR, width: winW }]}>
              <View style={[styles.customQuoteClip, { width: winW }]}>
                <Animated.View
                  style={{
                    position: 'absolute',
                    left: (winW - quoteImgW) / 2,
                    top: -24,
                    width: quoteImgW,
                    height: quoteImgH,
                    transform: [{ translateX: customQuoteTx }, { scale: customQuoteScale }],
                  }}
                >
                  <Image
                    source={{ uri: HOME_CUSTOM_QUOTE_IMAGE_URI }}
                    style={{ width: quoteImgW, height: quoteImgH }}
                    resizeMode="cover"
                    accessibilityIgnoresInvertColors
                  />
                </Animated.View>
                <View style={[styles.customQuoteOverlay, StyleSheet.absoluteFillObject]} />
                <View
                  style={[
                    StyleSheet.absoluteFillObject,
                    styles.customQuoteInner,
                    { justifyContent: 'center', zIndex: 2 },
                  ]}
                >
                  <Text style={styles.customQuoteTitle}>{HOME_CUSTOM_QUOTE_TITLE}</Text>
                  <Text style={styles.customQuoteBody}>{HOME_CUSTOM_QUOTE_BODY}</Text>
                  <Pressable
                    style={styles.customQuoteCta}
                    onPress={() => void Linking.openURL(publicWebUrl('/contact'))}
                    accessibilityRole="link"
                    accessibilityLabel={`${HOME_CUSTOM_QUOTE_CTA}, open contact on web`}
                  >
                    <Text style={styles.customQuoteCtaText}>{HOME_CUSTOM_QUOTE_CTA}</Text>
                    <MaterialCommunityIcons name="chevron-right" size={18} color="#fff" />
                  </Pressable>
                </View>
              </View>
            </View>

            <HomeLeadFormSection />

            <View style={styles.shopPageTitleBlock}>
              <Text style={styles.shopBrandMark}>{publicShopBrandMark}</Text>
              <Text style={styles.shopHeading}>Shop</Text>
            </View>

            <View style={styles.categorySection}>
              <View style={styles.categorySectionHeader}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.categorySectionTitle}>Browse by site</Text>
                  <Text style={styles.categorySectionSubtitle}>Tap a shortcut to filter products</Text>
                </View>
                <Pressable
                  onPress={() => void Linking.openURL(publicWebUrl('/shop'))}
                  hitSlop={8}
                  accessibilityRole="link"
                  accessibilityLabel="Open full shop on the web"
                >
                  <Text style={styles.categorySeeAll}>See all</Text>
                </Pressable>
              </View>
              <BrowseBySiteAnimatedSvg />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScrollInner}
              >
                {CCTV_HOME_BROWSE_TILES.map((tile, i) => {
                  const active = browseLabel === tile.label;
                  return (
                    <Pressable
                      key={tile.label}
                      onPress={() => {
                        const pr = resolveCatalogBrowseParams(tile, i, apiCategories);
                        setBrowseCategoryId(pr.category_id);
                        setBrowseSearch(pr.category_id ? undefined : pr.search);
                        setBrowseLabel(tile.label);
                      }}
                      style={[styles.categoryTile, active && styles.categoryTileActive]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <View style={[styles.categoryTileArt, { backgroundColor: tile.iconBg }]}>
                        <MaterialCommunityIcons name={tile.icon} size={28} color={tile.iconColor} />
                      </View>
                      <Text style={styles.categoryTileLabel} numberOfLines={2}>
                        {tile.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              {browseLabel ? (
                <Pressable
                  style={styles.categoryClearChip}
                  onPress={() => {
                    setBrowseCategoryId(undefined);
                    setBrowseSearch(undefined);
                    setBrowseLabel(null);
                  }}
                >
                  <Text style={styles.categoryClearChipText}>Clear · {browseLabel}</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.shopPickerCard}>
              <Text style={styles.catalogFilterTitle}>Category</Text>
              <ScrollView style={styles.categoryCountScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                <Pressable
                  style={[styles.catCountRow, !browseCategoryId && !browseSearch && styles.catCountRowActive]}
                  onPress={() => {
                    setBrowseCategoryId(undefined);
                    setBrowseSearch(undefined);
                    setBrowseLabel(null);
                  }}
                >
                  <Text style={styles.catCountName}>All</Text>
                  <Text style={styles.catCountNum}>{products.length}</Text>
                </Pressable>
                {apiCategories.map((c) => {
                  const active = browseCategoryId === c.id;
                  const count = categoryCounts.get(c.id) ?? 0;
                  const label = c.parent_id ? `↳ ${c.name}` : c.name;
                  return (
                    <Pressable
                      key={c.id}
                      style={[styles.catCountRow, active && styles.catCountRowActive]}
                      onPress={() => {
                        setBrowseCategoryId(c.id);
                        setBrowseSearch(undefined);
                        setBrowseLabel(c.name);
                      }}
                    >
                      <Text style={styles.catCountName} numberOfLines={1}>
                        {label}
                      </Text>
                      <Text style={styles.catCountNum}>{count}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.shopPickerCard}>
              <Text style={styles.catalogFilterTitle}>Filter by price</Text>
              <View style={styles.priceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.priceMicroLabel}>Min ₹</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={cataloguePriceExtent.min > 0 ? String(cataloguePriceExtent.min) : '0'}
                    keyboardType="number-pad"
                    value={minPrice}
                    onChangeText={(t) => setMinPrice(t.replace(/\D/g, ''))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.priceMicroLabel}>Max ₹</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={cataloguePriceExtent.max > 0 ? String(cataloguePriceExtent.max) : 'Any'}
                    keyboardType="number-pad"
                    value={maxPrice}
                    onChangeText={(t) => setMaxPrice(t.replace(/\D/g, ''))}
                  />
                </View>
              </View>
              <Text style={styles.priceBandText}>{priceBandLabel}</Text>
              <Pressable style={styles.buttonSecondary} onPress={() => void load()}>
                <Text style={styles.buttonSecondaryText}>Filter</Text>
              </Pressable>
            </View>

            {totalFiltered > 0 ? (
              <View style={styles.resultsBar}>
                <Text style={styles.resultsBarText}>
                  <Text style={styles.resultsBarStrong}>
                    Showing {pageStart}–{pageEnd} of {totalFiltered} results
                  </Text>
                  {'\n'}
                  <Text style={styles.resultsBarMuted}>{sortHuman}</Text>
                </Text>
                <Text style={styles.chipRowLabel}>Show</Text>
                <View style={styles.chipRow}>
                  {[9, 12, 18, 24].map((n) => (
                    <Pressable
                      key={n}
                      onPress={() => {
                        setPageSize(n);
                        setPage(1);
                      }}
                      style={[styles.sizeChip, pageSize === n && styles.sizeChipActive]}
                    >
                      <Text style={[styles.sizeChipText, pageSize === n && styles.sizeChipTextActive]}>{n}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={[styles.chipRowLabel, { marginTop: 8 }]}>Sort</Text>
                <View style={styles.chipRow}>
                  {sortOptions.map((o) => (
                    <Pressable
                      key={o.key}
                      onPress={() => setSort(o.key)}
                      style={[styles.sizeChip, sort === o.key && styles.sizeChipActive]}
                    >
                      <Text style={[styles.sizeChipText, sort === o.key && styles.sizeChipTextActive]}>{o.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={[styles.catalogFilterCard, { marginBottom: 0 }]}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.catalogFilterTitle}>Approved shops only</Text>
              </View>
              <Switch
                accessibilityLabel="Toggle approved shops only"
                value={approvedShopsOnly}
                onValueChange={(v) => {
                  setApprovedShopsOnly(v);
                }}
                trackColor={{ false: colors.border, true: colors.brandSoft }}
                thumbColor={approvedShopsOnly ? colors.brandPrimary : colors.muted}
              />
            </View>
            <View style={[styles.shopPickerCard]}>
              <Pressable
                onPress={() => setShopsPanelOpen((o) => !o)}
                style={styles.shopPickerToggle}
                accessibilityRole="button"
                accessibilityState={{ expanded: shopsPanelOpen }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.catalogFilterTitle}>Shop / store</Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {shopFilter || 'All shops'}
                  </Text>
                </View>
                <Text style={styles.shopPickerChevron}>{shopsPanelOpen ? '▲' : '▼'}</Text>
              </Pressable>
              {shopsPanelOpen ? (
                <ScrollView
                  style={styles.shopPickerScroll}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                >
                  <Pressable
                    style={[styles.shopOption, !shopFilter && styles.shopOptionSelected]}
                    onPress={() => {
                      setShopFilter('');
                      setShopsPanelOpen(false);
                    }}
                  >
                    <Text style={[styles.shopOptionText, !shopFilter && styles.shopOptionTextSelected]}>All shops</Text>
                  </Pressable>
                  {approvedShopList.length === 0 ? (
                    <Text style={[styles.cardMeta, { marginTop: 10 }]}>No approved shops in the directory yet.</Text>
                  ) : (
                    approvedShopList.map((row) => {
                      const selected = shopFilter === row.shop_name;
                      return (
                        <Pressable
                          key={row.id}
                          style={[styles.shopOption, selected && styles.shopOptionSelected]}
                          onPress={() => {
                            setShopFilter(row.shop_name);
                            setShopsPanelOpen(false);
                          }}
                        >
                          <Text
                            style={[styles.shopOptionText, selected && styles.shopOptionTextSelected]}
                            numberOfLines={2}
                          >
                            {row.shop_name}
                          </Text>
                        </Pressable>
                      );
                    })
                  )}
                </ScrollView>
              ) : null}
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const img = item.images?.[0] || item.image_url;
          const rating = Number(item.rating_avg || 0);
          const inStock = item.stock == null || Number(item.stock) > 0;
          const catName = apiCategories.find((c) => c.id === item.category_id)?.name;
          const categoryLine = [catName, item.brand].filter(Boolean).join(', ') || 'Surveillance';
          const hot = isHotProduct(item);
          return (
            <View style={styles.shopProductCard}>
              <Pressable onPress={() => navigation.navigate('ProductDetail', { product: item })} style={styles.shopProductMain}>
                <View style={styles.shopProductImageWrap}>
                  {img ? (
                    <Image source={{ uri: img }} style={styles.shopProductImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.shopProductImage, styles.shopProductImagePlaceholder]}>
                      <Text style={styles.cardMeta}>No image</Text>
                    </View>
                  )}
                  {hot ? (
                    <View style={styles.hotBadge}>
                      <Text style={styles.hotBadgeText}>Hot</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.shopCategoryLine} numberOfLines={2}>
                  {categoryLine}
                </Text>
                {rating > 0 ? (
                  <Text style={styles.ratingLine}>Rated {rating.toFixed(2)} out of 5</Text>
                ) : (
                  <Text style={styles.ratingLineMuted}>New</Text>
                )}
                <Text style={[styles.stockLine, inStock ? styles.stockIn : styles.stockOut]}>
                  {inStock ? 'In stock' : 'Out of stock'}
                </Text>
                <Text style={styles.bigPrice}>{formatINR(getProductPriceForRole(item, userRole))}</Text>
              </Pressable>
              <View style={styles.shopProductActions}>
                {!inStock ? (
                  <Pressable
                    style={styles.buttonSecondary}
                    onPress={() => navigation.navigate('ProductDetail', { product: item })}
                  >
                    <Text style={styles.buttonSecondaryText}>Read more</Text>
                  </Pressable>
                ) : canAddToCart ? (
                  <Pressable
                    style={styles.button}
                    disabled={cartBusyId === item.id}
                    onPress={() => void addProductToCart(item)}
                  >
                    <Text style={styles.buttonText}>{cartBusyId === item.id ? 'Adding…' : 'Add to cart'}</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={styles.buttonSecondary}
                    onPress={() => navigation.navigate('ProductDetail', { product: item })}
                  >
                    <Text style={styles.buttonSecondaryText}>View product</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <Text style={styles.empty}>Updating catalogue…</Text>
          ) : (
            <Text style={styles.empty}>No products match this filter right now.</Text>
          )
        }
        ListFooterComponent={
          <View style={{ marginTop: 8, gap: 16 }}>
            {totalPages > 1 ? (
              <View style={styles.paginationRow}>
                <Pressable
                  style={[styles.pageNavBtn, safePage <= 1 && styles.pageNavBtnDisabled]}
                  disabled={safePage <= 1}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <Text style={styles.pageNavBtnText}>←</Text>
                </Pressable>
                {totalPages <= 7 ? (
                  Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                    <Pressable
                      key={num}
                      style={[styles.pageNumBtn, num === safePage && styles.pageNumBtnActive]}
                      onPress={() => setPage(num)}
                    >
                      <Text style={[styles.pageNumBtnText, num === safePage && styles.pageNumBtnTextActive]}>{num}</Text>
                    </Pressable>
                  ))
                ) : (
                  <Text style={styles.pageOfText}>
                    Page {safePage} of {totalPages}
                  </Text>
                )}
                <Pressable
                  style={[styles.pageNavBtn, safePage >= totalPages && styles.pageNavBtnDisabled]}
                  disabled={safePage >= totalPages}
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <Text style={styles.pageNavBtnText}>→</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        }
      />
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
      <ScrollView contentContainerStyle={styles.centerBoxScrollable} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Checkout</Text>
        <Text style={[styles.subtitle, { marginTop: 8, paddingHorizontal: 4, lineHeight: 20 }]}>
          Pay securely with PayU (UPI, cards, net banking). You will leave this screen to complete payment on PayU; when it
          finishes, you will be returned and your order will be confirmed.
        </Text>
        <Pressable style={[styles.button, { marginTop: 20 }]} onPress={startCheckout} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Creating order…' : 'Continue to PayU'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function PaymentScreen({ route, navigation }: { route: RouteProp<RootStackParamList, 'Payment'>; navigation: any }) {
  const { checkoutData } = route.params;
  const handledUrlRef = useRef<string | null>(null);

  const payuHtml = useMemo(() => {
    if (checkoutData.payment_provider !== 'payu' || !checkoutData.action || !checkoutData.fields) return '';
    return buildPayuAutoSubmitHtml(checkoutData.action, checkoutData.fields);
  }, [checkoutData]);

  const handleNavUrl = useCallback(
    (url: string) => {
      if (!url || url === 'about:blank') return;
      if (handledUrlRef.current === url) return;
      if (isCheckoutSuccessReturnUrl(url)) {
        handledUrlRef.current = url;
        Alert.alert('Payment successful', 'Your order is confirmed.');
        navigation.navigate('Main', { screen: 'Orders' });
      } else if (isCheckoutFailureReturnUrl(url)) {
        handledUrlRef.current = url;
        Alert.alert('Payment failed', 'Please try again from checkout.');
        navigation.goBack();
      }
    },
    [navigation],
  );

  if (!payuHtml) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerBox}>
          <Text style={styles.title}>Payment</Text>
          <Text style={styles.subtitle}>Invalid checkout response. Go back and try again.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { flex: 1 }]}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <Text style={styles.subtitle}>
          {formatINR(checkoutData.amount)} · PayU hosted checkout (UPI, card, net banking)
        </Text>
      </View>
      <WebView
        style={{ flex: 1 }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        source={{ html: payuHtml }}
        onNavigationStateChange={(nav) => handleNavUrl(nav.url || '')}
        onShouldStartLoadWithRequest={(req) => {
          handleNavUrl(req.url);
          return true;
        }}
      />
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
            {(subOrder.items || []).map((item: any) => (
              <Text key={String(item.id || `${item.product_id}-${item.qty}`)} style={styles.cardMeta}>
                - {String(item.product_name || 'Item')} x {Number(item.qty || item.quantity || 1)}
              </Text>
            ))}
            {(() => {
              const invs = [subOrder.customer_invoice_url, subOrder.dealer_invoice_url, subOrder.gst_invoice_url].filter(Boolean);
              if (!subOrder.tracking_url && invs.length === 0) return null;
              return (
                <View style={{ marginTop: 10, gap: 8 }}>
                  {!!subOrder.tracking_url && (
                    <Pressable
                      style={[styles.buttonSecondary, { marginTop: 0 }]}
                      onPress={() => void Linking.openURL(String(subOrder.tracking_url))}
                    >
                      <Text style={styles.buttonSecondaryText}>Track shipment</Text>
                    </Pressable>
                  )}
                  {invs.map((url: string, i: number) => (
                    <Pressable
                      key={`inv-${String(subOrder.id)}-${i}`}
                      style={[styles.buttonSecondary, { marginTop: 0 }]}
                      onPress={() => void Linking.openURL(String(url))}
                    >
                      <Text style={styles.buttonSecondaryText}>Download invoice</Text>
                    </Pressable>
                  ))}
                </View>
              );
            })()}
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
  navigation,
}: {
  user: AppUser | null;
  onLogout: () => void;
  fcmToken: string | null;
  onOpenServiceHistory?: () => void;
  navigation?: { getParent: () => { navigate?: (name: string) => void } | undefined };
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
        <PublicWebsiteLinks
          audience="signed_in"
          onOpenAbout={() => {
            if (!tryNavigateRootAbout(navigation)) void Linking.openURL(publicWebUrl('/about'));
          }}
          onOpenContact={() => {
            if (!tryNavigateRootContact(navigation)) void Linking.openURL(publicWebUrl('/contact'));
          }}
        />
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
            navigation={props.navigation}
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
    () => (props: any) => <PaymentScreen {...props} />,
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
      <ElectricianFlow token={token || ''} onLogout={logout} fcmToken={fcmToken} userRole={user?.role} />
    ),
    [token, logout, fcmToken, user?.role],
  );
  const shopPartnerFlow = useMemo(() => () => <ShopPartnerPortalScreen onLogout={logout} />, [logout]);
  const superadminHubScreen = useMemo(() => () => <SuperadminHubScreen onLogout={logout} />, [logout]);
  const superadminFlow = useMemo(
    () =>
      function SuperadminFlowNavigator() {
        return (
          <SuperadminStack.Navigator screenOptions={stackScreenOptions}>
            <SuperadminStack.Screen
              name="SuperadminHub"
              component={superadminHubScreen}
              options={{ title: 'Platform admin' }}
            />
          </SuperadminStack.Navigator>
        );
      },
    [superadminHubScreen],
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
            <RootStack.Screen name="OtpSignIn" options={{ title: 'Sign in' }}>
              {(props) => <OtpSignInScreen {...props} onLoggedIn={handleLoggedIn} />}
            </RootStack.Screen>
            <RootStack.Screen name="Register" options={{ title: 'Register' }}>
              {(props) => <RegisterScreen {...props} onLoggedIn={handleLoggedIn} />}
            </RootStack.Screen>
            <RootStack.Screen name="AdminSignIn" options={{ title: 'Platform admin' }}>
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
                user?.role === 'electrician' || user?.role === 'electrician_pending' || user?.role === 'electrician_rejected'
                  ? electricianFlow
                  : user?.role === 'admin'
                  ? shopPartnerFlow
                  : user?.role === 'superadmin'
                  ? superadminFlow
                  : mainTabs
              }
              options={{ headerShown: false }}
            />
            {user?.role !== 'electrician' && user?.role !== 'electrician_pending' && user?.role !== 'electrician_rejected' && user?.role !== 'admin' && user?.role !== 'superadmin' && (
              <>
                <RootStack.Screen name="ProductDetail" component={productDetailScreen} options={{ title: 'Product Detail' }} />
                <RootStack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout' }} />
                <RootStack.Screen name="Payment" component={paymentScreen} options={{ title: 'Pay with PayU' }} />
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
        <RootStack.Screen name="Blog" component={BlogListScreen} options={{ title: 'Blog' }} />
        <RootStack.Screen name="BlogPost" component={BlogPostScreen} options={{ title: 'Article' }} />
        <RootStack.Screen name="About" component={AboutScreen} options={{ title: 'About us' }} />
        <RootStack.Screen name="Contact" component={ContactScreen} options={{ title: 'Contact' }} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <View style={{ flex: 1 }}>
          <AppShell />
          <FloatingWhatsAppFab />
        </View>
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
  catalogFilterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  shopPickerCard: {
    marginBottom: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  shopPickerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  shopPickerChevron: { fontSize: 12, color: colors.textSecondary, width: 22, textAlign: 'center' },
  shopPickerScroll: { maxHeight: 220, marginTop: 10 },
  shopOption: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.softPanel,
  },
  shopOptionSelected: {
    borderColor: colors.brandPrimary,
    backgroundColor: colors.brandSoft,
  },
  shopOptionText: { fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  shopOptionTextSelected: { fontWeight: '700', color: colors.brandPrimary },
  catalogFilterTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  homeHeroSlideBg: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'flex-end',
  },
  homeHeroSlideImage: { borderRadius: 16 },
  homeHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderRadius: 16,
  },
  homeHeroTextBlock: { padding: 14, paddingBottom: 16, gap: 4 },
  homeHeroKicker: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.88)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  homeHeroTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  homeHeroSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 17,
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  homeHeroCtaRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 8 },
  homeHeroCtaText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  homeHeroDots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 10 },
  homeHeroDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  homeHeroDotActive: { backgroundColor: colors.brandPrimary, width: 22 },
  homePromoStripKicker: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: colors.brandPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: 12,
  },
  homePromoStripList: { gap: 10 },
  homePromoStripCard: {
    height: 152,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'flex-end',
  },
  homePromoStripOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderRadius: 16,
  },
  homePromoStripTextWrap: { padding: 14, zIndex: 1 },
  homePromoStripTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  homePromoStripBuyRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  homePromoStripBuyText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  collectionBand: {
    marginTop: 6,
    paddingTop: 18,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 16,
  },
  collectionBandRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 18,
  },
  collectionCopy: {
    flexShrink: 0,
  },
  collectionCopyRow: {
    flex: 1,
    minWidth: 0,
    maxWidth: 340,
    justifyContent: 'center',
  },
  collectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 10,
    textAlign: 'center',
  },
  collectionTitleRow: { textAlign: 'left' },
  collectionBody: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  collectionBodyRow: { textAlign: 'left' },
  collectionCta: {
    marginTop: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brandPrimary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  collectionCtaRow: { alignSelf: 'flex-start' },
  collectionCtaText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  collectionCards: {
    gap: 10,
  },
  collectionCardsRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    gap: 10,
  },
  collectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  collectionCardRow: {
    flex: 1,
    minWidth: 0,
  },
  collectionCardImageArea: {
    height: 100,
    backgroundColor: colors.softPanel,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  collectionCardInner: { padding: 12, gap: 4 },
  collectionCardCat: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  collectionCardName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginTop: 2 },
  collectionCardPrice: { fontSize: 17, fontWeight: '800', color: colors.textPrimary, marginTop: 6 },
  collectionCardStock: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  homeHowSiteBand: {
    marginTop: 12,
    paddingTop: 20,
    paddingBottom: 2,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 14,
  },
  homeHowSiteHeader: { alignItems: 'center', paddingHorizontal: 4 },
  homeHowSiteKicker: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brandPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 10,
  },
  homeHowSiteTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  homeHowSiteIntro: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 400,
    alignSelf: 'center',
  },
  homeHowSiteCards: { gap: 10, marginTop: 4 },
  homeHowSiteCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
  },
  homeHowSiteCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  homeHowSiteCardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.softPanel,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  homeHowSiteCardKicker: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 4,
  },
  homeHowSiteCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 8,
  },
  homeHowSiteCardBody: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  homeHowSiteCardBodyStrong: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  customQuoteOuter: { marginTop: 14, marginBottom: 6 },
  customQuoteClip: {
    minHeight: 252,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customQuoteOverlay: {
    backgroundColor: 'rgba(26,26,46,0.82)',
    zIndex: 1,
  },
  customQuoteInner: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
  },
  customQuoteTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  customQuoteBody: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  customQuoteCta: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brandPrimary,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  customQuoteCtaText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  homeMarketingHero: {
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 4,
  },
  homeMarketingKicker: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brandPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  homeMarketingPhone: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 6,
    textDecorationLine: 'underline',
  },
  homeMarketingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 12,
    letterSpacing: -0.3,
  },
  homeMarketingBody: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
    lineHeight: 20,
  },
  homeMarketingActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  homeMarketingBtnPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.brandPrimary,
  },
  homeMarketingBtnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  homeMarketingBtnSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.softPanel,
  },
  homeMarketingBtnSecondaryText: { color: colors.textPrimary, fontWeight: '700', fontSize: 13 },
  categorySection: { marginBottom: 2 },
  categorySectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  categorySectionTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.3 },
  categorySectionSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 16 },
  categorySeeAll: { fontSize: 14, fontWeight: '700', color: colors.brandPrimary, paddingTop: 2 },
  categoryScrollInner: { flexDirection: 'row', gap: 10, paddingBottom: 4, paddingRight: 4 },
  categoryTile: {
    width: 108,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  categoryTileActive: {
    borderColor: colors.brandPrimary,
    borderWidth: 2,
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  categoryTileArt: {
    height: 78,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  categoryTileLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    lineHeight: 14,
    minHeight: 40,
  },
  categoryClearChip: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.brandPrimary,
  },
  categoryClearChipText: { fontSize: 13, fontWeight: '700', color: colors.brandPrimary },
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
  ctaOutline: {
    width: '100%',
    borderWidth: 2,
    borderColor: colors.brandPrimary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  ctaOutlineText: { color: colors.brandPrimary, fontWeight: '700', fontSize: 15 },
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
  shopPageTitleBlock: { marginBottom: 2, paddingBottom: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  shopBrandMark: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brandPrimary,
    letterSpacing: 2.8,
    textTransform: 'uppercase',
  },
  shopHeading: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginTop: 6, letterSpacing: -0.3 },
  categoryCountScroll: { maxHeight: 200, marginTop: 10 },
  catCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.softPanel,
  },
  catCountRowActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandSoft },
  catCountName: { flex: 1, fontSize: 14, color: colors.textPrimary, fontWeight: '600', marginRight: 8 },
  catCountNum: { fontSize: 12, color: colors.muted, fontVariant: ['tabular-nums'] },
  priceRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  priceMicroLabel: { fontSize: 11, color: colors.muted, marginBottom: 4 },
  priceBandText: { fontSize: 11, color: colors.muted, marginTop: 8 },
  resultsBar: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.softPanel,
  },
  resultsBarText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  resultsBarStrong: { fontWeight: '700', color: colors.textPrimary },
  resultsBarMuted: { color: colors.muted, fontSize: 12 },
  chipRowLabel: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sizeChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sizeChipActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandSoft },
  sizeChipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  sizeChipTextActive: { color: colors.brandPrimary },
  shopProductCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  shopProductMain: { padding: 14, gap: 6 },
  shopProductImageWrap: { position: 'relative', width: '100%', aspectRatio: 4 / 3, borderRadius: 10, overflow: 'hidden', marginBottom: 8, backgroundColor: colors.softPanel },
  shopProductImage: { width: '100%', height: '100%' },
  shopProductImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  hotBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  hotBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  shopCategoryLine: { fontSize: 13, color: colors.textSecondary },
  ratingLine: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  ratingLineMuted: { fontSize: 12, color: colors.muted, marginTop: 2 },
  stockLine: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  stockIn: { color: colors.serviceSuccess },
  stockOut: { color: colors.pending },
  shopProductActions: { paddingHorizontal: 14, paddingBottom: 14 },
  paginationRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8 },
  pageNavBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pageNavBtnDisabled: { opacity: 0.35 },
  pageNavBtnText: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  pageNumBtn: {
    minWidth: 40,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  pageNumBtnActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandSoft },
  pageNumBtnText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  pageNumBtnTextActive: { color: colors.brandPrimary },
  pageOfText: { fontSize: 13, color: colors.muted, paddingHorizontal: 8 },
});
