import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { publicWebUrl } from '../config/publicWeb';
import { colors } from '../theme/colors';

const LINKS: { label: string; path: string }[] = [
  { label: 'FAQs', path: '/faq' },
  { label: 'Privacy', path: '/privacy' },
  { label: 'About', path: '/about' },
  { label: 'Contact', path: '/contact' },
];

/** Signed-out: “Returns” opens storefront sign-in; signed-in: Returns row hidden (matches web footer). */
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
      {audience === 'signed_out' ? (
        <Pressable
          accessibilityRole="link"
          accessibilityHint="Opens sign in on the website"
          onPress={() => void Linking.openURL(publicWebUrl('/login'))}
          style={styles.returnsHit}
        >
          <Text style={styles.muted}>Returns</Text>
        </Pressable>
      ) : null}
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
    fontSize: 13,
    color: colors.muted,
  },
  returnsHit: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
});
