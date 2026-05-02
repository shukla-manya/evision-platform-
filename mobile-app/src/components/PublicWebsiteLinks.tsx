import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { publicWebUrl } from '../config/publicWeb';
import { colors } from '../theme/colors';

const LINKS: { label: string; path: string }[] = [
  { label: 'Store home', path: '/' },
  { label: 'Shop', path: '/shop' },
  { label: 'About', path: '/about' },
  { label: 'Contact', path: '/contact' },
  { label: 'Newsletter', path: '/contact#contact-newsletter' },
  { label: 'FAQs', path: '/faq' },
  { label: 'Privacy', path: '/privacy' },
];

/** Signed-out: partner CTAs + Returns (matches web `PublicFooter` Installation & partners); signed-in: hidden. */
export function PublicWebsiteLinks({
  audience,
  onOpenAbout,
  onOpenContact,
}: {
  audience: 'signed_in' | 'signed_out';
  /** When set, “About” opens in-app instead of the browser. */
  onOpenAbout?: () => void;
  /** When set, “Contact” opens in-app instead of the browser. */
  onOpenContact?: () => void;
}) {
  const open = (path: string) => () => {
    const base = path.split('#')[0] ?? path;
    if (base === '/about' && onOpenAbout) {
      onOpenAbout();
      return;
    }
    if (base === '/contact' && onOpenContact) {
      onOpenContact();
      return;
    }
    void Linking.openURL(publicWebUrl(path));
  };

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
          <Text style={styles.returnsLabel}>Returns</Text>
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  linkText: {
    fontSize: 13,
    color: colors.brandPrimary,
    fontWeight: '700',
  },
  returnsLabel: {
    fontSize: 14,
    color: colors.brandPrimary,
    fontWeight: '700',
  },
  returnsHit: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.brandPrimary,
    backgroundColor: colors.surface,
  },
});
