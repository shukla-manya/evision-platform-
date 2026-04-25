import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AxiosError } from 'axios';
import { electricianRegisterApi } from '../services/api';

function apiError(err: unknown, fallback: string) {
  const e = err as AxiosError<{ message?: string | string[] }>;
  const msg = e?.response?.data?.message;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.join(', ');
  return fallback;
}

async function pickFile(label: string): Promise<ImagePicker.ImagePickerAsset | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission denied', `Please allow media access to upload ${label}.`);
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.8,
  });
  if (result.canceled || !result.assets.length) return null;
  return result.assets[0];
}

type Props = { navigation: any };

export default function RegisterScreen({ navigation }: Props) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    address: '',
    lat: '',
    lng: '',
    skills: '',
  });
  const [aadharAsset, setAadharAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [photoAsset, setPhotoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (key: string) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const pickAadhar = async () => {
    const asset = await pickFile('Aadhar document');
    if (asset) setAadharAsset(asset);
  };

  const pickPhoto = async () => {
    const asset = await pickFile('profile photo');
    if (asset) setPhotoAsset(asset);
  };

  const submit = async () => {
    if (!form.name || !form.phone || !form.email || !form.password || !form.lat || !form.lng) {
      Alert.alert('Missing fields', 'Please fill all required fields.');
      return;
    }
    if (!aadharAsset) { Alert.alert('Missing Aadhar', 'Please upload your Aadhar document.'); return; }
    if (!photoAsset) { Alert.alert('Missing photo', 'Please upload your profile photo.'); return; }

    try {
      setLoading(true);
      const fd = new FormData();
      fd.append('name', form.name.trim());
      fd.append('phone', form.phone.trim().startsWith('+') ? form.phone.trim() : `+91${form.phone.trim()}`);
      fd.append('email', form.email.trim().toLowerCase());
      fd.append('password', form.password);
      fd.append('lat', form.lat.trim());
      fd.append('lng', form.lng.trim());
      if (form.address.trim()) fd.append('address', form.address.trim());
      if (form.skills.trim()) fd.append('skills', form.skills.trim());
      fd.append('aadhar', { uri: aadharAsset.uri, type: aadharAsset.mimeType || 'image/jpeg', name: 'aadhar.jpg' } as any);
      fd.append('photo', { uri: photoAsset.uri, type: photoAsset.mimeType || 'image/jpeg', name: 'photo.jpg' } as any);

      await electricianRegisterApi.register(fd);
      Alert.alert(
        'Registration submitted',
        'Your application is under review. You will receive an email once approved.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }],
      );
    } catch (err) {
      Alert.alert('Registration failed', apiError(err, 'Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Create Electrician Account</Text>
        <Text style={styles.subtitle}>Fill all fields. Your account needs approval before you can log in.</Text>

        {[
          { label: 'Full Name *', key: 'name', placeholder: 'Ravi Kumar' },
          { label: 'Phone (E.164) *', key: 'phone', placeholder: '+919876543210', keyboard: 'phone-pad' as const },
          { label: 'Email *', key: 'email', placeholder: 'ravi@example.com', keyboard: 'email-address' as const },
          { label: 'Password (min 8 chars) *', key: 'password', secure: true },
          { label: 'Address', key: 'address', placeholder: 'Sector 15, Faridabad' },
          { label: 'Latitude *', key: 'lat', placeholder: '28.4089', keyboard: 'decimal-pad' as const },
          { label: 'Longitude *', key: 'lng', placeholder: '77.3178', keyboard: 'decimal-pad' as const },
          { label: 'Skills (comma-separated)', key: 'skills', placeholder: 'wiring,solar,inverter' },
        ].map(({ label, key, placeholder, keyboard, secure }) => (
          <View key={key} style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              style={styles.input}
              value={(form as any)[key]}
              onChangeText={set(key)}
              placeholder={placeholder}
              placeholderTextColor="#64748b"
              keyboardType={keyboard || 'default'}
              secureTextEntry={secure}
              autoCapitalize={keyboard === 'email-address' ? 'none' : 'sentences'}
            />
          </View>
        ))}

        <View style={styles.field}>
          <Text style={styles.label}>Aadhar Document *</Text>
          <Pressable style={styles.fileBtn} onPress={pickAadhar}>
            <Text style={styles.fileBtnText}>
              {aadharAsset ? `✓ ${aadharAsset.fileName || 'aadhar selected'}` : 'Choose Aadhar Image'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Profile Photo *</Text>
          <Pressable style={styles.fileBtn} onPress={pickPhoto}>
            <Text style={styles.fileBtnText}>
              {photoAsset ? `✓ ${photoAsset.fileName || 'photo selected'}` : 'Choose Profile Photo'}
            </Text>
          </Pressable>
        </View>

        <Pressable style={[styles.btn, loading && styles.btnDisabled]} onPress={submit} disabled={loading}>
          <Text style={styles.btnText}>{loading ? 'Submitting…' : 'Submit Registration'}</Text>
        </Pressable>

        <Pressable style={styles.link} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkText}>Already registered? Sign in →</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050b1a' },
  container: { padding: 24, gap: 8, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', color: '#e2e8f0', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#64748b', marginBottom: 12, lineHeight: 18 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  input: {
    backgroundColor: '#0d1626',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#e2e8f0',
    fontSize: 15,
  },
  fileBtn: {
    backgroundColor: '#0d1626',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderStyle: 'dashed',
  },
  fileBtnText: { color: '#3b82f6', fontSize: 14 },
  btn: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  link: { alignItems: 'center', marginTop: 4 },
  linkText: { color: '#3b82f6', fontSize: 14 },
});
