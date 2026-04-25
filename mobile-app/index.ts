import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import messaging from '@react-native-firebase/messaging';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
messaging().setBackgroundMessageHandler(async () => {
  // Keep handler registered so background notifications can be processed.
});

registerRootComponent(App);
