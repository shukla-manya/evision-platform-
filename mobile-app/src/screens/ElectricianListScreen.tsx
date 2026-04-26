import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { publicElectricianApi, NearbyElectrician } from '../services/api';
import { colors } from '../theme/colors';
import type { ServiceFlowStackParams } from './ServiceRequestScreen';

type Props = NativeStackScreenProps<ServiceFlowStackParams, 'ElectricianList'>;

export function ElectricianListScreen({ navigation, route }: Props) {
  const { lat, lng, serviceRequestId } = route.params;
  const [rows, setRows] = useState<NearbyElectrician[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadFailed(false);
      const { data } = await publicElectricianApi.nearby(lat, lng);
      setRows(data || []);
    } catch {
      setLoadFailed(true);
      Alert.alert('Error', 'Could not load electricians.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [lat, lng]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.brandPrimary} />
        <Text style={styles.muted}>Finding nearby electricians…</Text>
      </SafeAreaView>
    );
  }

  if (loadFailed) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyTitle}>Something went wrong</Text>
        <Text style={styles.muted}>We couldn&apos;t reach the server. Check your connection.</Text>
        <Pressable style={styles.retryBtn} onPress={() => void load()}>
          <Text style={styles.retryLabel}>Try again</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        contentContainerStyle={rows.length === 0 ? styles.listEmpty : styles.list}
        data={rows}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji} accessibilityLabel="">
              📍
            </Text>
            <Text style={styles.emptyTitle}>No electricians nearby</Text>
            <Text style={styles.emptyBody}>
              There are no approved, available technicians within 10 km of this location. Try again later or adjust the
              service address when you submit your request.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() =>
              navigation.navigate('ElectricianPublicProfile', {
                electricianId: String(item.id),
                serviceRequestId,
              })
            }
          >
            <Text style={styles.name}>{String(item.name || 'Electrician')}</Text>
            <Text style={styles.meta}>
              ★ {Number(item.rating_avg || 0).toFixed(1)} ({Number(item.rating_count || 0)} reviews) ·{' '}
              {item.distance_km != null ? `${item.distance_km} km` : '—'}
            </Text>
            {Array.isArray(item.skills) && item.skills.length > 0 ? (
              <Text style={styles.skills}>{item.skills.join(', ')}</Text>
            ) : null}
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: colors.background, padding: 24 },
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  listEmpty: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  name: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  meta: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  skills: { fontSize: 12, color: colors.muted, marginTop: 6 },
  muted: { textAlign: 'center', color: colors.textSecondary, paddingHorizontal: 24 },
  emptyWrap: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 12 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  emptyBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21, maxWidth: 320 },
  retryBtn: {
    marginTop: 16,
    backgroundColor: colors.brandPrimary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  retryLabel: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
