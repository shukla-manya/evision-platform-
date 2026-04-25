import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Buffer } from 'buffer';

import { setApiTokenGetter } from './src/services/api';
import { getToken, clearToken } from './src/services/storage';
import { connectSocket, disconnectSocket } from './src/services/socket';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import BookingDetailScreen from './src/screens/BookingDetailScreen';
import ActiveJobScreen from './src/screens/ActiveJobScreen';
import UploadPhotoScreen from './src/screens/UploadPhotoScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import EarningsScreen from './src/screens/EarningsScreen';

// ── Navigation types ──────────────────────────────────────────────────────

type AuthStackParams = {
  Login: undefined;
  Register: undefined;
};

type HomeStackParams = {
  HomeList: undefined;
  BookingDetail: { booking: any };
  UploadPhoto: { bookingId: string };
};

type ActiveStackParams = {
  ActiveJob: undefined;
  UploadPhoto: { bookingId: string };
};

type MainTabParams = {
  HomeTab: undefined;
  ActiveJobTab: undefined;
  Earnings: undefined;
  Profile: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParams>();
const HomeStack = createNativeStackNavigator<HomeStackParams>();
const ActiveStack = createNativeStackNavigator<ActiveStackParams>();
const Tab = createBottomTabNavigator<MainTabParams>();

// ── Helpers ────────────────────────────────────────────────────────────────

function parseJwt(token: string): Record<string, any> | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    return JSON.parse(Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

// ── Home stack ─────────────────────────────────────────────────────────────

function HomeStackNavigator({ online, onToggleOnline }: { online: boolean; onToggleOnline: (v: boolean) => void }) {
  return (
    <HomeStack.Navigator screenOptions={screenOpts}>
      <HomeStack.Screen name="HomeList" options={{ title: 'Bookings' }}>
        {(props) => <HomeScreen {...props} online={online} onToggleOnline={onToggleOnline} />}
      </HomeStack.Screen>
      <HomeStack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: 'Booking Details' }} />
      <HomeStack.Screen name="UploadPhoto" component={UploadPhotoScreen} options={{ title: 'Upload Photo' }} />
    </HomeStack.Navigator>
  );
}

// ── Active Job stack ────────────────────────────────────────────────────────

function ActiveStackNavigator() {
  return (
    <ActiveStack.Navigator screenOptions={screenOpts}>
      <ActiveStack.Screen name="ActiveJob" component={ActiveJobScreen} options={{ title: 'Active Job' }} />
      <ActiveStack.Screen name="UploadPhoto" component={UploadPhotoScreen} options={{ title: 'Upload Photo' }} />
    </ActiveStack.Navigator>
  );
}

// ── Main tabs ──────────────────────────────────────────────────────────────

function MainTabs({
  online,
  onToggleOnline,
  onLogout,
}: {
  online: boolean;
  onToggleOnline: (v: boolean) => void;
  onLogout: () => void;
}) {
  const HomeTabComp = () => (
    <HomeStackNavigator online={online} onToggleOnline={onToggleOnline} />
  );
  const ProfileComp = () => (
    <ProfileScreen onLogout={onLogout} online={online} onToggleOnline={onToggleOnline} />
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: tabBarStyle,
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#475569',
        tabBarLabel: tabLabels[route.name as keyof typeof tabLabels] || route.name,
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeTabComp}
        options={{ tabBarIcon: ({ color }) => <TabIcon emoji="📋" color={color} />, title: 'Bookings' }}
      />
      <Tab.Screen
        name="ActiveJobTab"
        component={ActiveStackNavigator}
        options={{ tabBarIcon: ({ color }) => <TabIcon emoji="🔧" color={color} />, title: 'Active Job' }}
      />
      <Tab.Screen
        name="Earnings"
        component={EarningsScreen}
        options={{ headerShown: true, ...screenOpts, tabBarIcon: ({ color }) => <TabIcon emoji="📊" color={color} />, title: 'History' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileComp}
        options={{ tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} />, title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

const tabLabels = { HomeTab: 'Bookings', ActiveJobTab: 'Active Job', Earnings: 'History', Profile: 'Profile' };

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return <View style={{ opacity: color === '#3b82f6' ? 1 : 0.5 }}><View><View><View><View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}><View style={{ alignItems: 'center' }}>{/* emoji tab icon via text */}</View></View></View></View></View></View>;
  // Note: react-native doesn't natively render emoji in tab icons — use a text component wrapped in a View
}

// ── Auth screens ───────────────────────────────────────────────────────────

function AuthNavigator({ onLoggedIn }: { onLoggedIn: (token: string) => void }) {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login">
        {(props) => <LoginScreen {...props} onLoggedIn={onLoggedIn} />}
      </AuthStack.Screen>
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

// ── Root app ───────────────────────────────────────────────────────────────

export default function App() {
  const [hydrating, setHydrating] = useState(true);
  const [token, setToken_] = useState<string | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setApiTokenGetter(() => token);
  }, [token]);

  // Hydrate from storage
  useEffect(() => {
    getToken().then((stored) => {
      if (stored && parseJwt(stored)?.role === 'electrician') {
        setToken_(stored);
      }
      setHydrating(false);
    });
  }, []);

  // Connect/disconnect socket with auth
  useEffect(() => {
    if (token) {
      connectSocket(token);
    } else {
      disconnectSocket();
    }
    return () => {
      if (!token) disconnectSocket();
    };
  }, [token]);

  const handleLoggedIn = (newToken: string) => {
    setToken_(newToken);
  };

  const handleLogout = async () => {
    await clearToken();
    setToken_(null);
  };

  if (hydrating) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color="#3b82f6" size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      {token ? (
        <MainTabs
          online={online}
          onToggleOnline={setOnline}
          onLogout={handleLogout}
        />
      ) : (
        <AuthNavigator onLoggedIn={handleLoggedIn} />
      )}
    </NavigationContainer>
  );
}

// ── Shared style constants ─────────────────────────────────────────────────

const screenOpts = {
  headerStyle: { backgroundColor: '#0d1626' },
  headerTintColor: '#e2e8f0',
  headerTitleStyle: { fontWeight: '700' as const },
};

const tabBarStyle = {
  backgroundColor: '#0d1626',
  borderTopColor: '#1e3a5f',
  borderTopWidth: 1,
  paddingBottom: 4,
  height: 60,
};

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: '#050b1a', alignItems: 'center', justifyContent: 'center' },
});
