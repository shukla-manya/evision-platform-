import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { AxiosError } from 'axios';
import { bookingsApi, Booking } from '../services/api';

function apiError(err: unknown, fallback: string) {
  const e = err as AxiosError<{ message?: string | string[] }>;
  const msg = e?.response?.data?.message;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.join(', ');
  return fallback;
}

type RouteParams = { BookingDetail: { booking: Booking } };
type Props = {
  route: RouteProp<RouteParams, 'BookingDetail'>;
  navigation: any;
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function BookingDetailScreen({ route, navigation }: Props) {
  const { booking } = route.params;
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null);

  const respond = async (action: 'accept' | 'decline') => {
    Alert.alert(
      action === 'accept' ? 'Accept booking?' : 'Decline booking?',
      action === 'accept'
        ? 'You will be assigned to this job.'
        : 'The customer will be notified.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'accept' ? 'Accept' : 'Decline',
          style: action === 'decline' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              setLoading(action);
              await bookingsApi.respond(booking.id, action);
              Alert.alert(
                action === 'accept' ? 'Accepted!' : 'Declined',
                action === 'accept'
                  ? 'Booking confirmed. Head to the Active Job tab.'
                  : 'Booking declined.',
                [{ text: 'OK', onPress: () => navigation.goBack() }],
              );
            } catch (err) {
              Alert.alert('Error', apiError(err, `Failed to ${action} booking.`));
            } finally {
              setLoading(null);
            }
          },
        },
      ],
    );
  };

  const isPending = booking.status === 'pending';
  const expiresAt = new Date(booking.expires_at);
  const isExpired = Date.now() > expiresAt.getTime();

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Booking Details</Text>
          <View style={[styles.statusChip, !isPending && styles.statusChipDim]}>
            <Text style={styles.statusChipText}>
              {booking.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <InfoRow label="Booking ID" value={`#${booking.id.slice(-10).toUpperCase()}`} />
          <InfoRow label="Request ID" value={booking.request_id.slice(-10).toUpperCase()} />
          <InfoRow label="Customer ID" value={booking.customer_id.slice(-10).toUpperCase()} />
          <InfoRow
            label="Received"
            value={new Date(booking.created_at).toLocaleString()}
          />
          <InfoRow
            label="Expires"
            value={isExpired ? '⚠ Expired' : expiresAt.toLocaleString()}
          />
          {booking.job_status && (
            <InfoRow label="Job Status" value={booking.job_status.replace(/_/g, ' ')} />
          )}
        </View>

        {isPending && !isExpired ? (
          <View style={styles.actions}>
            <Pressable
              style={[styles.acceptBtn, loading && styles.btnDisabled]}
              onPress={() => respond('accept')}
              disabled={!!loading}
            >
              {loading === 'accept' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.acceptBtnText}>✓ Accept Booking</Text>
              )}
            </Pressable>
            <Pressable
              style={[styles.declineBtn, loading && styles.btnDisabled]}
              onPress={() => respond('decline')}
              disabled={!!loading}
            >
              {loading === 'decline' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.declineBtnText}>✗ Decline</Text>
              )}
            </Pressable>
          </View>
        ) : isPending && isExpired ? (
          <View style={styles.expiredBox}>
            <Text style={styles.expiredText}>This booking has expired.</Text>
          </View>
        ) : booking.status === 'accepted' ? (
          <Pressable
            style={styles.acceptBtn}
            onPress={() => navigation.navigate('ActiveJob')}
          >
            <Text style={styles.acceptBtnText}>→ Go to Active Job</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050b1a' },
  container: { padding: 20, gap: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#e2e8f0' },
  statusChip: {
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusChipDim: { backgroundColor: '#1e3a5f' },
  statusChipText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  card: {
    backgroundColor: '#0d1626',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  rowLabel: { color: '#64748b', fontSize: 13, flex: 1 },
  rowValue: { color: '#e2e8f0', fontSize: 13, fontWeight: '600', flex: 2, textAlign: 'right' },
  actions: { gap: 10 },
  acceptBtn: {
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  declineBtn: {
    backgroundColor: '#0d1626',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  declineBtnText: { color: '#dc2626', fontWeight: '700', fontSize: 16 },
  btnDisabled: { opacity: 0.5 },
  expiredBox: {
    backgroundColor: '#1c0a0a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  expiredText: { color: '#f87171', fontWeight: '600', fontSize: 15 },
});
