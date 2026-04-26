import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { publicWebUrl } from '../config/publicWeb';
import { colors } from '../theme/colors';

const LINKS: { label: string; path: string }[] = [
  { label: 'FAQs', path: '/faq' },
  { label: 'Privacy', path: '/privacy' },
  { label: 'About', path: '/about' },
  { label: 'Contact', path: '/contact' },
];

/** Matches web footer: signed-out users see a muted “Returns” line; signed-in users do not. */
export function PublicWebsiteLinks({ audience }: { audience: 'signed_in' | 'signed_out' }) {
  const open = (path: string) => () => void Linking.openURL(publicWebUrl(path));

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>On the website</Text>
      <View style={styles.row}>
        {LINKS.map(({ label, path }) => (
          <Pressable key={path} onPress={open(path)} style={styles.linkHit}>
            <Text style={styles.linkText}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {audience === 'signed_out' ? <Text style={styles.muted}>Returns</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
  },
  linkHit: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginRight: 8,
  },
  linkText: {
    fontSize: 14,
    color: colors.brandPrimary,
    fontWeight: '600',
  },
  muted: {
    marginTop: 10,
    fontSize: 13,
    color: colors.muted,
  },
});
