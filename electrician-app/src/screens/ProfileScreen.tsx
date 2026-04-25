import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AxiosError } from 'axios';
import { electricianAuthApi, profileApi, Electrician } from '../services/api';
import { clearToken } from '../services/storage';
import { disconnectSocket } from '../services/socket';

function apiError(err: unknown, fallback: string) {
  const e = err as AxiosError<{ message?: string | string[] }>;
  const msg = e?.response?.data?.message;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.join(', ');
  return fallback;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={{ fontSize: 18, color: i <= Math.round(rating) ? '#f59e0b' : '#1e3a5f' }}>
          ★
        </Text>
      ))}
    </View>
  );
}

type Props = { onLogout: () => void; online: boolean; onToggleOnline: (val: boolean) => void };

export default function ProfileScreen({ onLogout, online, onToggleOnline }: Props) {
  const [profile, setProfile] = useState<Electrician | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await electricianAuthApi.me();
      setProfile(data);
    } catch (err) {
      Alert.alert('Error', apiError(err, 'Failed to load profile.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const toggleOnline = async (val: boolean) => {
    try {
      setToggling(true);
      await profileApi.setAvailability(val);
      onToggleOnline(val);
      setProfile((p) => p ? { ...p, available: val } : p);
    } catch (err) {
      Alert.alert('Error', apiError(err, 'Failed to update availability.'));
    } finally {
      setToggling(false);
    }
  };

  const logout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          disconnectSocket();
          await clearToken();
          onLogout();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <ActivityIndicator color="#3b82f6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.name ? profile.name.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
          <Text style={styles.name}>{profile?.name || '—'}</Text>
          <View style={[styles.statusChip, online ? styles.chipOnline : styles.chipOffline]}>
            <Text style={[styles.statusChipText, online ? styles.chipTextOnline : styles.chipTextOffline]}>
              {online ? '● Online' : '○ Offline'}
            </Text>
          </View>
        </View>

        {/* Rating */}
        {profile && (
          <View style={styles.ratingCard}>
            <StarRating rating={profile.rating_avg} />
            <Text style={styles.ratingText}>
              {Number(profile.rating_avg).toFixed(1)} / 5.0
            </Text>
            <Text style={styles.ratingCount}>
              {profile.total_reviews ?? profile.rating_count ?? 0} reviews
            </Text>
          </View>
        )}

        {/* Info card */}
        <View style={styles.card}>
          {[
            { label: 'Email', value: profile?.email },
            { label: 'Phone', value: profile?.phone },
            { label: 'Address', value: profile?.address },
            {
              label: 'Skills',
              value: Array.isArray(profile?.skills) ? profile.skills.join(', ') : '—',
            },
          ].map(({ label, value }) => (
            <View key={label} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={styles.infoValue}>{value || '—'}</Text>
            </View>
          ))}
        </View>

        {/* Online toggle */}
        <View style={styles.toggleCard}>
          <View>
            <Text style={styles.toggleLabel}>Availability</Text>
            <Text style={styles.toggleSubLabel}>
              {online ? 'Clients can book you' : 'You are hidden from clients'}
            </Text>
          </View>
          <Switch
            value={online}
            onValueChange={toggleOnline}
            disabled={toggling}
            thumbColor={online ? '#22c55e' : '#94a3b8'}
            trackColor={{ true: '#166534', false: '#1e3a5f' }}
          />
        </View>

        <Pressable style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050b1a' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 24, gap: 16, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', gap: 10, paddingVertical: 16 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  avatarText: { color: '#3b82f6', fontSize: 36, fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '700', color: '#e2e8f0' },
  statusChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  chipOnline: { backgroundColor: '#052e16' },
  chipOffline: { backgroundColor: '#1e293b' },
  statusChipText: { fontSize: 13, fontWeight: '600' },
  chipTextOnline: { color: '#22c55e' },
  chipTextOffline: { color: '#64748b' },
  ratingCard: {
    backgroundColor: '#0d1626',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  ratingText: { color: '#f59e0b', fontWeight: '700', fontSize: 22 },
  ratingCount: { color: '#64748b', fontSize: 13 },
  card: {
    backgroundColor: '#0d1626',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  infoLabel: { color: '#64748b', fontSize: 13, flex: 1 },
  infoValue: { color: '#e2e8f0', fontSize: 13, fontWeight: '600', flex: 2, textAlign: 'right' },
  toggleCard: {
    backgroundColor: '#0d1626',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  toggleLabel: { color: '#e2e8f0', fontSize: 15, fontWeight: '600' },
  toggleSubLabel: { color: '#64748b', fontSize: 12, marginTop: 2 },
  logoutBtn: {
    backgroundColor: '#1c0a0a',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dc2626',
    marginTop: 8,
  },
  logoutBtnText: { color: '#dc2626', fontWeight: '700', fontSize: 16 },
});
