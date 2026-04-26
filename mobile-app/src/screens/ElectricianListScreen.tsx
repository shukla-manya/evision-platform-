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

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await publicElectricianApi.nearby(lat, lng);
      setRows(data || []);
    } catch {
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

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        contentContainerStyle={styles.list}
        data={rows}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<Text style={styles.muted}>No available electricians within 10 km.</Text>}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: colors.background },
  list: { padding: 16, gap: 12, paddingBottom: 32 },
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
  muted: { textAlign: 'center', color: colors.textSecondary, padding: 24 },
});
