import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { colors } from '../theme/colors';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const BRAND = colors.brandPrimary;
const BG = colors.background;

/**
 * Decorative strip above browse tiles: animated “network” line and five site silhouettes.
 */
export function BrowseBySiteAnimatedSvg() {
  const dashPhase = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(dashPhase, {
        toValue: 1,
        duration: 2400,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [dashPhase]);

  const strokeDashoffset = dashPhase.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -72],
  });

  return (
    <View
      style={styles.wrap}
      accessibilityRole="image"
      accessibilityLabel="Security solutions for business, farm, hospital, house, and school"
    >
      <Svg width="100%" height={92} viewBox="0 0 520 88" preserveAspectRatio="xMidYMid meet">
        <Defs>
          <LinearGradient id="mbBrowseWire" x1="0" y1="0" x2="520" y2="0">
            <Stop offset="0" stopColor={BRAND} stopOpacity={0.28} />
            <Stop offset="0.5" stopColor={BRAND} stopOpacity={0.72} />
            <Stop offset="1" stopColor={BRAND} stopOpacity={0.28} />
          </LinearGradient>
        </Defs>

        <AnimatedPath
          d="M44 66 C132 52 188 78 260 66 S388 52 476 66"
          stroke="url(#mbBrowseWire)"
          strokeWidth={2.25}
          strokeLinecap="round"
          fill="none"
          strokeDasharray="10 14"
          strokeDashoffset={strokeDashoffset}
        />

        <G>
          <Circle cx="44" cy="66" r="5" fill={BRAND} fillOpacity={0.22} />
          <G transform="translate(44, 34)">
            <Rect x={-14} y={4} width={28} height={18} rx={1.5} fill={BRAND} fillOpacity={0.35} />
            <Rect x={-10} y={-8} width={20} height={14} rx={1.5} fill={BRAND} fillOpacity={0.55} />
            <Rect x={-6} y={-20} width={12} height={14} rx={1} fill={BRAND} />
          </G>
        </G>

        <G>
          <Circle cx="132" cy="66" r="5" fill={BRAND} fillOpacity={0.22} />
          <G transform="translate(132, 34)">
            <Path d="M-18 20 L0 -14 L18 20 Z" fill={BRAND} fillOpacity={0.45} />
            <Rect x={-16} y={20} width={32} height={12} rx={1.5} fill={BRAND} />
          </G>
        </G>

        <G>
          <Circle cx="260" cy="66" r="5" fill={BRAND} fillOpacity={0.22} />
          <G transform="translate(260, 34)">
            <Rect x={-14} y={-6} width={28} height={30} rx={2} fill={BRAND} />
            <Path d="M-2 -14 h4v4h4v4h-4v4h-4v-4h-4v-4h4z" fill={BG} />
          </G>
        </G>

        <G>
          <Circle cx="388" cy="66" r="5" fill={BRAND} fillOpacity={0.22} />
          <G transform="translate(388, 34)">
            <Path d="M-20 22 L0 -12 L20 22 Z" fill={BRAND} />
            <Rect x={-14} y={22} width={28} height={14} rx={1.5} fill={BRAND} fillOpacity={0.72} />
          </G>
        </G>

        <G>
          <Circle cx="476" cy="66" r="5" fill={BRAND} fillOpacity={0.22} />
          <G transform="translate(476, 34)">
            <Rect x={-14} y={-4} width={28} height={26} rx={1.5} fill={BRAND} />
            <Rect x={10} y={-18} width={3} height={16} fill={BRAND} fillOpacity={0.55} />
            <Path d="M13 -18 L22 -14 L13 -10 Z" fill={BRAND} fillOpacity={0.4} />
          </G>
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 10,
    marginTop: 2,
    alignSelf: 'stretch',
  },
});
