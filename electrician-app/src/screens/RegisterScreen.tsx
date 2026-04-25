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

type Props = { navigation: any };

const SKILL_OPTIONS = ['Wiring', 'Panels', 'Solar', 'AC Repair', 'Lighting', 'Inverter'];

export default function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [aadhar, setAadhar] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async (type: 'aadhar' | 'photo') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Camera roll access is needed to upload images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      if (type === 'aadhar') setAadhar(result.assets[0]);
      else setPhoto(result.assets[0]);
    }
  };

  const toggleSkill = (skill: string) => {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  };

  const submit = async () => {
    if (!name.trim() || !phone.trim() || !email.trim() || !password || !address.trim()) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    if (!aadhar) {
      Alert.alert('Error', 'Please upload your Aadhar card image.');
      return;
    }
    if (skills.length === 0) {
      Alert.alert('Error', 'Please select at least one skill.');
      return;
    }

    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('phone', phone.trim());
    formData.append('email', email.trim().toLowerCase());
    formData.append('password', password);
    formData.append('address', address.trim());
    if (lat.trim()) formData.append('lat', lat.trim());
    if (lng.trim()) formData.append('lng', lng.trim());
    skills.forEach((s) => formData.append('skills[]', s));

    const aadharFile = {
      uri: aadhar.uri,
      name: aadhar.fileName || 'aadhar.jpg',
      type: aadhar.mimeType || 'image/jpeg',
    } as unknown as Blob;
    formData.append('aadhar_image', aadharFile);

    if (photo) {
      const photoFile = {
        uri: photo.uri,
        name: photo.fileName || 'photo.jpg',
        type: photo.mimeType || 'image/jpeg',
      } as unknown as Blob;
      formData.append('photo', photoFile);
    }

    try {
      setLoading(true);
      await electricianRegisterApi.register(formData);
      Alert.alert(
        'Application Submitted',
        'Your registration is under review. You will be notified once approved.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }],
      );
    } catch (err) {
      Alert.alert('Registration failed', apiError(err, 'Something went wrong. Please try again.'));
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
        <View style={styles.header}>
          <Text style={styles.brand}>⚡ E Vision</Text>
          <Text style={styles.title}>Electrician Registration</Text>
          <Text style={styles.subtitle}>Apply to join our network</Text>
        </View>

        <View style={styles.card}>
          <Field label="Full Name *" value={name} onChange={setName} placeholder="Ravi Kumar" />
          <Field
            label="Phone *"
            value={phone}
            onChange={setPhone}
            placeholder="+91 9876543210"
            keyboardType="phone-pad"
          />
          <Field
            label="Email *"
            value={email}
            onChange={setEmail}
            placeholder="ravi@example.com"
            keyboardType="email-address"
          />
          <Field
            label="Password *"
            value={password}
            onChange={setPassword}
            placeholder="Min 8 characters"
            secure
          />
          <Field label="Address *" value={address} onChange={setAddress} placeholder="Street, City" />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field
                label="Latitude"
                value={lat}
                onChange={setLat}
                placeholder="28.6139"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Field
                label="Longitude"
                value={lng}
                onChange={setLng}
                placeholder="77.2090"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <Text style={styles.label}>Skills * (select all that apply)</Text>
          <View style={styles.skillsRow}>
            {SKILL_OPTIONS.map((s) => (
              <Pressable
                key={s}
                style={[styles.skillChip, skills.includes(s) && styles.skillChipActive]}
                onPress={() => toggleSkill(s)}
              >
                <Text style={[styles.skillText, skills.includes(s) && styles.skillTextActive]}>
                  {s}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Aadhar Card *</Text>
          <Pressable style={styles.uploadBtn} onPress={() => pickImage('aadhar')}>
            <Text style={styles.uploadBtnText}>
              {aadhar ? `✓ ${aadhar.fileName || 'Aadhar uploaded'}` : 'Upload Aadhar Image'}
            </Text>
          </Pressable>

          <Text style={styles.label}>Profile Photo (optional)</Text>
          <Pressable style={styles.uploadBtn} onPress={() => pickImage('photo')}>
            <Text style={styles.uploadBtnText}>
              {photo ? `✓ ${photo.fileName || 'Photo uploaded'}` : 'Upload Profile Photo'}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={submit}
            disabled={loading}
          >
            <Text style={styles.btnText}>{loading ? 'Submitting…' : 'Submit Application'}</Text>
          </Pressable>

          <Pressable style={styles.link} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>Already registered? Sign in →</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  secure,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  secure?: boolean;
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#64748b"
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={secure}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050b1a' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 20 },
  header: { alignItems: 'center', gap: 6 },
  brand: { fontSize: 28, fontWeight: '800', color: '#3b82f6' },
  title: { fontSize: 20, fontWeight: '700', color: '#e2e8f0' },
  subtitle: { fontSize: 14, color: '#64748b' },
  card: {
    backgroundColor: '#0d1626',
    borderRadius: 16,
    padding: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  label: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  input: {
    backgroundColor: '#142035',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#e2e8f0',
    fontSize: 15,
  },
  row: { flexDirection: 'row' },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: {
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#142035',
  },
  skillChipActive: { borderColor: '#3b82f6', backgroundColor: '#1e3a5f' },
  skillText: { color: '#94a3b8', fontSize: 13 },
  skillTextActive: { color: '#93c5fd', fontWeight: '600' },
  uploadBtn: {
    backgroundColor: '#142035',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  uploadBtnText: { color: '#3b82f6', fontSize: 14, fontWeight: '600' },
  btn: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  link: { alignItems: 'center', marginTop: 4 },
  linkText: { color: '#3b82f6', fontSize: 14 },
});
