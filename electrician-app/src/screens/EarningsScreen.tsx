import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AxiosError } from 'axios';
import { Booking, bookingsApi } from '../services/api';
import { colors } from '../theme/colors';

function apiError(err: unknown, fallback: string) {
  const e = err as AxiosError<{ message?: string | string[] }>;
  const msg = e?.response?.data?.message;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.join(', ');
  return fallback;
}

export default function EarningsScreen() {
  const [history, setHistory] = useState<Booking[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await bookingsApi.history();
        setHistory(data || []);
      } catch (err) {
        Alert.alert('Error', apiError(err, 'Failed to load history.'));
      }
    };
    void load();
  }, []);

  const estimatedEarnings = useMemo(() => history.length * 500, [history]);

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Earnings & History</Text>
        <Text style={styles.meta}>Completed Jobs: {history.length}</Text>
        <Text style={styles.meta}>Estimated Earnings: Rs. {estimatedEarnings}</Text>
      </View>

      {history.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.title}>Booking #{item.id.slice(0, 8)}</Text>
          <Text style={styles.meta}>Updated: {new Date(item.updated_at).toLocaleString()}</Text>
          <Text style={styles.meta}>Job Status: {item.job_status || '-'}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: 14 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 6,
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  meta: { color: colors.textSecondary, fontSize: 13 },
});
