import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import type { ServiceFlowStackParams } from './ServiceRequestScreen';

type Props = NativeStackScreenProps<ServiceFlowStackParams, 'ServiceBookingConfirm'>;

export function ServiceBookingConfirmScreen({ navigation, route }: Props) {
  const { bookingId, electricianName } = route.params;
  const rootNav = navigation as unknown as {
    navigate: (name: string, params?: Record<string, unknown>) => void;
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.pad}>
        <Text style={styles.title}>Booking sent</Text>
        <Text style={styles.body}>
          {electricianName
            ? `${electricianName} has been notified. They have up to 2 hours to accept.`
            : 'The electrician has been notified. They have up to 2 hours to accept.'}
        </Text>
        <Text style={styles.meta}>Booking ID: {bookingId.slice(0, 8)}…</Text>

        <Pressable
          style={styles.primary}
          onPress={() =>
            rootNav.navigate('Main', {
              screen: 'ServiceTracking',
              params: { bookingId },
            })
          }
        >
          <Text style={styles.primaryText}>Track service</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => rootNav.navigate('Main')}>
          <Text style={styles.secondaryText}>Back to home</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  pad: { padding: 20, gap: 14 },
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  body: { fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
  meta: { fontSize: 12, color: colors.muted },
  primary: {
    marginTop: 20,
    backgroundColor: colors.brandPrimary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondary: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: { color: colors.brandPrimary, fontWeight: '600' },
});
