import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  formatIndianPhoneDisplay,
  publicCompanyLegalName,
  publicInfoEmail,
  publicMarketingEmail,
  publicOfficeGoogleMapsSearchUrl,
  publicRegisteredAddress,
  publicSalesPhoneDisplay,
  publicSupportEmail,
  publicSupportPhoneDisplay,
  publicSalesTelHref,
  publicSupportTelHref,
} from '../config/publicMarketing';
import { colors } from '../theme/colors';

const year = new Date().getFullYear();
const MANYA_WA = 'https://wa.me/918005586588';

const payuCopy =
  'Checkout is processed securely through PayU. You can pay with UPI, debit and credit cards, net banking, and supported wallets where enabled for your order.';

export function TechnicianWorkspaceFooter() {
  const openUrl = (url: string) => () => void Linking.openURL(url);

  return (
    <View style={styles.outer}>
      <View style={styles.contactPanel}>
        <Text style={styles.sectionTitle}>Registered office & helpdesk</Text>

        <Text style={styles.dt}>Sales desk</Text>
        <Pressable onPress={openUrl(publicSalesTelHref())}>
          <Text style={styles.link}>{formatIndianPhoneDisplay(publicSalesPhoneDisplay)}</Text>
        </Pressable>

        <Text style={[styles.dt, styles.dtSp]}>Customer support</Text>
        <Pressable onPress={openUrl(publicSupportTelHref())}>
          <Text style={styles.link}>{formatIndianPhoneDisplay(publicSupportPhoneDisplay)}</Text>
        </Pressable>

        <Text style={[styles.dt, styles.dtSp]}>Email</Text>
        <Pressable onPress={openUrl(`mailto:${publicMarketingEmail}`)}>
          <Text style={styles.emailLine}>
            <Text style={styles.link}>{publicMarketingEmail}</Text>
            <Text style={styles.emailHint}> — corporate & dealer</Text>
          </Text>
        </Pressable>
        <Pressable onPress={openUrl(`mailto:${publicSupportEmail}`)}>
          <Text style={styles.emailLine}>
            <Text style={styles.link}>{publicSupportEmail}</Text>
            <Text style={styles.emailHint}> — orders & product help</Text>
          </Text>
        </Pressable>
        <Pressable onPress={openUrl(`mailto:${publicInfoEmail}`)}>
          <Text style={styles.emailLine}>
            <Text style={styles.link}>{publicInfoEmail}</Text>
            <Text style={styles.emailHint}> — general enquiries</Text>
          </Text>
        </Pressable>

        <Text style={styles.payuTitle}>Payment options</Text>
        <Text style={styles.payuBody}>{payuCopy}</Text>

        <Pressable style={styles.mapBtn} onPress={openUrl(publicOfficeGoogleMapsSearchUrl())}>
          <Text style={styles.mapBtnText}>Open office on Google Maps</Text>
        </Pressable>
      </View>

      <View style={styles.bottomBar}>
        <Text style={styles.copyright}>
          © {year} {publicCompanyLegalName}. All rights reserved.
        </Text>
        <Text style={styles.reg}>
          <Text style={styles.regLabel}>Registered office: </Text>
          {publicRegisteredAddress}
        </Text>
        <View style={styles.attrRow}>
          <Text style={styles.attrMuted}>Made with </Text>
          <MaterialCommunityIcons name="heart" size={14} color={colors.brandPrimary} style={styles.heart} />
          <Text style={styles.attrMuted}> by </Text>
          <Pressable onPress={openUrl(MANYA_WA)}>
            <Text style={styles.attrLink}>Manya Shukla</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginTop: 8,
    marginHorizontal: -2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  contactPanel: {
    backgroundColor: colors.footer,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 16,
  },
  dt: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 4,
  },
  dtSp: { marginTop: 12 },
  link: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
  emailLine: { marginTop: 6 },
  emailHint: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  payuTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
    marginBottom: 8,
  },
  payuBody: {
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.6)',
  },
  mapBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  mapBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  bottomBar: {
    backgroundColor: colors.navbar,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  copyright: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },
  reg: {
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 10,
    textAlign: 'center',
  },
  regLabel: { color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  attrRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 2,
  },
  attrMuted: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  attrLink: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.65)', textDecorationLine: 'underline' },
  heart: { marginHorizontal: 2 },
});
