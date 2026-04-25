import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { serviceApi } from '../services/api';
import { colors } from '../theme/colors';

export type ServiceFlowStackParams = {
  ServiceRequest: { orderGroupId?: string };
  ElectricianList: { serviceRequestId: string; lat: number; lng: number };
  ElectricianPublicProfile: { electricianId: string; serviceRequestId: string };
  ServiceBookingConfirm: { bookingId: string; serviceRequestId: string; electricianName?: string };
  LeaveReview: { electricianId: string; electricianName?: string };
};

type Props = NativeStackScreenProps<ServiceFlowStackParams, 'ServiceRequest'>;

export function ServiceRequestScreen({ navigation, route }: Props) {
  const orderGroupId = route.params?.orderGroupId;
  const [issue, setIssue] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [timeFrom, setTimeFrom] = useState('09:00');
  const [timeTo, setTimeTo] = useState('17:00');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const pickPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission', 'Photo access is required for the service request.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }, []);

  const resolveLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location', 'Location is required so we can find nearby electricians.');
      return false;
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setLat(pos.coords.latitude);
    setLng(pos.coords.longitude);
    return true;
  }, []);

  const submit = async () => {
    if (issue.trim().length < 5) {
      Alert.alert('Validation', 'Please describe the issue (at least 5 characters).');
      return;
    }
    if (!preferredDate.trim()) {
      Alert.alert('Validation', 'Preferred date is required (YYYY-MM-DD).');
      return;
    }
    if (!photoUri) {
      Alert.alert('Validation', 'Please attach a photo of the issue.');
      return;
    }
    try {
      setLoading(true);
      const ok = lat != null && lng != null ? true : await resolveLocation();
      if (!ok || lat == null || lng == null) {
        Alert.alert('Location', 'Could not determine your location.');
        return;
      }
      const fd = new FormData();
      fd.append('issue', issue.trim());
      fd.append('preferred_date', preferredDate.trim());
      fd.append('time_from', timeFrom.trim());
      fd.append('time_to', timeTo.trim());
      fd.append('lat', String(lat));
      fd.append('lng', String(lng));
      fd.append('photo', { uri: photoUri, name: 'issue.jpg', type: 'image/jpeg' } as never);
      const { data } = await serviceApi.createRequest(fd);
      const id = String((data as { id?: string }).id || '');
      if (!id) {
        Alert.alert('Error', 'Invalid response from server.');
        return;
      }
      navigation.replace('ElectricianList', {
        serviceRequestId: id,
        lat: lat!,
        lng: lng!,
      });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string | string[] } } };
      const msg = err?.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : typeof msg === 'string' ? msg : 'Request failed.';
      Alert.alert('Error', text);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        {orderGroupId ? (
          <Text style={styles.hint}>Linked order group: {orderGroupId.slice(0, 8)}…</Text>
        ) : null}
        <Text style={styles.label}>Issue</Text>
        <TextInput
          style={styles.input}
          placeholder="Describe the problem"
          value={issue}
          onChangeText={setIssue}
          multiline
        />
        <Text style={styles.label}>Preferred date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          placeholder="2026-04-28"
          value={preferredDate}
          onChangeText={setPreferredDate}
          autoCapitalize="none"
        />
        <Text style={styles.label}>Time window</Text>
        <View style={styles.row}>
          <TextInput style={[styles.input, styles.half]} value={timeFrom} onChangeText={setTimeFrom} />
          <Text style={styles.to}>to</Text>
          <TextInput style={[styles.input, styles.half]} value={timeTo} onChangeText={setTimeTo} />
        </View>
        <Text style={styles.label}>Photo</Text>
        <Pressable style={styles.secondaryBtn} onPress={pickPhoto}>
          <Text style={styles.secondaryBtnText}>{photoUri ? 'Change photo' : 'Attach photo'}</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={() => void resolveLocation()}>
          <Text style={styles.secondaryBtnText}>
            {lat != null && lng != null ? `Location OK (${lat.toFixed(4)}, ${lng.toFixed(4)})` : 'Use current location'}
          </Text>
        </Pressable>
        <Pressable style={[styles.primaryBtn, loading && styles.disabled]} onPress={() => void submit()} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Continue to electricians</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  pad: { padding: 16, gap: 10, paddingBottom: 40 },
  hint: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    minHeight: 44,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  half: { flex: 1 },
  to: { color: colors.textSecondary },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: colors.brandPrimary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  secondaryBtnText: { color: colors.textPrimary, fontWeight: '600' },
  disabled: { opacity: 0.6 },
});
