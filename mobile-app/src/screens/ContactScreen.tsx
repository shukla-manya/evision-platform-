import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { footerPolicyLinks, footerQuickNavLinks } from '../lib/site-quick-links';
import {
  aboutBrandSummary,
  publicCopyrightNotice,
  publicInfoEmail,
  publicMarketingEmail,
  publicRegisteredAddress,
  publicSalesPhoneDisplay,
  publicSalesTelHref,
  publicSupportEmail,
  publicSupportPhoneDisplay,
  publicSupportTelHref,
} from '../config/publicMarketing';
import { publicWebUrl } from '../config/publicWeb';
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
          Submit the form — our server emails the team and sends you a confirmation with what you entered.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>24/7 Support</Text>
          <Pressable onPress={() => void Linking.openURL(publicSupportTelHref())}>
            <Text style={styles.link}>{publicSupportPhoneDisplay}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Free Shipping</Text>
          <Text style={styles.muted}>All over India</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Email Us</Text>
          <Pressable onPress={() => void Linking.openURL(`mailto:${publicInfoEmail}`)}>
            <Text style={styles.link}>{publicInfoEmail}</Text>
          </Pressable>
          <Pressable onPress={() => void Linking.openURL(`mailto:${publicSupportEmail}`)}>
            <Text style={[styles.link, { marginTop: 6 }]}>{publicSupportEmail}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact Number</Text>
          <Pressable onPress={() => void Linking.openURL(publicSalesTelHref())}>
            <Text style={styles.link}>{publicSalesPhoneDisplay}</Text>
          </Pressable>
          <Pressable onPress={() => void Linking.openURL(publicSupportTelHref())}>
            <Text style={[styles.link, { marginTop: 6 }]}>{publicSupportPhoneDisplay}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Address</Text>
          <Text style={styles.muted}>{publicRegisteredAddress}</Text>
        </View>

        <Text style={styles.sectionTitle}>Get in Touch</Text>
        {formSuccess ? (
          <View style={[styles.card, styles.successCard]}>
            <Text style={styles.successTitle}>Thank you, {formSuccess.greeting_name}!</Text>
            <Text style={styles.muted}>
              Your message was delivered. We sent a confirmation to {formSuccess.email} with a copy of your details.
            </Text>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryHeading}>What you sent</Text>
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
            <Text style={styles.hint}>Confirmation is sent from our mail server.</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Subscribe us</Text>
        <View style={styles.card}>
          {subSuccessEmail ? (
            <Text style={styles.muted}>
              Thank you! We received your subscription for <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{subSuccessEmail}</Text>.
              Check your inbox for a short confirmation.
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
              <Text style={styles.hint}>Marketing is notified and you get a confirmation email.</Text>
            </>
          )}
        </View>

        <Text style={[styles.muted, { marginTop: 20, lineHeight: 22 }]}>{aboutBrandSummary}</Text>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Quick links</Text>
        {footerQuickNavLinks.map(({ path, label }) => (
          <Pressable key={path + label} onPress={() => void Linking.openURL(publicWebUrl(path))}>
            <Text style={styles.quickLink}>{label}</Text>
          </Pressable>
        ))}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Policies</Text>
        {footerPolicyLinks.map(({ path, label }) => (
          <Pressable key={path + label} onPress={() => void Linking.openURL(publicWebUrl(path))}>
            <Text style={styles.quickLink}>{label}</Text>
          </Pressable>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Contact Information</Text>
        <Pressable onPress={() => void Linking.openURL(publicSalesTelHref())}>
          <Text style={styles.link}>{publicSalesPhoneDisplay}</Text>
        </Pressable>
        <Pressable onPress={() => void Linking.openURL(publicSupportTelHref())}>
          <Text style={[styles.link, { marginTop: 6 }]}>{publicSupportPhoneDisplay}</Text>
        </Pressable>
        <Pressable onPress={() => void Linking.openURL(`mailto:${publicMarketingEmail}`)}>
          <Text style={[styles.link, { marginTop: 6 }]}>{publicMarketingEmail}</Text>
        </Pressable>
        <Pressable onPress={() => void Linking.openURL(`mailto:${publicSupportEmail}`)}>
          <Text style={[styles.link, { marginTop: 6 }]}>{publicSupportEmail}</Text>
        </Pressable>
        <Text style={[styles.muted, { marginTop: 10 }]}>{publicRegisteredAddress}</Text>

        <Text style={[styles.copyright, { marginTop: 28 }]}>{publicCopyrightNotice}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  pad: { paddingHorizontal: screenGutter, paddingBottom: 32 },
  h1: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  lead: { fontSize: 14, color: colors.textSecondary, lineHeight: 22, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 10, marginTop: 8 },
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
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  muted: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
  link: { fontSize: 15, color: colors.brandPrimary, fontWeight: '600' },
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
  quickLink: { fontSize: 14, color: colors.brandPrimary, fontWeight: '600', paddingVertical: 8 },
  copyright: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
});
