import Svg, { Circle, Defs, LinearGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

export type EvisionLogoVariant = 'full' | 'mark';

type Props = {
  variant?: EvisionLogoVariant;
  /** Total width when variant is full */
  width?: number;
  height?: number;
  /** Wordmark on light backgrounds */
  wordmark?: string;
  /** Dark text for wordmark (light page) vs white (dark header) */
  wordmarkOnLight?: boolean;
};

/**
 * E vision brand — same geometry as web `EvisionLogo` / `public/logo.svg`.
 */
export function EvisionLogo({
  variant = 'full',
  width = 200,
  height = 44,
  wordmark = 'E vision',
  wordmarkOnLight = true,
}: Props) {
  const gid = 'ev-mobile-logo-grad';

  if (variant === 'mark') {
    const s = height;
    return (
      <Svg width={s} height={s} viewBox="0 0 40 40" accessibilityRole="image" accessibilityLabel="E vision">
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#1a1a2e" />
            <Stop offset="55%" stopColor="#2c2c54" />
            <Stop offset="100%" stopColor="#e8532a" />
          </LinearGradient>
        </Defs>
        <Rect width={40} height={40} rx={10} fill={`url(#${gid})`} />
        <Circle cx={20} cy={20} r={11} fill="none" stroke="#ffffff" strokeOpacity={0.22} strokeWidth={1.2} />
        <Circle cx={20} cy={20} r={6.5} fill="none" stroke="#ffffff" strokeOpacity={0.45} strokeWidth={1.4} />
        <Circle cx={20} cy={20} r={3} fill="#ffffff" />
      </Svg>
    );
  }

  const textColor = wordmarkOnLight ? '#1a1a2e' : '#ffffff';
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 200 44"
      accessibilityRole="image"
      accessibilityLabel={wordmark}
    >
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#1a1a2e" />
          <Stop offset="55%" stopColor="#2c2c54" />
          <Stop offset="100%" stopColor="#e8532a" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={2} width={40} height={40} rx={10} fill={`url(#${gid})`} />
      <Circle cx={20} cy={22} r={11} fill="none" stroke="#ffffff" strokeOpacity={0.22} strokeWidth={1.2} />
      <Circle cx={20} cy={22} r={6.5} fill="none" stroke="#ffffff" strokeOpacity={0.45} strokeWidth={1.4} />
      <Circle cx={20} cy={22} r={3} fill="#ffffff" />
      <SvgText
        x={50}
        y={30}
        fill={textColor}
        fontSize={18}
        fontWeight="700"
        fontFamily="System"
      >
        {wordmark}
      </SvgText>
    </Svg>
  );
}
