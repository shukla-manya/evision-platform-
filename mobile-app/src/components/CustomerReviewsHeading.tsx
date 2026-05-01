import { StyleSheet, Text, View } from 'react-native';
import {
  homeCustomerReviewsHeadingSubtitle,
  homeCustomerReviewsHeadingTitle,
} from '../lib/home-customer-reviews';
import { colors } from '../theme/colors';

/** Section title + subtitle (matches web `CustomerReviewsHeading`). */
export function CustomerReviewsHeading() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{homeCustomerReviewsHeadingTitle}</Text>
      <Text style={styles.sub}>{homeCustomerReviewsHeadingSubtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  sub: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 360,
  },
});
