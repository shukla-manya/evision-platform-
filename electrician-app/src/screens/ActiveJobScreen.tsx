import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { AxiosError } from 'axios';
import { Booking, bookingsApi } from '../services/api';
import { connectSocket, disconnectSocket, emitLocation, joinRoom } from '../services/socket';
import { colors } from '../theme/colors';

function apiError(err: unknown, fallback: string) {
  const e = err as AxiosError<{ message?: string | string[] }>;
  const msg = e?.response?.data?.message;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.join(', ');
  return fallback;
}

type Props = { token: string; navigation: any };

export default function ActiveJobScreen({ token, navigation }: Props) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await bookingsApi.myActiveBooking();
      setBooking(data || null);
    } catch (err) {
      Alert.alert('Error', apiError(err, 'Unable to load active booking.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!booking || booking.job_status !== 'on_the_way') return;
    const socket = connectSocket(token);
    joinRoom(booking.id);

    let cancelled = false;
    const sendLocation = async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted' || cancelled) return;
      const position = await Location.getCurrentPositionAsync({});
      if (cancelled) return;
      emitLocation(booking.id, position.coords.latitude, position.coords.longitude);
    };

    void sendLocation();
    const timer = setInterval(() => {
      void sendLocation();
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(timer);
      disconnectSocket();
    };
  }, [booking, token]);

  const updateStatus = async (
    status: 'on_the_way' | 'reached' | 'work_started' | 'completed',
  ) => {
    if (!booking) {
      Alert.alert('No active booking', 'You do not have an active booking yet.');
      return;
    }
    try {
      await bookingsApi.updateStatus(booking.id, status);
      if (status === 'completed') {
        navigation.navigate('UploadPhoto', { bookingId: booking.id });
      }
      await load();
    } catch (err) {
      Alert.alert('Error', apiError(err, 'Failed to update job status.'));
    }
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <Text style={styles.meta}>Loading active booking...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Active Job</Text>
        <Text style={styles.meta}>No active booking right now.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Booking #{booking.id.slice(0, 8)}</Text>
        <Text style={styles.meta}>Status: {booking.job_status || booking.status}</Text>
        <Text style={styles.meta}>Location emits every 5s while status is on_the_way.</Text>
      </View>

      <Pressable style={styles.button} onPress={() => void updateStatus('on_the_way')}>
        <Text style={styles.buttonText}>On the way</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={() => void updateStatus('reached')}>
        <Text style={styles.buttonText}>Reached</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={() => void updateStatus('work_started')}>
        <Text style={styles.buttonText}>Work started</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={() => void updateStatus('completed')}>
        <Text style={styles.buttonText}>Mark completed</Text>
      </Pressable>
    </View>
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
  button: {
    backgroundColor: colors.brandPrimary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonText: { color: colors.surface, fontWeight: '700' },
});
