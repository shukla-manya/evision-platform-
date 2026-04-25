import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { setApiTokenGetter } from './src/services/api';
import { clearSession, getToken } from './src/services/storage';
import { AuthNavigator, MainNavigator } from './src/navigation/AppNavigator';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const stored = await getToken();
      setToken(stored);
      setBooting(false);
    };
    void bootstrap();
  }, []);

  useEffect(() => {
    setApiTokenGetter(() => token);
  }, [token]);

  const onLoggedIn = (nextToken: string) => {
    setToken(nextToken);
  };

  const onLogout = async () => {
    await clearSession();
    setToken(null);
  };

  if (booting) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {token ? (
        <MainNavigator token={token} onLogout={onLogout} />
      ) : (
        <AuthNavigator onLoggedIn={onLoggedIn} />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
});
