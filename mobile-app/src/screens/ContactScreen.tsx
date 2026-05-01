import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { aboutBrandSummary } from '../config/publicMarketing';
import { publicWebUrl } from '../config/publicWeb';
import { HOME_LEAD_FORM_IMAGE_URI } from '../lib/home-lead-form';
import { publicContactApi, type ContactMessageResponse } from '../services/api';
import { colors } from '../theme/colors';
import { screenGutter } from '../theme/layout';

function apiErrorMessage(err: unknown, fallback: string): string {
  const d = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  const m = d?.message;
  if (typeof m === 'string') return m;
  if (Array.isArray(m)) return m.join(', ');
  return fallback;
}

export function ContactScreen() {
  const { width: winW } = useWindowDimensions();
  const twoCol = winW >= 720;
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [subscribeEmail, setSubscribeEmail] = useState('');

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState<ContactMessageResponse | null>(null);

  const [subSubmitting, setSubSubmitting] = useState(false);
  const [subSuccessEmail, setSubSuccessEmail] = useState<string | null>(null);

  const sendMessage = useCallback(async () => {
    const fn = firstName.trim();
    const ln = lastName.trim();
    const em = email.trim();
    const msg = message.trim();
    if (!fn || !ln || !em || !msg) {
      Alert.alert('Missing fields', 'Please fill in first name, last name, email, and your message.');
      return;
    }
    try {
      setFormSubmitting(true);
      const { data } = await publicContactApi.submitMessage({
        first_name: fn,
        last_name: ln,
        email: em,
        message: msg,
      });
      setFormSuccess(data);
      setFirstName('');
      setLastName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      Alert.alert('Could not send', apiErrorMessage(err, 'Please try again in a moment.'));
    } finally {
      setFormSubmitting(false);
    }
  }, [firstName, lastName, email, message]);

  const subscribe = useCallback(async () => {
    const em = subscribeEmail.trim();
    if (!em) {
      Alert.alert('Email required', 'Enter your email to subscribe.');
      return;
    }
    try {
      setSubSubmitting(true);
      const { data } = await publicContactApi.subscribeNewsletter({ email: em });
      setSubSuccessEmail(data.email);
      setSubscribeEmail('');
    } catch (err) {
      Alert.alert('Subscribe failed', apiErrorMessage(err, 'Please try again later.'));
    } finally {
      setSubSubmitting(false);
    }
  }, [subscribeEmail]);

  const resetFormSuccess = useCallback(() => setFormSuccess(null), []);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <Text style={styles.h1}>Get in Touch</Text>
        <Text style={styles.lead}>
          We are here for orders, accounts, dealers, technicians, and partnerships. Submit the form below — we email our
          team and send you a confirmation with everything you entered.
        </Text>
        <Text style={styles.leadSub}>
          Phone numbers, marketing and support email, and our office address are in the{' '}
          <Text
            style={styles.footerInlineLink}
            onPress={() => void Linking.openURL(publicWebUrl('/#site-footer-contact'))}
          >
            site footer
          </Text>
          {' '}
          on the website (scroll to the bottom or tap the link).
        </Text>

        <Text style={styles.brandCenter}>{aboutBrandSummary}</Text>

        <View style={[styles.splitWrap, twoCol ? styles.splitWrapRow : null]}>
          <View style={[styles.imageCol, twoCol ? styles.imageColRow : null]}>
            <Image
              source={{ uri: HOME_LEAD_FORM_IMAGE_URI }}
              style={styles.heroImage}
              resizeMode="cover"
              accessibilityLabel="CCTV camera installed for home and business security"
            />
            <View style={styles.imageTint} />
          </View>

          <View style={[styles.formColumn, twoCol ? styles.formColumnRow : null]}>
        {formSuccess ? (
          <View style={[styles.card, styles.successCard]}>
            <Text style={styles.successTitle}>Thank you, {formSuccess.greeting_name}!</Text>
            <Text style={styles.muted}>
              Your message was delivered to our team. We also sent a confirmation email to{' '}
              <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{formSuccess.email}</Text> with a copy of
              what you submitted.
            </Text>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryHeading}>Here is what we have on file:</Text>
              <Text style={styles.summaryLine}>
                <Text style={styles.summaryLabel}>Name: </Text>
                {formSuccess.first_name} {formSuccess.last_name}
              </Text>
              <Text style={styles.summaryLine}>
                <Text style={styles.summaryLabel}>Email: </Text>
                {formSuccess.email}
              </Text>
              <Text style={styles.summaryLabel}>Message</Text>
              <Text style={styles.summaryMessage}>{formSuccess.message}</Text>
            </View>
            <Pressable style={styles.btnSecondary} onPress={resetFormSuccess}>
              <Text style={styles.btnSecondaryText}>Send another message</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.formCardTitle}>Send a message</Text>
            <Text style={styles.label}>First name</Text>
            <TextInput
              style={styles.input}
              placeholder="First name"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />
            <Text style={[styles.label, { marginTop: 10 }]}>Last name</Text>
            <TextInput
              style={styles.input}
              placeholder="Last name"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />
            <Text style={[styles.label, { marginTop: 10 }]}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={[styles.label, { marginTop: 10 }]}>Your Message</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Your Message"
              value={message}
              onChangeText={setMessage}
              multiline
              textAlignVertical="top"
            />
            <Pressable
              style={[styles.btnPrimary, formSubmitting && styles.btnDisabled]}
              onPress={() => void sendMessage()}
              disabled={formSubmitting}
            >
              {formSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnPrimaryText}>Send Message</Text>
              )}
            </Pressable>
            <Text style={styles.hint}>Delivered through our server; check your inbox for the confirmation.</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Subscribe us</Text>
        <View style={styles.card}>
          {subSuccessEmail ? (
            <Text style={styles.muted}>
              Thank you! We received your subscription request for{' '}
              <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{subSuccessEmail}</Text>. You should get a
              short confirmation email shortly.
            </Text>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Your email"
                value={subscribeEmail}
                onChangeText={setSubscribeEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Pressable
                style={[styles.btnSecondary, { marginTop: 12 }, subSubmitting && styles.btnDisabled]}
                onPress={() => void subscribe()}
                disabled={subSubmitting}
              >
                {subSubmitting ? (
                  <ActivityIndicator color={colors.brandPrimary} />
                ) : (
                  <Text style={styles.btnSecondaryText}>Subscribe</Text>
                )}
              </Pressable>
              <Text style={styles.hint}>We notify marketing and email you a confirmation.</Text>
            </>
          )}
        </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  pad: { paddingHorizontal: screenGutter, paddingBottom: 32 },
  h1: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  lead: { fontSize: 14, color: colors.textSecondary, lineHeight: 22, marginBottom: 8, maxWidth: 640 },
  leadSub: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
    maxWidth: 640,
    opacity: 0.92,
  },
  brandCenter: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 640,
    alignSelf: 'center',
    marginBottom: 22,
    paddingHorizontal: 4,
  },
  footerInlineLink: { color: colors.brandPrimary, fontWeight: '600' },
  splitWrap: { marginTop: 8, gap: 16 },
  splitWrapRow: { flexDirection: 'row', alignItems: 'stretch' },
  imageCol: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.softPanel,
    minHeight: 200,
  },
  imageColRow: { flex: 1, minWidth: 0, minHeight: 280 },
  heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  imageTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26,26,46,0.12)' },
  formColumn: { gap: 12 },
  formColumnRow: { flex: 1, minWidth: 0, gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 10, marginTop: 8 },
  formCardTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 16 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  successCard: { borderColor: colors.brandPrimary, backgroundColor: 'rgba(232, 83, 42, 0.08)' },
  successTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  summaryBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryHeading: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  summaryLine: { fontSize: 14, color: colors.textPrimary, marginBottom: 6 },
  summaryLabel: { fontWeight: '700', color: colors.textSecondary },
  summaryMessage: { fontSize: 14, color: colors.textPrimary, marginTop: 4, lineHeight: 22 },
  muted: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  textarea: { minHeight: 120, paddingTop: 10 },
  btnPrimary: {
    marginTop: 16,
    backgroundColor: colors.brandPrimary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnSecondary: {
    marginTop: 12,
    borderWidth: 2,
    borderColor: colors.brandPrimary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  btnSecondaryText: { color: colors.brandPrimary, fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.55 },
  hint: { fontSize: 12, color: colors.textSecondary, marginTop: 8 },
});
