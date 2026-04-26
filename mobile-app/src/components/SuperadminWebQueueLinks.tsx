import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { publicWebUrl } from '../config/publicWeb';
import { colors } from '../theme/colors';

const QUEUES: { label: string; path: string }[] = [
  { label: 'Shop queue', path: '/super/shop-registrations' },
  { label: 'Technicians', path: '/super/technicians' },
  { label: 'Dealer GST', path: '/super/dealers' },
];

type Props = {
  /** When false, only the three queue buttons are shown (e.g. signed-in superadmin hub already has a page title). */
  showHeader?: boolean;
};

/**
 * Opens superadmin queue pages on the Next.js site. User must sign in on the web as superadmin if not already.
 */
export function SuperadminWebQueueLinks({ showHeader = true }: Props) {
  const open = (path: string) => () => void Linking.openURL(publicWebUrl(path));

  const buttons = (
    <View style={styles.row}>
      {QUEUES.map(({ label, path }) => (
        <Pressable key={path} onPress={open(path)} style={styles.btn}>
          <Text style={styles.btnText}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );

  if (!showHeader) {
    return <View style={styles.buttonsOnly}>{buttons}</View>;
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Platform administration</Text>
      <Text style={styles.hint}>Opens in your browser. Sign in on the web as superadmin if prompted.</Text>
      {buttons}
    </View>
  );
}

const styles = StyleSheet.create({
  buttonsOnly: {
    gap: 10,
  },
  wrap: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginBottom: 12,
  },
  row: {
    gap: 10,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brandPrimary,
  },
});
