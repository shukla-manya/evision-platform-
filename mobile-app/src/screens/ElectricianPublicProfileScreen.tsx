import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { publicElectricianApi, serviceApi, ElectricianPublicProfile } from '../services/api';
import { colors } from '../theme/colors';
import type { ServiceFlowStackParams } from './ServiceRequestScreen';

type Props = NativeStackScreenProps<ServiceFlowStackParams, 'ElectricianPublicProfile'>;

export function ElectricianPublicProfileScreen({ navigation, route }: Props) {
  const { electricianId, serviceRequestId } = route.params;
  const [profile, setProfile] = useState<ElectricianPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await publicElectricianApi.profile(electricianId);
      setProfile(data || null);
    } catch {
      Alert.alert('Error', 'Could not load profile.');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [electricianId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const book = async () => {
    try {
      setBooking(true);
      const { data } = await serviceApi.bookElectrician(electricianId, serviceRequestId);
      const bookingId = String((data as { id?: string }).id || '');
      if (!bookingId) {
        Alert.alert('Error', 'Invalid booking response.');
        return;
      }
      navigation.replace('ServiceBookingConfirm', {
        bookingId,
        serviceRequestId,
        electricianName: String(profile?.name || ''),
      });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string | string[] } } };
      const msg = err?.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : typeof msg === 'string' ? msg : 'Booking failed.';
      Alert.alert('Error', text);
    } finally {
      setBooking(false);
    }
  };

  if (loading || !profile) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.brandPrimary} />
      </SafeAreaView>
    );
  }

  const reviews = Array.isArray(profile.reviews) ? profile.reviews : [];
  const photoUrl = profile.photo_url ? String(profile.photo_url) : null;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.pad}>
        <View style={styles.header}>
          {photoUrl ? <Image source={{ uri: photoUrl }} style={styles.avatar} /> : <View style={[styles.avatar, styles.ph]} />}
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{String(profile.name || '')}</Text>
            <Text style={styles.meta}>
              ★ {Number(profile.rating_avg || 0).toFixed(1)} · {Number(profile.rating_count || 0)} reviews
            </Text>
            {profile.phone ? <Text style={styles.meta}>{String(profile.phone)}</Text> : null}
          </View>
        </View>
        {Array.isArray(profile.skills) && profile.skills.length > 0 ? (
          <Text style={styles.skills}>{profile.skills.map(String).join(', ')}</Text>
        ) : null}

        <Text style={styles.section}>Reviews</Text>
        {reviews.length === 0 ? (
          <Text style={styles.muted}>No reviews yet.</Text>
        ) : (
          reviews.map((r) => (
            <View key={String(r.id || Math.random())} style={styles.reviewCard}>
              <Text style={styles.stars}>{'★'.repeat(Math.min(5, Math.max(1, Number(r.rating || 0))))}</Text>
              {r.comment ? <Text style={styles.comment}>{String(r.comment)}</Text> : null}
            </View>
          ))
        )}

        <Pressable style={[styles.bookBtn, booking && styles.disabled]} onPress={() => void book()} disabled={booking}>
          {booking ? <ActivityIndicator color="#fff" /> : <Text style={styles.bookBtnText}>Request this electrician</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pad: { padding: 16, paddingBottom: 40, gap: 12 },
  header: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.border },
  ph: { alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  meta: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  skills: { fontSize: 13, color: colors.textSecondary },
  section: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginTop: 12 },
  muted: { color: colors.muted },
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stars: { color: colors.brandPrimary, marginBottom: 4 },
  comment: { fontSize: 13, color: colors.textPrimary },
  bookBtn: {
    marginTop: 20,
    backgroundColor: colors.brandPrimary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  bookBtnText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
