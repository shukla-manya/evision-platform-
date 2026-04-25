import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AxiosError } from 'axios';
import { bookingsApi, Booking } from '../services/api';

function apiError(err: unknown, fallback: string) {
  const e = err as AxiosError<{ message?: string | string[] }>;
  const msg = e?.response?.data?.message;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.join(', ');
  return fallback;
}

export default function EarningsScreen() {
  const [history, setHistory] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await bookingsApi.history();
      setHistory(data || []);
    } catch (err) {
      Alert.alert('Error', apiError(err, 'Failed to load history.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <SafeAreaView style={styles.screen}>
      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{history.length}</Text>
          <Text style={styles.summaryLabel}>Jobs Done</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {history.filter((b) => {
              const d = new Date(b.updated_at);
              const now = new Date();
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length}
          </Text>
          <Text style={styles.summaryLabel}>This Month</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {history.filter((b) => {
              const d = new Date(b.updated_at);
              const now = new Date();
              return d.getFullYear() === now.getFullYear();
            }).length}
          </Text>
          <Text style={styles.summaryLabel}>This Year</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#3b82f6" />
          <Text style={styles.loadingText}>Loading history…</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          onRefresh={load}
          refreshing={loading}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No completed jobs yet</Text>
              <Text style={styles.emptySubtext}>Jobs you complete will appear here</Text>
            </View>
          }
          renderItem={({ item }) => <HistoryCard booking={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function HistoryCard({ booking }: { booking: Booking }) {
  const completedAt = booking.updated_at
    ? new Date(booking.updated_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.completedBadge}>
          <Text style={styles.completedBadgeText}>✓ COMPLETED</Text>
        </View>
        <Text style={styles.cardDate}>{completedAt}</Text>
      </View>
      <Text style={styles.cardId}>#{booking.id.slice(-10).toUpperCase()}</Text>
      <Text style={styles.cardMeta}>Customer: {booking.customer_id.slice(-8).toUpperCase()}</Text>
      {booking.job_photo_url ? (
        <Text style={styles.hasPhoto}>📷 Photo attached</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050b1a' },
  summary: {
    flexDirection: 'row',
    backgroundColor: '#0d1626',
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
    paddingVertical: 16,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryValue: { fontSize: 26, fontWeight: '800', color: '#3b82f6' },
  summaryLabel: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  summaryDivider: { width: 1, backgroundColor: '#1e3a5f', marginVertical: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingText: { color: '#64748b', fontSize: 14 },
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
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
  completedBadge: {
    backgroundColor: '#052e16',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#166534',
  },
  completedBadgeText: { color: '#22c55e', fontSize: 10, fontWeight: '700' },
  cardDate: { color: '#475569', fontSize: 12 },
  cardId: { color: '#e2e8f0', fontWeight: '700', fontSize: 15 },
  cardMeta: { color: '#64748b', fontSize: 13 },
  hasPhoto: { color: '#64748b', fontSize: 12 },
});
