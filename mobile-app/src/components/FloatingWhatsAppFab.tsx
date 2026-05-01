import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatIndianPhoneDisplay, publicSupportPhoneDisplay, publicWhatsAppChatUrl } from '../config/publicMarketing';
import { colors } from '../theme/colors';

/** Floating WhatsApp — same support line as web; opens `wa.me`. */
export function FloatingWhatsAppFab() {
  const insets = useSafeAreaInsets();
  const display = formatIndianPhoneDisplay(publicSupportPhoneDisplay);
  const href = publicWhatsAppChatUrl();

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          bottom: Math.max(14, insets.bottom + 10),
          right: Math.max(14, insets.right + 8),
        },
      ]}
    >
      <Pressable
        style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
        onPress={() => void Linking.openURL(href)}
        accessibilityRole="link"
        accessibilityLabel={`Chat on WhatsApp, ${display}`}
      >
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="whatsapp" size={30} color="#fff" />
        </View>
        <Text style={styles.phone} numberOfLines={1}>
          {display}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: 9999,
    alignItems: 'flex-end',
  },
  pill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    maxWidth: 280,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#25D366',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
  },
  pillPressed: { opacity: 0.92 },
  iconWrap: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phone: {
    flexShrink: 1,
    paddingLeft: 10,
    paddingRight: 4,
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
    maxWidth: 200,
  },
});
