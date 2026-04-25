import { Alert, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function setupPushNotifications(): Promise<string | null> {
  try {
    if (Platform.OS === 'ios') {
      await messaging().registerDeviceForRemoteMessages();
    }

    await messaging().requestPermission();
    const token = await messaging().getToken();

    messaging().onMessage(async (remoteMessage) => {
      const title = remoteMessage.notification?.title || 'New update';
      const body = remoteMessage.notification?.body || 'You have a new notification.';
      Alert.alert(title, body);
    });

    return token;
  } catch (error) {
    console.warn('Push setup failed:', error);
    return null;
  }
}

export function subscribeToPushTokenRefresh(onRefresh: (token: string) => void) {
  return messaging().onTokenRefresh((token) => {
    onRefresh(token);
  });
}
