import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { AxiosError } from 'axios';
import { bookingsApi, Booking } from '../services/api';

function apiError(err: unknown, fallback: string) {
  const e = err as AxiosError<{ message?: string | string[] }>;
  const msg = e?.response?.data?.message;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.join(', ');
  return fallback;
}

type Props = { route: { params: { booking: Booking } }; navigation: any };

export default function BookingDetailScreen({ route, navigation }: Props) {
  const booking = route.params.booking;

  const respond = async (action: 'accept' | 'decline') => {
    try {
      await bookingsApi.respond(booking.id, action);
      Alert.alert('Success', `Booking ${action}ed.`);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', apiError(err, 'Could not update booking.'));
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Booking #{booking.id}</Text>
        <Text style={styles.meta}>Request: {booking.request_id}</Text>
        <Text style={styles.meta}>Customer: {booking.customer_id}</Text>
        <Text style={styles.meta}>Status: {booking.status}</Text>
      </View>
      <Pressable style={styles.primaryButton} onPress={() => void respond('accept')}>
        <Text style={styles.buttonText}>Accept</Text>
      </Pressable>
      <Pressable style={styles.dangerButton} onPress={() => void respond('decline')}>
        <Text style={styles.buttonText}>Decline</Text>
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
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  dangerButton: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700' },
});
