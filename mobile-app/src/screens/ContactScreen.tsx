import { useCallback, useState } from 'react';
import {
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
import { contactPageQuickLinks } from '../lib/contact-quick-links';
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
import { colors } from '../theme/colors';
import { screenGutter } from '../theme/layout';

function buildMailto(to: string, subject: string, body: string) {
  const q = new URLSearchParams();
  q.set('subject', subject);
  q.set('body', body);
  return `mailto:${to}?${q.toString()}`;
}

export function ContactScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [subscribeEmail, setSubscribeEmail] = useState('');

  const sendMessage = useCallback(() => {
    const body = [`Name: ${firstName.trim()} ${lastName.trim()}`.trim(), `Email: ${email.trim()}`, '', message.trim()].join(
      '\n',
    );
    const href = buildMailto(publicSupportEmail, 'App contact — Evision', body);
    void Linking.openURL(href).catch(() => Alert.alert('Unable to open email', 'Install a mail app or email us at ' + publicSupportEmail));
  }, [firstName, lastName, email, message]);

  const subscribe = useCallback(() => {
    const em = subscribeEmail.trim();
    if (!em) {
      Alert.alert('Email required', 'Enter your email to subscribe.');
      return;
    }
    const href = buildMailto(publicMarketingEmail, 'Newsletter subscribe — Evision', `Please add:\n${em}`);
    void Linking.openURL(href).catch(() => Alert.alert('Unable to open email', 'Write to ' + publicMarketingEmail));
  }, [subscribeEmail]);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <Text style={styles.h1}>Get in Touch</Text>
        <Text style={styles.lead}>
          Orders, accounts, dealers, technicians, and partnerships. The button below opens your mail app with your message
          to our support team.
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
          <Pressable style={styles.btnPrimary} onPress={sendMessage}>
            <Text style={styles.btnPrimaryText}>Send Message</Text>
          </Pressable>
          <Text style={styles.hint}>Opens your mail app to {publicSupportEmail}.</Text>
        </View>

        <Text style={styles.sectionTitle}>Subscribe us</Text>
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Your email"
            value={subscribeEmail}
            onChangeText={setSubscribeEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Pressable style={[styles.btnSecondary, { marginTop: 12 }]} onPress={subscribe}>
            <Text style={styles.btnSecondaryText}>Subscribe</Text>
          </Pressable>
          <Text style={styles.hint}>Sends a request to {publicMarketingEmail}.</Text>
        </View>

        <Text style={[styles.muted, { marginTop: 20, lineHeight: 22 }]}>{aboutBrandSummary}</Text>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Quick Links</Text>
        {contactPageQuickLinks.map(({ path, label }) => (
          <Pressable
            key={path + label}
            onPress={() => {
              if (path === '/contact') {
                return;
              }
              void Linking.openURL(publicWebUrl(path));
            }}
            disabled={path === '/contact'}
          >
            <Text style={[styles.quickLink, path === '/contact' && styles.quickLinkCurrent]}>{label}</Text>
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
  },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnSecondary: {
    borderWidth: 2,
    borderColor: colors.brandPrimary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnSecondaryText: { color: colors.brandPrimary, fontSize: 15, fontWeight: '700' },
  hint: { fontSize: 12, color: colors.textSecondary, marginTop: 8 },
  quickLink: { fontSize: 14, color: colors.brandPrimary, fontWeight: '600', paddingVertical: 8 },
  quickLinkCurrent: { color: colors.textSecondary, fontWeight: '500' },
  copyright: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
});
