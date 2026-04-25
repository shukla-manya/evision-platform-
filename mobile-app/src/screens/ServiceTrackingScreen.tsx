import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { serviceApi, ServiceBooking, CustomerBookingDetail } from '../services/api';
import { getToken } from '../services/storage';
import { createTrackingSocket } from '../services/trackingSocket';
import { colors } from '../theme/colors';

type ServiceTrackingTabParams = { bookingId?: string };

export function ServiceTrackingScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const tabParams = (route.params as ServiceTrackingTabParams | undefined) || {};

  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [electricianLocation, setElectricianLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [detail, setDetail] = useState<CustomerBookingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await serviceApi.listMyActiveBookings();
      setBookings(data || []);
      const fromTab = tabParams.bookingId ? String(tabParams.bookingId) : null;
      setSelectedBookingId((prev) => {
        if (fromTab) return fromTab;
        if (prev) return prev;
        if (data?.[0]?.id) return String(data[0].id);
        return null;
      });
    } catch {
      Alert.alert('Error', 'Failed to load active service bookings.');
    } finally {
      setLoading(false);
    }
  }, [tabParams.bookingId]);

  useFocusEffect(
    useCallback(() => {
      void loadBookings();
    }, [loadBookings]),
  );

  useEffect(() => {
    if (tabParams.bookingId) {
      setSelectedBookingId(String(tabParams.bookingId));
    }
  }, [tabParams.bookingId]);

  useEffect(() => {
    if (!selectedBookingId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await serviceApi.getBookingDetail(selectedBookingId);
        if (!cancelled) setDetail(data);
      } catch {
        if (!cancelled) setDetail(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedBookingId]);

  useEffect(() => {
    const connect = async () => {
      if (!selectedBookingId) return;
      const token = await getToken();
      if (!token) return;
      const sock = createTrackingSocket(token);
      sock.on('connect', () => sock.emit('join_room', { booking_id: selectedBookingId }));
      sock.on('electrician_location', (payload: { booking_id: string; lat: number; lng: number }) => {
        if (String(payload?.booking_id) === selectedBookingId) {
          setElectricianLocation({ lat: Number(payload.lat), lng: Number(payload.lng) });
        }
      });
      return () => {
        sock.emit('leave_room', { booking_id: selectedBookingId });
        sock.disconnect();
      };
    };

    let cleanup: (() => void) | undefined;
    void connect().then((maybeCleanup) => {
      cleanup = maybeCleanup;
    });
    return () => cleanup?.();
  }, [selectedBookingId]);

  const selected = useMemo((): ServiceBooking | null => {
    const fromList = bookings.find((booking) => String(booking.id) === selectedBookingId);
    if (fromList) return fromList;
    const b = detail?.booking;
    if (b && String((b as ServiceBooking).id) === selectedBookingId) return b as ServiceBooking;
    return null;
  }, [bookings, selectedBookingId, detail]);

  const customerCoord = useMemo(() => {
    const req = detail?.request;
    if (!req) return null;
    const la = Number((req as { lat?: unknown }).lat);
    const ln = Number((req as { lng?: unknown }).lng);
    if (Number.isNaN(la) || Number.isNaN(ln)) return null;
    return { lat: la, lng: ln };
  }, [detail]);

  const jobStatus = String(detail?.booking?.job_status || selected?.job_status || '');
  const electricianId = String(detail?.booking?.electrician_id || selected?.electrician_id || '');
  const electricianName = detail?.electrician?.name ? String(detail.electrician.name) : '';

  const openLeaveReview = () => {
    const parent = navigation.getParent();
    if (parent && 'navigate' in parent) {
      (parent.navigate as (a: string, b: object) => void)('LeaveReview', {
        electricianId,
        electricianName,
      });
    }
  };

  const regionCenter = electricianLocation || customerCoord || { lat: 28.6139, lng: 77.209 };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Live Electrician Tracking</Text>
      <Text style={styles.subtitle}>
        {loading
          ? 'Loading active bookings...'
          : selected
            ? `Booking #${selected.id.slice(0, 8)}… · ${jobStatus || 'pending'}`
            : 'No active bookings right now'}
      </Text>

      {jobStatus === 'completed' && electricianId ? (
        <Pressable style={styles.reviewBtn} onPress={openLeaveReview}>
          <Text style={styles.reviewBtnText}>Rate your visit</Text>
        </Pressable>
      ) : null}

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
            <Text style={styles.bookingChipText}>#{String(booking.id).slice(0, 6)}</Text>
          </Pressable>
        ))}
        {selectedBookingId && !bookings.some((b) => String(b.id) === selectedBookingId) ? (
          <Pressable
            style={[styles.bookingChip, styles.bookingChipActive]}
            onPress={() => setSelectedBookingId(selectedBookingId)}
          >
            <Text style={styles.bookingChipText}>#{selectedBookingId.slice(0, 6)}…</Text>
          </Pressable>
        ) : null}
      </View>

      <MapView
        style={styles.map}
        initialRegion={{
          latitude: regionCenter.lat,
          longitude: regionCenter.lng,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        }}
        region={
          electricianLocation || customerCoord
            ? {
                latitude: regionCenter.lat,
                longitude: regionCenter.lng,
                latitudeDelta: 0.04,
                longitudeDelta: 0.04,
              }
            : undefined
        }
      >
        {customerCoord ? (
          <Marker coordinate={{ latitude: customerCoord.lat, longitude: customerCoord.lng }} title="Service location" />
        ) : null}
        {electricianLocation ? (
          <Marker
            coordinate={{ latitude: electricianLocation.lat, longitude: electricianLocation.lng }}
            title="Electrician"
            description="Live location"
          />
        ) : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: colors.background, gap: 10 },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, fontSize: 13 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  bookingChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bookingChipActive: { borderColor: colors.brandPrimary, backgroundColor: colors.softPanel },
  bookingChipText: { fontSize: 12, color: colors.textPrimary, fontWeight: '600' },
  map: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  reviewBtn: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  reviewBtnText: { color: '#fff', fontWeight: '700' },
});
