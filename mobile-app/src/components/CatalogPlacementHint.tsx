import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { publicBrandName } from '../config/publicMarketing';

/** Shopper-facing: how catalogue items are grouped (matches web shop emphasis). */
export function CatalogPlacementHint() {
  return (
    <View style={styles.box}>
      <Text style={styles.title}>Categories</Text>
      <Text style={styles.body}>
        Items are grouped under a <Text style={styles.strong}>category</Text> in the {publicBrandName} catalogue — same as on
        the website shop.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.softPanel,
  },
  title: { fontSize: 13, fontWeight: '800', color: colors.textPrimary, marginBottom: 6 },
  body: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  strong: { fontWeight: '700', color: colors.textPrimary },
});
