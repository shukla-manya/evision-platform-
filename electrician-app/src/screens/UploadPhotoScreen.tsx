import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AxiosError } from 'axios';
import { bookingsApi } from '../services/api';
import { colors } from '../theme/colors';

function apiError(err: unknown, fallback: string) {
  const e = err as AxiosError<{ message?: string | string[] }>;
  const msg = e?.response?.data?.message;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.join(', ');
  return fallback;
}

type Props = { route: { params: { bookingId: string } }; navigation: any };

export default function UploadPhotoScreen({ route, navigation }: Props) {
  const bookingId = String(route.params?.bookingId || '');

  const pickAndUpload = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow gallery access to upload job photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;

    const file = result.assets[0];
    const formData = new FormData();
    formData.append('photo', {
      uri: file.uri,
      name: file.fileName || `job-${Date.now()}.jpg`,
      type: file.mimeType || 'image/jpeg',
    } as never);

    try {
      await bookingsApi.uploadPhoto(bookingId, formData);
      Alert.alert('Uploaded', 'Job completion photo uploaded.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Upload failed', apiError(err, 'Unable to upload photo.'));
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Upload Job Photo</Text>
        <Text style={styles.meta}>Booking: {bookingId}</Text>
      </View>
      <Pressable style={styles.button} onPress={() => void pickAndUpload()}>
        <Text style={styles.buttonText}>Choose Photo</Text>
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
  },
  buttonText: { color: colors.surface, fontWeight: '700' },
});
