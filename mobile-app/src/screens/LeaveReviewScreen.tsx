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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { reviewsApi } from '../services/api';
import { colors } from '../theme/colors';
import type { ServiceFlowStackParams } from './ServiceRequestScreen';

type Props = NativeStackScreenProps<ServiceFlowStackParams, 'LeaveReview'>;

export function LeaveReviewScreen({ navigation, route }: Props) {
  const { electricianId, electricianName } = route.params;
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pickPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
    });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  }, []);

  const submit = async () => {
    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append('rating', String(rating));
      if (comment.trim()) fd.append('comment', comment.trim());
      if (photoUri) fd.append('photo', { uri: photoUri, name: 'review.jpg', type: 'image/jpeg' } as never);
      await reviewsApi.submitElectricianReview(electricianId, fd);
      const rootNav = navigation as unknown as { navigate: (name: string) => void };
      Alert.alert('Thanks', 'Your review was submitted.', [
        { text: 'OK', onPress: () => rootNav.navigate('Main') },
      ]);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string | string[] } } };
      const msg = err?.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : typeof msg === 'string' ? msg : 'Could not submit review.';
      Alert.alert('Error', text);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.title}>Rate {electricianName || 'your electrician'}</Text>
        <Text style={styles.label}>Rating</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setRating(n)} style={styles.starHit}>
              <Text style={[styles.star, n <= rating && styles.starOn]}>★</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Comment (optional)</Text>
        <TextInput
          style={[styles.input, styles.tall]}
          placeholder="How was the visit?"
          value={comment}
          onChangeText={setComment}
          multiline
        />
        <Pressable style={styles.secondary} onPress={pickPhoto}>
          <Text style={styles.secondaryText}>{photoUri ? 'Change photo' : 'Add photo (optional)'}</Text>
        </Pressable>
        <Pressable style={[styles.primary, submitting && styles.disabled]} onPress={() => void submit()} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Submit review</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  pad: { padding: 16, paddingBottom: 40, gap: 10 },
  title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  starsRow: { flexDirection: 'row', gap: 8, marginVertical: 8 },
  starHit: { padding: 4 },
  star: { fontSize: 32, color: colors.border },
  starOn: { color: colors.brandPrimary },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
  },
  tall: { minHeight: 100, textAlignVertical: 'top' },
  secondary: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryText: { fontWeight: '600', color: colors.textPrimary },
  primary: {
    marginTop: 16,
    backgroundColor: colors.brandPrimary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
