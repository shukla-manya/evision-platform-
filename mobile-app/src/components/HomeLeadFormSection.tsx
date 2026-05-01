import { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { publicSupportEmail } from '../config/publicMarketing';
import { publicWebUrl } from '../config/publicWeb';
import { HOME_LEAD_FORM_IMAGE_URI, HOME_LEAD_FORM_TITLE } from '../lib/home-lead-form';
import { colors } from '../theme/colors';

export function HomeLeadFormSection() {
  const { width: winW } = useWindowDimensions();
  const twoCol = winW >= 720;
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const submit = useCallback(async () => {
    const subject = encodeURIComponent(`Website inquiry — ${firstName} ${lastName}`.trim());
    const body = encodeURIComponent(`Name: ${firstName} ${lastName}\nEmail: ${email}\n\nMessage:\n${message}`);
    const url = `mailto:${publicSupportEmail}?subject=${subject}&body=${body}`;
    const ok = await Linking.canOpenURL(url).catch(() => false);
    if (ok) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Email', `Copy your message and email ${publicSupportEmail}, or use the contact page on the web.`);
    }
  }, [firstName, lastName, email, message]);

  return (
    <View style={[styles.wrap, twoCol ? styles.wrapRow : null]}>
      <View style={[styles.imageCol, twoCol ? styles.imageColRow : null]}>
        <Image
          source={{ uri: HOME_LEAD_FORM_IMAGE_URI }}
          style={styles.image}
          resizeMode="cover"
          accessibilityLabel="CCTV camera installed for home and business security"
        />
        <View style={styles.imageTint} />
      </View>
      <View style={[styles.formCol, twoCol ? styles.formColRow : null]}>
        <Text style={styles.title}>{HOME_LEAD_FORM_TITLE}</Text>
        <View style={styles.nameRow}>
          <View style={styles.fieldGrow}>
            <Text style={styles.label}>First name</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor={colors.muted}
              style={styles.input}
              autoCapitalize="words"
              autoComplete="name-given"
            />
          </View>
          <View style={styles.fieldGrow}>
            <Text style={styles.label}>Last name</Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              placeholderTextColor={colors.muted}
              style={styles.input}
              autoCapitalize="words"
              autoComplete="name-family"
            />
          </View>
        </View>
        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={colors.muted}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </View>
        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Your message</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Your message"
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.textarea]}
            multiline
            textAlignVertical="top"
          />
        </View>
        <Pressable style={styles.submitBtn} onPress={() => void submit()} accessibilityRole="button">
          <Text style={styles.submitBtnText}>Submit</Text>
        </Pressable>
        <View style={styles.helperRow}>
          <Text style={styles.helper}>
            Opens your email app to send to <Text style={styles.helperEm}>{publicSupportEmail}</Text>. Or{' '}
          </Text>
          <Pressable onPress={() => void Linking.openURL(publicWebUrl('/contact'))} accessibilityRole="link">
            <Text style={styles.helperLink}>contact page</Text>
          </Pressable>
          <Text style={styles.helper}>.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 16,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 16,
  },
  wrapRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 18,
  },
  imageCol: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.softPanel,
    minHeight: 200,
  },
  imageColRow: {
    flex: 1,
    minWidth: 0,
    minHeight: 280,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  imageTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,26,46,0.12)',
  },
  formCol: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 12,
  },
  formColRow: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  fieldGrow: { flex: 1, minWidth: 120 },
  fieldBlock: { gap: 4 },
  label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.softPanel,
  },
  textarea: { minHeight: 110, paddingTop: 10 },
  submitBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brandPrimary,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
    marginTop: 4,
  },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  helperRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 0,
    marginTop: 4,
  },
  helper: { fontSize: 11, color: colors.textSecondary, lineHeight: 17 },
  helperEm: { fontWeight: '700', color: colors.textPrimary },
  helperLink: { fontSize: 11, color: colors.brandPrimary, fontWeight: '700', textDecorationLine: 'underline' },
});
