import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { AxiosError } from 'axios';
import { Electrician, electricianAuthApi } from '../services/api';

function apiError(err: unknown, fallback: string) {
  const e = err as AxiosError<{ message?: string | string[] }>;
  const msg = e?.response?.data?.message;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.join(', ');
  return fallback;
}

type Props = { onLogout: () => void };

export default function ProfileScreen({ onLogout }: Props) {
  const [profile, setProfile] = useState<Electrician | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const { data } = await electricianAuthApi.me();
      setProfile(data);
    } catch (err) {
      Alert.alert('Error', apiError(err, 'Could not load profile.'));
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>{profile?.name || 'Electrician Profile'}</Text>
        <Text style={styles.meta}>Email: {profile?.email || '-'}</Text>
        <Text style={styles.meta}>Phone: {profile?.phone || '-'}</Text>
        <Text style={styles.meta}>Rating: {profile?.rating_avg ?? 0} ({profile?.rating_count ?? 0})</Text>
        <Text style={styles.meta}>Status: {profile?.status || '-'}</Text>
      </View>

      <Pressable style={styles.secondaryButton} onPress={() => void loadProfile()}>
        <Text style={styles.secondaryText}>Refresh</Text>
      </Pressable>
      <Pressable style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc', padding: 14 },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 6,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  meta: { color: '#475569', fontSize: 13 },
  secondaryButton: {
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  secondaryText: { color: '#0f172a', fontWeight: '700' },
  logoutButton: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutText: { color: '#fff', fontWeight: '700' },
});
