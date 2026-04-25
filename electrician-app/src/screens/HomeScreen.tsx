import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AxiosError } from 'axios';
import { bookingsApi, profileApi, Booking } from '../services/api';

function apiError(err: unknown, fallback: string) {
  const e = err as AxiosError<{ message?: string | string[] }>;
  const msg = e?.response?.data?.message;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.join(', ');
  return fallback;
}

function timeUntilExpiry(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

type Props = { navigation: any; online: boolean; onToggleOnline: (val: boolean) => void };

export default function HomeScreen({ navigation, online, onToggleOnline }: Props) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await bookingsApi.pending();
      setBookings(data || []);
    } catch (err) {
      Alert.alert('Error', apiError(err, 'Failed to load bookings.'));
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
    } catch (err) {
      Alert.alert('Error', apiError(err, 'Failed to update availability.'));
    } finally {
      setToggling(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      {/* Online/Offline header */}
      <View style={styles.statusBar}>
        <View style={styles.statusLeft}>
          <View style={[styles.dot, online ? styles.dotOnline : styles.dotOffline]} />
          <Text style={styles.statusText}>{online ? 'Online' : 'Offline'}</Text>
        </View>
        <Switch
          value={online}
          onValueChange={toggleOnline}
          disabled={toggling}
          thumbColor={online ? '#22c55e' : '#94a3b8'}
          trackColor={{ true: '#166534', false: '#1e3a5f' }}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#3b82f6" />
          <Text style={styles.loadingText}>Loading bookings…</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          onRefresh={load}
          refreshing={loading}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>No pending bookings</Text>
              <Text style={styles.emptySubtext}>Pull to refresh</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate('BookingDetail', { booking: item })}
            >
              <View style={styles.cardHeader}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>PENDING</Text>
                </View>
                <Text style={styles.expiry}>⏱ {timeUntilExpiry(item.expires_at)}</Text>
              </View>
              <Text style={styles.cardId}>Booking #{item.id.slice(-8).toUpperCase()}</Text>
              <Text style={styles.cardMeta}>Request ID: {item.request_id.slice(-8)}</Text>
              <Text style={styles.cardDate}>
                {new Date(item.created_at).toLocaleString()}
              </Text>
              <View style={styles.cardActions}>
                <Pressable
                  style={styles.viewBtn}
                  onPress={() => navigation.navigate('BookingDetail', { booking: item })}
                >
                  <Text style={styles.viewBtnText}>View Details →</Text>
                </Pressable>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050b1a' },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0d1626',
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotOnline: { backgroundColor: '#22c55e' },
  dotOffline: { backgroundColor: '#64748b' },
  statusText: { color: '#e2e8f0', fontWeight: '600', fontSize: 15 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingText: { color: '#64748b', fontSize: 14 },
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: '#94a3b8', fontSize: 18, fontWeight: '600' },
  emptySubtext: { color: '#475569', fontSize: 13 },
  card: {
    backgroundColor: '#0d1626',
    borderRadius: 14,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: {
    backgroundColor: '#1e3a5f',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { color: '#3b82f6', fontSize: 11, fontWeight: '700' },
  expiry: { color: '#f59e0b', fontSize: 12, fontWeight: '600' },
  cardId: { color: '#e2e8f0', fontWeight: '700', fontSize: 16 },
  cardMeta: { color: '#64748b', fontSize: 13 },
  cardDate: { color: '#475569', fontSize: 12 },
  cardActions: { marginTop: 4 },
  viewBtn: {
    backgroundColor: '#1e3a5f',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewBtnText: { color: '#3b82f6', fontWeight: '600', fontSize: 14 },
});
