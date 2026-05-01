import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import {
  homeCustomerReviewsHeadingSubtitle,
  homeCustomerReviewsHeadingTitle,
} from '../lib/home-customer-reviews';
import { colors } from '../theme/colors';

const RING = 72;

/** Orbiting dot + title (matches web `CustomerReviewsHeading`). */
export function CustomerReviewsHeading() {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 14000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.wrap}>
      <View style={styles.ringOuter} accessible={false} accessibilityElementsHidden>
        <Animated.View style={[styles.orbit, { transform: [{ rotate }] }]}>
          <View style={styles.dot} />
        </Animated.View>
      </View>
      <Text style={styles.title}>{homeCustomerReviewsHeadingTitle}</Text>
      <Text style={styles.sub}>{homeCustomerReviewsHeadingSubtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  ringOuter: {
    width: RING,
    height: RING,
    marginBottom: 12,
    borderRadius: RING / 2,
    borderWidth: 2,
    borderColor: 'rgba(232, 83, 42, 0.35)',
    backgroundColor: 'rgba(232, 83, 42, 0.06)',
    overflow: 'hidden',
  },
  orbit: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    paddingTop: 3,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brandPrimary,
  },
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
