import { StyleSheet, Text, View } from 'react-native';
import { aboutBrandSummary } from '../lib/about-company-content';
import { colors } from '../theme/colors';
import { screenGutter } from '../theme/layout';

/** Same line as web `PublicFooter` — shown once per screen / above tab bar (not duplicated in page bodies). */
export function GlobalBrandSummaryStrip() {
  return (
    <View style={styles.wrap} accessibilityRole="text">
      <Text style={styles.text}>{aboutBrandSummary}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 10,
    paddingHorizontal: screenGutter,
    backgroundColor: colors.softPanel,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  text: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
