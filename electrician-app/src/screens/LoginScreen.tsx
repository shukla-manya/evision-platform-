import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AxiosError } from 'axios';
import { electricianAuthApi } from '../services/api';
import { setToken } from '../services/storage';
import { colors } from '../theme/colors';

function apiError(err: unknown, fallback: string) {
  const e = err as AxiosError<{ message?: string | string[] }>;
  const msg = e?.response?.data?.message;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.join(', ');
  return fallback;
}

type Props = { onLoggedIn: (token: string) => void; navigation: any };

export default function LoginScreen({ onLoggedIn, navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Email and password are required.');
      return;
    }
    try {
      setLoading(true);
      const { data } = await electricianAuthApi.login(email.trim().toLowerCase(), password);
      await setToken(data.access_token);
      onLoggedIn(data.access_token);
    } catch (err) {
      Alert.alert('Login failed', apiError(err, 'Invalid email or password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.brand}>⚡ E Vision</Text>
          <Text style={styles.title}>Electrician Portal</Text>
          <Text style={styles.subtitle}>Sign in to manage your jobs</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="ravi@example.com"
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={colors.muted}
          />

          <Pressable style={[styles.btn, loading && styles.btnDisabled]} onPress={submit} disabled={loading}>
            <Text style={styles.btnText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
          </Pressable>

          <Pressable style={styles.link} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.linkText}>New electrician? Register here →</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 20 },
  header: { alignItems: 'center', gap: 6 },
  brand: { fontSize: 28, fontWeight: '800', color: colors.brandPrimary },
  title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 14, color: colors.textSecondary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  input: {
    backgroundColor: colors.softPanel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 15,
  },
  btn: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: colors.surface, fontWeight: '700', fontSize: 16 },
  link: { alignItems: 'center', marginTop: 4 },
  linkText: { color: colors.cta, fontSize: 14 },
});
