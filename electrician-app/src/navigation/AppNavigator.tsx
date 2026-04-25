import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import BookingDetailScreen from '../screens/BookingDetailScreen';
import ActiveJobScreen from '../screens/ActiveJobScreen';
import UploadPhotoScreen from '../screens/UploadPhotoScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EarningsScreen from '../screens/EarningsScreen';
import { Booking } from '../services/api';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  BookingDetail: { booking: Booking };
  ActiveJob: undefined;
  UploadPhoto: { bookingId: string };
  Profile: undefined;
  Earnings: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

export function AuthNavigator({
  onLoggedIn,
}: {
  onLoggedIn: (token: string) => void;
}) {
  return (
    <AuthStack.Navigator initialRouteName="Login">
      <AuthStack.Screen name="Login">
        {(props) => <LoginScreen {...props} onLoggedIn={onLoggedIn} />}
      </AuthStack.Screen>
      <AuthStack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: 'Electrician Register' }}
      />
    </AuthStack.Navigator>
  );
}

export function MainNavigator({
  token,
  onLogout,
}: {
  token: string;
  onLogout: () => void;
}) {
  return (
    <AppStack.Navigator>
      <AppStack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Electrician Home' }}
      />
      <AppStack.Screen
        name="BookingDetail"
        component={BookingDetailScreen}
        options={{ title: 'Booking Detail' }}
      />
      <AppStack.Screen name="ActiveJob">
        {(props) => <ActiveJobScreen {...props} token={token} />}
      </AppStack.Screen>
      <AppStack.Screen
        name="UploadPhoto"
        component={UploadPhotoScreen}
        options={{ title: 'Upload Job Photo' }}
      />
      <AppStack.Screen name="Profile">
        {() => <ProfileScreen onLogout={onLogout} />}
      </AppStack.Screen>
      <AppStack.Screen name="Earnings" component={EarningsScreen} />
    </AppStack.Navigator>
  );
}
