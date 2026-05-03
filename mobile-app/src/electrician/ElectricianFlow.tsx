import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PublicWebsiteLinks } from '../components/PublicWebsiteLinks';
import { TechnicianWorkspaceFooter } from './TechnicianWorkspaceFooter';
import { API_BASE_URL, electricianApi, ElectricianProfile, ServiceBooking } from '../services/api';
import { createTrackingSocket } from '../services/trackingSocket';
import { colors } from '../theme/colors';
import { statusColor } from '../theme/status';

type ElectricianStackParamList = {
  Home: undefined;
  BookingDetail: { booking: ServiceBooking };
  ActiveJob: undefined;
  UploadPhoto: { bookingId: string };
  Profile: undefined;
  JobHistory: undefined;
};

const Stack = createNativeStackNavigator<ElectricianStackParamList>();

const stackHeaderOptions = {
  headerStyle: { backgroundColor: colors.navbar },
  headerTintColor: '#FFFFFF' as const,
  headerTitleStyle: { color: '#FFFFFF', fontWeight: '600' as const },
  contentStyle: { backgroundColor: colors.background },
};

function asErrorMessage(err: unknown, fallback: string) {
  const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message)) return message.join(', ');
  return fallback;
}

function cleanLabel(raw: unknown, fallback: string): string {
  const s = String(raw ?? '').trim();
  return s || fallback;
}

/** Same format as web registration: `Experience: N yrs · city, PIN…` */
function parseTechServiceAddress(addr?: string | null): { years: number | null; area: string } {
  const s = String(addr || '').trim();
  if (!s) return { years: null, area: '' };
  const m = s.match(/^Experience:\s*(\d{1,2})\s*yrs?\s*·\s*([\s\S]+)$/i);
  if (m) {
    const y = Number(m[1]);
    return { years: Number.isFinite(y) ? y : null, area: m[2].trim() };
  }
  const m2 = s.match(/^Experience:\s*([^·]+)\s*·\s*([\s\S]+)$/i);
  if (m2) {
    const num = Number(String(m2[1]).match(/\d+/)?.[0]);
    return { years: Number.isFinite(num) ? num : null, area: m2[2].trim() };
  }
  return { years: null, area: s };
}

