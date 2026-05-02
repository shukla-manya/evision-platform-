import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { publicBrandName } from '../config/publicMarketing';

/** Shopper-facing: category = shop section; brand = optional label (e.g. Puma vs Nike). */
export function CatalogPlacementHint() {
  return (
    <View style={styles.box}>
      <Text style={styles.title}>Category & brand</Text>
      <Text style={styles.body}>
        Items are grouped under a <Text style={styles.strong}>category</Text> in the {publicBrandName} shop.{' '}
        <Text style={styles.strong}>Brand</Text> (when shown) is an extra label — e.g. Puma vs Nike — and you can filter
        by brand on the website shop.
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
