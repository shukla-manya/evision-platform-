import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { electricianApi, ServiceBooking } from '../services/api';
import { createTrackingSocket } from '../services/trackingSocket';
import { colors } from '../theme/colors';

type ElectricianStackParamList = {
  Home: undefined;
  BookingDetail: { booking: ServiceBooking };
  ActiveJob: undefined;
  UploadPhoto: { bookingId: string };
  Profile: undefined;
  EarningsHistory: undefined;
};

const Stack = createNativeStackNavigator<ElectricianStackParamList>();

function asErrorMessage(err: unknown, fallback: string) {
  const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message)) return message.join(', ');
  return fallback;
}

function HomeScreen({ navigation }: any) {
  const [pending, setPending] = useState<ServiceBooking[]>([]);
  const [online, setOnline] = useState(true);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [{ data: pendingRows }] = await Promise.all([electricianApi.pendingBookings()]);
      setPending(pendingRows || []);
    } catch (err) {
      Alert.alert('Error', asErrorMessage(err, 'Unable to load pending bookings.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateAvailability = async (value: boolean) => {
    try {
      setOnline(value);
      await electricianApi.setAvailability(value);
    } catch (err) {
      setOnline((prev) => !prev);
      Alert.alert('Error', asErrorMessage(err, 'Could not update availability.'));
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Online / Offline</Text>
          <Switch value={online} onValueChange={updateAvailability} />
        </View>
      </View>
      <View style={styles.row}>
        <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('ActiveJob')}>
          <Text style={styles.secondaryButtonText}>Active Job</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('EarningsHistory')}>
          <Text style={styles.secondaryButtonText}>Earnings/History</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.secondaryButtonText}>My Profile</Text>
        </Pressable>
      </View>
      <Text style={styles.sectionTitle}>Pending Bookings</Text>
      {loading ? (
        <Text style={styles.meta}>Loading...</Text>
      ) : (
        <FlatList
          data={pending}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => navigation.navigate('BookingDetail', { booking: item })}>
              <Text style={styles.cardTitle}>Booking #{String(item.id).slice(0, 8)}</Text>
              <Text style={styles.meta}>Status: {String(item.status || '-')}</Text>
              <Text style={styles.meta}>Created: {String(item.created_at || '-')}</Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.meta}>No pending bookings.</Text>}
        />
      )}
    </View>
  );
}