function skillsFromProfile(skills: unknown): string[] {
  if (Array.isArray(skills)) return skills.map(String);
  const str = String(skills || '').trim();
  if (!str) return [];
  try {
    const j = JSON.parse(str);
    if (Array.isArray(j)) return j.map(String);
  } catch {
    /* comma-separated */
  }
  return str.split(',').map((x) => x.trim()).filter(Boolean);
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

  useFocusEffect(useCallback(() => { void load(); }, [load]));

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
    <SafeAreaView style={[styles.screen, styles.fillScreen]}>
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
        <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('JobHistory')}>
          <Text style={styles.secondaryButtonText}>Job history</Text>
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
          style={styles.fillScreen}
          contentContainerStyle={styles.homeListContent}
          data={pending}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => navigation.navigate('BookingDetail', { booking: item })}>
              <Text style={styles.cardTitle}>Booking #{String(item.id).slice(0, 8)}</Text>
              <Text style={styles.meta}>
                Status:{' '}
                <Text style={{ color: statusColor(String(item.status || '-')), fontWeight: '700' }}>
                  {String(item.status || '-')}
                </Text>
              </Text>
              <Text style={styles.meta}>Created: {String(item.created_at || '-')}</Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.meta}>No pending bookings.</Text>}
          ListFooterComponent={<TechnicianWorkspaceFooter />}
        />
      )}
    </SafeAreaView>
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
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Booking Detail</Text>
        <Text style={styles.meta}>Booking ID: {String(booking.id)}</Text>
        <Text style={styles.meta}>Request ID: {String(booking.request_id || '-')}</Text>
        <Text style={styles.meta}>Customer: {String(booking.customer_id || '-')}</Text>
        <Text style={styles.meta}>
          Status:{' '}
          <Text style={{ color: statusColor(String(booking.status || '-')), fontWeight: '700' }}>
            {String(booking.status || '-')}
          </Text>
        </Text>
      </View>
      <Pressable style={styles.primaryButton} onPress={() => void respond('accept')}>
        <Text style={styles.primaryButtonText}>Accept</Text>
      </Pressable>
      <Pressable style={styles.dangerButton} onPress={() => void respond('decline')}>
        <Text style={styles.primaryButtonText}>Decline</Text>
      </Pressable>
    </SafeAreaView>
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
    let isCancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const sendLocation = async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      if (isCancelled) return;
      socket.emit('location_update', {
        booking_id: selectedJob.id,
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      });
    };

    socket.on('connect', () => {
      socket.emit('join_room', { booking_id: selectedJob.id });
      void sendLocation();
      timer = setInterval(() => void sendLocation(), 5000);
    });

    return () => {
      isCancelled = true;
      if (timer) clearInterval(timer);
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
        <Text style={styles.cardTitle}>
          Current Status:{' '}
          <Text style={{ color: statusColor(jobStatus || '-'), fontWeight: '700' }}>{jobStatus || '-'}</Text>
        </Text>
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
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Upload Completion Photo</Text>
        <Text style={styles.meta}>Booking: {bookingId}</Text>
      </View>
      <Pressable style={styles.primaryButton} onPress={() => void pickAndUpload()}>
        <Text style={styles.primaryButtonText}>Choose Photo</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function ProfileScreen({ onLogout, fcmToken }: { onLogout: () => void; fcmToken: string | null }) {
  const [profile, setProfile] = useState<ElectricianProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [experienceDigits, setExperienceDigits] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [skillsCsv, setSkillsCsv] = useState('');

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await electricianApi.me();
      const row = data || null;
      setProfile(row);
      if (row) {
        const parsed = parseTechServiceAddress(row.address);
        setExperienceDigits(parsed.years != null ? String(parsed.years) : '');
        setServiceArea(parsed.area);
        setSkillsCsv(skillsFromProfile(row.skills).join(', '));
      }
    } catch (err) {
      Alert.alert('Error', asErrorMessage(err, 'Could not load profile.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const approved = String(profile?.status || '').toLowerCase() === 'approved';

  const saveSkills = async () => {
    if (!approved) {
      Alert.alert('Not available', 'You can edit skills after your account is approved.');
      return;
    }
    const y = Number(String(experienceDigits).replace(/\D/g, '').slice(0, 2));
    const area = serviceArea.trim();
    if (!Number.isFinite(y) || y < 1 || y > 60) {
      Alert.alert('Check input', 'Enter years of experience (1–60).');
      return;
    }
    if (!area) {
      Alert.alert('Check input', 'Enter your service area (city, PIN, etc.).');
      return;
    }
    const skills = skillsCsv.split(',').map((s) => s.trim()).filter(Boolean);
    if (skills.length > 25) {
      Alert.alert('Check input', 'At most 25 services.');
      return;
    }
    for (const s of skills) {
      if (s.length > 60) {
        Alert.alert('Check input', 'Each service must be 60 characters or less.');
        return;
      }
    }
    try {
      setSaving(true);
      const { data } = await electricianApi.updateProfile({
        experience_years: y,
        service_area: area,
        skills,
      });
      setProfile(data || null);
      Alert.alert('Saved', 'Skills and experience were updated.');
    } catch (err) {
      Alert.alert('Error', asErrorMessage(err, 'Could not save.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollPad}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{profile?.name || 'My Profile'}</Text>
          {loading ? (
            <Text style={styles.meta}>Loading profile...</Text>
          ) : (
            <>
              <Text style={styles.meta}>Email: {profile?.email || '-'}</Text>
              <Text style={styles.meta}>Phone: {profile?.phone || '-'}</Text>
              <Text style={styles.meta}>
                Rating: {Number(profile?.rating_avg || 0).toFixed(1)} ({profile?.rating_count || 0})
              </Text>
              <Text style={styles.meta}>Status: {profile?.status || '-'}</Text>
              <Text style={styles.meta}>API: {API_BASE_URL}</Text>
              <Text style={styles.meta} numberOfLines={2}>
                FCM Token: {fcmToken || 'Not registered yet'}
              </Text>
            </>
          )}
        </View>

        {!loading && approved ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Skills &amp; experience</Text>
            <Text style={styles.meta}>
              Edit years, service area, and services below, then tap Save. This is what customers see on your profile.
            </Text>
            <Text style={styles.fieldLabel}>Years of experience</Text>
            <TextInput
              style={styles.textInput}
              value={experienceDigits}
              onChangeText={(t) => setExperienceDigits(t.replace(/\D/g, '').slice(0, 2))}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="e.g. 5"
              placeholderTextColor={colors.textSecondary}
            />
            <Text style={styles.fieldLabel}>Service area</Text>
            <TextInput
              style={[styles.textInput, styles.textInputMultiline]}
              value={serviceArea}
              onChangeText={setServiceArea}
              placeholder="City, PIN code, India"
              placeholderTextColor={colors.textSecondary}
              multiline
            />
            <Text style={styles.fieldLabel}>Services (comma-separated)</Text>
            <TextInput
              style={[styles.textInput, styles.textInputMultiline]}
              value={skillsCsv}
              onChangeText={setSkillsCsv}
              placeholder="AC repair, Wiring, …"
              placeholderTextColor={colors.textSecondary}
              multiline
            />
            <Pressable
              style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
              onPress={() => void saveSkills()}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Save skills &amp; experience</Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {!loading && !approved ? (
          <View style={styles.card}>
            <Text style={styles.meta}>
              After approval, you can update your years of experience, service area, and services here.
            </Text>
          </View>
        ) : null}

        <TechnicianWorkspaceFooter />

        <PublicWebsiteLinks audience="signed_in" omitShopAndStoreHome />
        <Pressable style={styles.secondaryButton} onPress={() => void loadProfile()}>
          <Text style={styles.secondaryButtonText}>Refresh</Text>
        </Pressable>
        <View style={styles.card}>
          <Text style={styles.meta}>
            You sign in with a code sent to your mobile. There is no separate password for your technician account in
            this app.
          </Text>
        </View>
        <Pressable style={styles.dangerButton} onPress={onLogout}>
          <Text style={styles.primaryButtonText}>Logout</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function JobHistoryScreen() {
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

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Job history</Text>
        <Text style={styles.meta}>Completed jobs: {history.length}</Text>
      </View>
      {history.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.cardTitle}>#{String(item.id).slice(0, 8)}</Text>
          <Text style={styles.meta}>Completed at: {String(item.updated_at || '-')}</Text>
        </View>
      ))}
      <TechnicianWorkspaceFooter />
    </ScrollView>
  );
}

type FlowGate = 'loading' | 'pending' | 'rejected' | 'approved';

export function ElectricianFlow({
  token,
  onLogout,
  fcmToken,
  userRole,
}: {
  token: string;
  onLogout: () => void;
  fcmToken: string | null;
  userRole?: string;
}) {
  const isPendingOrRejected = userRole === 'electrician_pending' || userRole === 'electrician_rejected';
  const [gate, setGate] = useState<FlowGate>(isPendingOrRejected ? 'loading' : 'approved');
  const [rejectReason, setRejectReason] = useState('');
  const fetchedRef = useRef(false);

  const activeJobScreen = useMemo(
    () => (props: any) => <ActiveJobScreen {...props} token={token} />,
    [token],
  );

  useEffect(() => {
    if (!isPendingOrRejected || fetchedRef.current) return;
    fetchedRef.current = true;
    electricianApi
      .me()
      .then(({ data }) => {
        const profile = data as ElectricianProfile & { reject_reason?: string | null };
        const st = String(profile?.status || '').toLowerCase();
        if (st === 'rejected') {
          setRejectReason(String(profile?.reject_reason || 'Your application was not approved at this time.'));
          setGate('rejected');
        } else {
          setGate('pending');
        }
      })
      .catch(() => {
        if (userRole === 'electrician_rejected') {
          setGate('rejected');
        } else {
          setGate('pending');
        }
      });
  }, [isPendingOrRejected, userRole]);

  if (gate === 'loading') {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.meta}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (gate === 'pending') {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Application under review</Text>
          <Text style={styles.meta}>
            Your technician application has been submitted. Our team will review it and get back to you within 24 hours.
          </Text>
          <Text style={styles.meta}>
            You will receive an email and notification once your account is approved.
          </Text>
        </View>
        <Pressable style={styles.dangerButton} onPress={onLogout}>
          <Text style={styles.primaryButtonText}>Sign out</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (gate === 'rejected') {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Application not approved</Text>
          <Text style={styles.meta}>
            {rejectReason || 'Your application was not approved at this time.'}
          </Text>
          <Text style={styles.meta}>
            You can submit a new application from the registration screen.
          </Text>
        </View>
        <Pressable style={styles.dangerButton} onPress={onLogout}>
          <Text style={styles.primaryButtonText}>Sign out</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Electrician Home' }} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: 'Booking Detail' }} />
      <Stack.Screen name="ActiveJob" component={activeJobScreen} options={{ title: 'Active Job' }} />
      <Stack.Screen name="UploadPhoto" component={UploadPhotoScreen} options={{ title: 'Upload Photo' }} />
      <Stack.Screen name="Profile" options={{ title: 'My Profile' }}>
        {() => <ProfileScreen onLogout={onLogout} fcmToken={fcmToken} />}
      </Stack.Screen>
      <Stack.Screen name="JobHistory" component={JobHistoryScreen} options={{ title: 'Job history' }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: 14 },
  scrollPad: { paddingBottom: 24 },
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
    marginTop: 8,
  },
  primaryButtonDisabled: { opacity: 0.65 },
  primaryButtonText: { color: colors.surface, fontWeight: '700' },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 10,
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  textInputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  secondaryButton: {
    backgroundColor: colors.indigo,
    borderWidth: 0,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#FFFFFF', fontWeight: '600' },
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
