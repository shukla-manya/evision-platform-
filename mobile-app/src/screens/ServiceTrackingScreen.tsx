import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useFocusEffect } from '@react-navigation/native';
import { serviceApi, ServiceBooking } from '../services/api';
import { getToken } from '../services/storage';
import { createTrackingSocket } from '../services/trackingSocket';

export function ServiceTrackingScreen() {
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await serviceApi.listMyActiveBookings();
      setBookings(data || []);
      if (!selectedBookingId && data?.[0]?.id) {
        setSelectedBookingId(String(data[0].id));
      }
    } catch {
      Alert.alert('Error', 'Failed to load active service bookings.');
    } finally {
      setLoading(false);
    }
  }, [selectedBookingId]);

  useFocusEffect(
    useCallback(() => {
      void loadBookings();
    }, [loadBookings]),
  );

  useEffect(() => {
    const connect = async () => {
      if (!selectedBookingId) return;
      const token = await getToken();
      if (!token) return;
      const socket = createTrackingSocket(token);
      socket.emit('join_booking_room', { booking_id: selectedBookingId });
      socket.on('booking_location_update', (payload: { booking_id: string; lat: number; lng: number }) => {
        if (String(payload?.booking_id) === selectedBookingId) {
          setLocation({ lat: Number(payload.lat), lng: Number(payload.lng) });
        }
      });
      socket.on('tracking_error', () => {
        // Keep UI responsive even if room join fails.
      });
      return () => {
        socket.disconnect();
      };
    };

    let cleanup: (() => void) | undefined;
    void connect().then((maybeCleanup) => {
      cleanup = maybeCleanup;
    });
    return () => cleanup?.();
  }, [selectedBookingId]);

  const selected = useMemo(
    () => bookings.find((booking) => String(booking.id) === selectedBookingId) || null,
    [bookings, selectedBookingId],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Live Electrician Tracking</Text>
      <Text style={styles.subtitle}>
        {loading
          ? 'Loading active bookings...'
          : selected
            ? `Tracking booking #${selected.id}`
            : 'No active bookings right now'}
      </Text>

      <View style={styles.row}>
        {bookings.map((booking) => (
          <Pressable
            key={booking.id}
            style={[
              styles.bookingChip,
              String(booking.id) === selectedBookingId && styles.bookingChipActive,
            ]}
            onPress={() => setSelectedBookingId(String(booking.id))}
          >
            <Text style={styles.bookingChipText}>#{booking.id.slice(0, 6)}</Text>
          </Pressable>
        ))}
      </View>

      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location?.lat || 28.6139,
          longitude: location?.lng || 77.209,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        }}
        region={
          location
            ? {
                latitude: location.lat,
                longitude: location.lng,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }
            : undefined
        }
      >
        {location && (
          <Marker
            coordinate={{ latitude: location.lat, longitude: location.lng }}
            title="Electrician"
            description="Live location"
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: '#f8fafc', gap: 10 },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  subtitle: { color: '#475569', fontSize: 13 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  bookingChip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bookingChipActive: { borderColor: '#2563eb', backgroundColor: '#dbeafe' },
  bookingChipText: { fontSize: 12, color: '#1e293b', fontWeight: '600' },
  map: { flex: 1, borderRadius: 12, overflow: 'hidden' },
});