function BookingDetailScreen({ route, navigation }: any) {
  const booking = route.params?.booking as ServiceBooking;

  const respond = async (action: 'accept' | 'decline') => {
    try {
      await electricianApi.respondBooking(String(booking.id), action);
      Alert.alert('Success', `Booking ${action}ed.`);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', asErrorMessage(err, 'Failed to respond to booking.'));
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Booking Detail</Text>
        <Text style={styles.meta}>Booking ID: {String(booking.id)}</Text>
        <Text style={styles.meta}>Request ID: {String(booking.request_id || '-')}</Text>
        <Text style={styles.meta}>Customer: {String(booking.customer_id || '-')}</Text>
      </View>
      <Pressable style={styles.primaryButton} onPress={() => void respond('accept')}>
        <Text style={styles.primaryButtonText}>Accept</Text>
      </Pressable>
      <Pressable style={styles.dangerButton} onPress={() => void respond('decline')}>
        <Text style={styles.primaryButtonText}>Decline</Text>
      </Pressable>
    </View>
  );
}

function ActiveJobScreen({ navigation, token }: { navigation: any; token: string }) {
  const [activeJobs, setActiveJobs] = useState<ServiceBooking[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);

  const selectedJob = useMemo(
    () => activeJobs.find((job) => String(job.id) === selectedId) || null,
    [activeJobs, selectedId],
  );

  const load = useCallback(async () => {
    try {
      const { data } = await electricianApi.activeBookings();
      setActiveJobs(data || []);
      if (!selectedId && data?.[0]?.id) {
        setSelectedId(String(data[0].id));
        setJobStatus(String(data[0].job_status || 'accepted'));
      }
    } catch (err) {
      Alert.alert('Error', asErrorMessage(err, 'Failed to load active jobs.'));
    }
  }, [selectedId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedJob) return;
    setJobStatus(String(selectedJob.job_status || 'accepted'));
  }, [selectedJob]);

  useEffect(() => {
    if (!selectedJob || jobStatus !== 'on_the_way') return;
    const socket = createTrackingSocket(token);
    socket.emit('join_booking_room', { booking_id: selectedJob.id });

    let isCancelled = false;
    const sendLocation = async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      if (isCancelled) return;
      socket.emit('electrician_location_update', {
        booking_id: selectedJob.id,
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        sent_at: new Date().toISOString(),
      });
    };
    void sendLocation();
    const timer = setInterval(() => {
      void sendLocation();
    }, 5000);

    return () => {
      isCancelled = true;
      clearInterval(timer);
      socket.disconnect();
    };
  }, [selectedJob, jobStatus, token]);

  const updateStatus = async (
    status: 'on_the_way' | 'reached' | 'work_started' | 'completed',
  ) => {
    if (!selectedJob) {
      Alert.alert('Select job', 'Please select an active booking first.');
      return;
    }
    try {
      await electricianApi.updateJobStatus(String(selectedJob.id), status);
      setJobStatus(status);
      if (status === 'completed') {
        navigation.navigate('UploadPhoto', { bookingId: String(selectedJob.id) });
      }
      await load();
    } catch (err) {
      Alert.alert('Error', asErrorMessage(err, 'Could not update job status.'));
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 24 }}>
      <Text style={styles.sectionTitle}>Active Job</Text>
      <View style={styles.row}>
        {activeJobs.map((job) => (
          <Pressable
            key={job.id}
            style={[
              styles.bookingChip,
              String(job.id) === selectedId && styles.bookingChipActive,
            ]}
            onPress={() => setSelectedId(String(job.id))}
          >
            <Text style={styles.bookingChipText}>#{String(job.id).slice(0, 6)}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Status: {jobStatus || '-'}</Text>
        <Text style={styles.meta}>
          Live tracking emits location every 5 seconds only while status is on_the_way.
        </Text>
      </View>
      <Pressable style={styles.primaryButton} onPress={() => void updateStatus('on_the_way')}>
        <Text style={styles.primaryButtonText}>On the way</Text>
      </Pressable>
      <Pressable style={styles.primaryButton} onPress={() => void updateStatus('reached')}>
        <Text style={styles.primaryButtonText}>Reached</Text>
      </Pressable>
      <Pressable style={styles.primaryButton} onPress={() => void updateStatus('work_started')}>
        <Text style={styles.primaryButtonText}>Started</Text>
      </Pressable>
      <Pressable style={styles.primaryButton} onPress={() => void updateStatus('completed')}>
        <Text style={styles.primaryButtonText}>Completed</Text>
      </Pressable>
    </ScrollView>
  );
}

function UploadPhotoScreen({ route, navigation }: any) {
  const bookingId = String(route.params?.bookingId || '');

  const pickAndUpload = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery permission is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const formData = new FormData();
    formData.append('photo', {
      uri: asset.uri,
      name: asset.fileName || `work-${Date.now()}.jpg`,
      type: asset.mimeType || 'image/jpeg',
    } as never);
    try {
      await electricianApi.uploadWorkPhoto(bookingId, formData);
      Alert.alert('Uploaded', 'Work photo uploaded successfully.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', asErrorMessage(err, 'Failed to upload photo.'));
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Upload Completion Photo</Text>
        <Text style={styles.meta}>Booking: {bookingId}</Text>
      </View>
      <Pressable style={styles.primaryButton} onPress={() => void pickAndUpload()}>
        <Text style={styles.primaryButtonText}>Choose Photo</Text>
      </Pressable>
    </View>
  );
}

function ProfileScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>My Profile</Text>
        <Text style={styles.meta}>Use this as electrician profile base screen.</Text>
      </View>
    </View>
  );
}

function EarningsHistoryScreen() {
  const [history, setHistory] = useState<ServiceBooking[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await electricianApi.historyBookings();
        setHistory(data || []);
      } catch (err) {
        Alert.alert('Error', asErrorMessage(err, 'Failed to load history.'));
      }
    };
    void load();
  }, []);

  const totalJobs = history.length;
  const estimatedEarnings = totalJobs * 500;

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Earnings / History</Text>
        <Text style={styles.meta}>Completed Jobs: {totalJobs}</Text>
        <Text style={styles.meta}>Estimated Earnings: Rs. {estimatedEarnings}</Text>
      </View>
      {history.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.cardTitle}>#{String(item.id).slice(0, 8)}</Text>
          <Text style={styles.meta}>Completed at: {String(item.updated_at || '-')}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

export function ElectricianFlow({ token }: { token: string }) {
  const activeJobScreen = useMemo(
    () => (props: any) => <ActiveJobScreen {...props} token={token} />,
    [token],
  );
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Electrician Home' }} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: 'Booking Detail' }} />
      <Stack.Screen name="ActiveJob" component={activeJobScreen} options={{ title: 'Active Job' }} />
      <Stack.Screen name="UploadPhoto" component={UploadPhotoScreen} options={{ title: 'Upload Photo' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
      <Stack.Screen name="EarningsHistory" component={EarningsHistoryScreen} options={{ title: 'Earnings & History' }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
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
  primaryButton: {
    backgroundColor: colors.brandPrimary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryButtonText: { color: colors.surface, fontWeight: '700' },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  secondaryButtonText: { color: colors.textPrimary, fontWeight: '600' },
  dangerButton: {
    backgroundColor: colors.error,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bookingChipActive: { borderColor: colors.brandPrimary, backgroundColor: colors.softPanel },
  bookingChipText: { color: colors.textPrimary, fontSize: 12, fontWeight: '700' },
});
