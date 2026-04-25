import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { serviceApi, ServiceBookingHistoryRow } from '../services/api';
import { colors } from '../theme/colors';
import type { ServiceFlowStackParams } from './ServiceRequestScreen';

type Props = NativeStackScreenProps<ServiceFlowStackParams, 'ServiceHistory'>;

export function ServiceHistoryScreen({ navigation }: Props) {
  const [rows, setRows] = useState<ServiceBookingHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await serviceApi.listMyBookingHistory();
      setRows(data || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.brandPrimary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        contentContainerStyle={styles.list}
        data={rows}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<Text style={styles.muted}>No completed service visits yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{String(item.electrician_name || 'Electrician')}</Text>
            <Text style={styles.meta}>{String(item.request_summary?.issue || 'Service')}</Text>
            <Pressable
              style={styles.btn}
              onPress={() =>
                navigation.navigate('LeaveReview', {
                  electricianId: String(item.electrician_id),
                  electricianName: String(item.electrician_name || ''),
                })
              }
            >
              <Text style={styles.btnText}>Leave review</Text>
            </Pressable>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    gap: 8,
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  meta: { fontSize: 13, color: colors.textSecondary },
  btn: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnText: { color: '#fff', fontWeight: '600' },
  muted: { textAlign: 'center', color: colors.textSecondary, padding: 24 },
});
