import { Image, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  aboutBrandSummary,
  aboutPrimaryVisualAlt,
  aboutPrimaryVisualSrc,
  aboutWhatWeProvideParagraphs,
  aboutWhatWeProvideTitle,
  premierServiceCards,
  premierServicesIntro,
  premierServicesTitle,
} from '../lib/about-company-content';
import { colors } from '../theme/colors';
import { screenGutter } from '../theme/layout';

const PREMIER_ICONS = ['view-grid-outline', 'home-variant-outline', 'shield-check-outline', 'video-wireless-outline'] as const;

export function AboutScreen() {
  const { width: winW } = useWindowDimensions();
  /** Match web `md` breakpoint — image left, copy right from here up. */
  const twoCol = winW >= 768;

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <View style={styles.trustStrip}>
          <Text style={styles.trustStrong}>24/7 Support</Text>
          <Text style={styles.trustMuted}> · </Text>
          <Text style={styles.trustMuted}>
            <Text style={styles.trustEm}>Free shipping</Text> — All over India
          </Text>
        </View>

        <Text style={styles.kicker}>Company</Text>
        <Text style={styles.h1}>About E-Vision India</Text>

        {/* Narrow: image then copy stacked · Wide: image left, copy right */}
        <View style={[styles.split, twoCol ? styles.splitRow : null]}>
          <View style={[styles.visualCol, twoCol ? styles.visualColRow : null]}>
            <View style={styles.primaryImgWrap}>
              <Image
                source={{ uri: aboutPrimaryVisualSrc }}
                style={styles.primaryImg}
                resizeMode="cover"
                accessibilityLabel={aboutPrimaryVisualAlt}
              />
              <View style={styles.imgTint} />
            </View>
          </View>
          <View style={[styles.copyCol, twoCol ? styles.copyColRow : null]}>
            <Text style={styles.h2}>{aboutWhatWeProvideTitle}</Text>
            {aboutWhatWeProvideParagraphs.map((p) => (
              <Text key={p.slice(0, 48)} style={styles.para}>
                {p}
              </Text>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitleCenter}>{premierServicesTitle}</Text>
        <Text style={styles.introCenter}>{premierServicesIntro}</Text>
        <View style={styles.premierGrid}>
          {premierServiceCards.map((card, i) => (
            <View key={card.title} style={styles.premierCard}>
              <View style={styles.premierIconWrap}>
                <MaterialCommunityIcons
                  name={PREMIER_ICONS[i] ?? 'shield-check-outline'}
                  size={24}
                  color={colors.brandPrimary}
                />
              </View>
              <Text style={styles.premierCardTitle}>{card.title}</Text>
              <Text style={styles.premierCardBody}>{card.body}</Text>
            </View>
          ))}
        </View>

        <View style={styles.summaryBox}>
          <Text style={styles.summary}>{aboutBrandSummary}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  pad: { paddingHorizontal: screenGutter, paddingBottom: 36 },
  trustStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: -screenGutter,
    paddingHorizontal: screenGutter,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  trustStrong: { fontSize: 13, fontWeight: '700', color: colors.brandPrimary },
  trustMuted: { fontSize: 13, color: colors.textSecondary },
  trustEm: { fontWeight: '700', color: colors.textPrimary },
  kicker: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  h1: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, marginBottom: 20, letterSpacing: -0.5 },
  split: { gap: 16, marginBottom: 28 },
  splitRow: { flexDirection: 'row', alignItems: 'flex-start' },
  visualCol: { gap: 12 },
  visualColRow: { flex: 1, minWidth: 0, alignSelf: 'flex-start' },
  primaryImgWrap: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    aspectRatio: 16 / 9,
    maxHeight: 320,
    backgroundColor: colors.softPanel,
  },
  primaryImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  imgTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26,26,46,0.15)' },
  copyCol: { gap: 12 },
  copyColRow: { flex: 1, minWidth: 0, flexBasis: 0, paddingLeft: 16 },
  h2: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, textAlign: 'left' },
  para: { fontSize: 14, lineHeight: 22, color: colors.textSecondary, textAlign: 'left' },
  sectionTitleCenter: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  introCenter: { fontSize: 13, lineHeight: 20, color: colors.textSecondary, textAlign: 'center', marginBottom: 18 },
  premierGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  premierCard: {
    flexGrow: 1,
    minWidth: 148,
    flexBasis: '45%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
  },
  premierIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(232, 83, 42, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  premierCardTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginBottom: 6 },
  premierCardBody: { fontSize: 13, lineHeight: 20, color: colors.textSecondary },
  summaryBox: {
    marginTop: 8,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summary: { fontSize: 14, lineHeight: 22, color: colors.textSecondary, textAlign: 'center' },
});
