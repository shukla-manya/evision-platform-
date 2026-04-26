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
import { serviceApi, ServiceBookingHistoryRow } from '../services/api';
import { colors } from '../theme/colors';
import type { ServiceFlowStackParams } from './ServiceRequestScreen';

type Props = NativeStackScreenProps<ServiceFlowStackParams, 'ServiceHistory'>;

export function ServiceHistoryScreen({ navigation }: Props) {
  const [rows, setRows] = useState<ServiceBookingHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadFailed(false);
      const { data } = await serviceApi.listMyBookingHistory();
      setRows(data || []);
    } catch {
      setLoadFailed(true);
      setRows([]);
      Alert.alert('Error', 'Could not load service history.');
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
        <Text style={styles.loadingHint}>Loading history…</Text>
      </SafeAreaView>
    );
  }

  if (loadFailed) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyTitle}>Something went wrong</Text>
        <Text style={styles.muted}>Check your connection, then try again.</Text>
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
            <Text style={styles.emptyTitle}>No past visits</Text>
            <Text style={styles.emptyBody}>
              When a technician completes a service for you, it will appear here so you can leave a review.
            </Text>
          </View>
        }
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 10 },
  loadingHint: { fontSize: 14, color: colors.textSecondary, marginTop: 8 },
  list: { padding: 16, gap: 12 },
  listEmpty: { flexGrow: 1, padding: 24, justifyContent: 'center' },
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
  muted: { textAlign: 'center', color: colors.textSecondary, paddingHorizontal: 16 },
  emptyWrap: { alignItems: 'center', paddingVertical: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  emptyBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21, maxWidth: 320 },
  retryBtn: {
    marginTop: 12,
    backgroundColor: colors.brandPrimary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  retryLabel: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
