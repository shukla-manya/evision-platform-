import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { AxiosError } from 'axios';
import { bookingsApi, Booking, profileApi } from '../services/api';
import { colors } from '../theme/colors';
import { statusColor } from '../theme/status';

function apiError(err: unknown, fallback: string) {
  const e = err as AxiosError<{ message?: string | string[] }>;
  const msg = e?.response?.data?.message;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.join(', ');
  return fallback;
}

type Props = { navigation: any };

export default function HomeScreen({ navigation }: Props) {
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [online, setOnline] = useState(true);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [{ data: pending }, { data: me }] = await Promise.all([
        bookingsApi.pending(),
        profileApi.me(),
      ]);
      setPendingBookings(pending || []);
      setOnline(Boolean(me?.available));
    } catch (err) {
      Alert.alert('Error', apiError(err, 'Failed to load dashboard.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onToggleAvailability = async (value: boolean) => {
    try {
      setOnline(value);
      await profileApi.setAvailability(value);
    } catch (err) {
      setOnline((prev) => !prev);
      Alert.alert('Error', apiError(err, 'Unable to update availability.'));
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Available for jobs</Text>
          <Switch value={online} onValueChange={onToggleAvailability} />
        </View>
        <Text style={styles.meta}>
          Toggle online/offline to control whether new bookings are assigned.
        </Text>
      </View>

      <View style={styles.row}>
        <Pressable style={styles.quickBtn} onPress={() => navigation.navigate('ActiveJob')}>
          <Text style={styles.quickBtnText}>Active Job</Text>
        </Pressable>
        <Pressable style={styles.quickBtn} onPress={() => navigation.navigate('Earnings')}>
          <Text style={styles.quickBtnText}>Earnings</Text>
        </Pressable>
        <Pressable style={styles.quickBtn} onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.quickBtnText}>Profile</Text>
        </Pressable>
      </View>

      <Text style={styles.heading}>Pending Bookings</Text>
      {loading ? (
        <Text style={styles.meta}>Loading...</Text>
      ) : (
        <FlatList
          data={pendingBookings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate('BookingDetail', { booking: item })}
            >
              <Text style={styles.cardTitle}>Booking #{item.id.slice(0, 8)}</Text>
              <Text style={styles.meta}>
                Status:{' '}
                <Text style={{ color: statusColor(item.status), fontWeight: '700' }}>{item.status}</Text>
              </Text>
              <Text style={styles.meta}>Created: {new Date(item.created_at).toLocaleString()}</Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.meta}>No pending bookings.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  heading: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 6,
  },
  cardTitle: { fontWeight: '700', color: colors.textPrimary, fontSize: 15 },
  meta: { color: colors.textSecondary, fontSize: 13 },
  quickBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  quickBtnText: { color: colors.textPrimary, fontWeight: '600' },
});
