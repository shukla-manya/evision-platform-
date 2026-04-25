import React, { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { RouteProp } from '@react-navigation/native';
import { AxiosError } from 'axios';
import { bookingsApi } from '../services/api';

function apiError(err: unknown, fallback: string) {
  const e = err as AxiosError<{ message?: string | string[] }>;
  const msg = e?.response?.data?.message;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.join(', ');
  return fallback;
}

type RouteParams = { UploadPhoto: { bookingId: string } };
type Props = {
  route: RouteProp<RouteParams, 'UploadPhoto'>;
  navigation: any;
};

export default function UploadPhotoScreen({ route, navigation }: Props) {
  const { bookingId } = route.params;
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Camera access is needed to take job photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets.length) setAsset(result.assets[0]);
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Gallery access is needed.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets.length) setAsset(result.assets[0]);
  };

  const upload = async () => {
    if (!asset) return;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('photo', {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: 'job-photo.jpg',
      } as any);
      await bookingsApi.uploadPhoto(bookingId, fd);
      setDone(true);
      Alert.alert('Uploaded!', 'Job photo saved successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Upload failed', apiError(err, 'Please try again.'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Upload Job Photo</Text>
        <Text style={styles.subtitle}>
          Take or select a photo of the completed work to attach to this booking.
        </Text>
        <Text style={styles.bookingRef}>Booking: #{bookingId.slice(-10).toUpperCase()}</Text>

        {/* Photo preview */}
        {asset ? (
          <View style={styles.preview}>
            <Image source={{ uri: asset.uri }} style={styles.previewImage} resizeMode="cover" />
            <Pressable style={styles.changeBtn} onPress={() => setAsset(null)}>
              <Text style={styles.changeBtnText}>Remove photo</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.pickerArea}>
            <Text style={styles.pickerIcon}>📷</Text>
            <Text style={styles.pickerLabel}>No photo selected</Text>
            <View style={styles.pickerBtns}>
              <Pressable style={styles.pickerBtn} onPress={openCamera}>
                <Text style={styles.pickerBtnText}>📸 Camera</Text>
              </Pressable>
              <Pressable style={styles.pickerBtn} onPress={openGallery}>
                <Text style={styles.pickerBtnText}>🖼 Gallery</Text>
              </Pressable>
            </View>
          </View>
        )}

        {asset && (
          <Pressable
            style={[styles.uploadBtn, (!asset || uploading || done) && styles.btnDisabled]}
            onPress={upload}
            disabled={!asset || uploading || done}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : done ? (
              <Text style={styles.uploadBtnText}>✓ Uploaded</Text>
            ) : (
              <Text style={styles.uploadBtnText}>Upload Photo</Text>
            )}
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050b1a' },
  container: { padding: 24, gap: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: '#e2e8f0' },
  subtitle: { fontSize: 14, color: '#64748b', lineHeight: 20 },
  bookingRef: { color: '#475569', fontSize: 13 },
  preview: { gap: 12 },
  previewImage: { width: '100%', height: 280, borderRadius: 14 },
  changeBtn: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  changeBtnText: { color: '#dc2626', fontSize: 14, fontWeight: '600' },
  pickerArea: {
    backgroundColor: '#0d1626',
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderStyle: 'dashed',
  },
  pickerIcon: { fontSize: 48 },
  pickerLabel: { color: '#475569', fontSize: 15 },
  pickerBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  pickerBtn: {
    backgroundColor: '#1e3a5f',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  pickerBtnText: { color: '#3b82f6', fontWeight: '600', fontSize: 14 },
  uploadBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  uploadBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
