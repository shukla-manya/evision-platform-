import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { AxiosError } from 'axios';
import { bookingsApi, Booking } from '../services/api';
import { emitLocation, getSocket } from '../services/socket';

function apiError(err: unknown, fallback: string) {
  const e = err as AxiosError<{ message?: string | string[] }>;
  const msg = e?.response?.data?.message;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.join(', ');
  return fallback;
}

type JobStatus = 'accepted' | 'on_the_way' | 'reached' | 'work_started' | 'completed';

const STATUS_FLOW: JobStatus[] = ['accepted', 'on_the_way', 'reached', 'work_started', 'completed'];

const STATUS_LABELS: Record<JobStatus, string> = {
  accepted: 'Accepted',
  on_the_way: 'On the Way',
  reached: 'Reached',
  work_started: 'Work Started',
  completed: 'Completed',
};

const STATUS_COLORS: Record<JobStatus, string> = {
  accepted: '#1d4ed8',
  on_the_way: '#0891b2',
  reached: '#7c3aed',
  work_started: '#b45309',
  completed: '#16a34a',
};

type Props = { navigation: any };

export default function ActiveJobScreen({ navigation }: Props) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await bookingsApi.active();
      setBooking(data[0] || null);
    } catch (err) {
      Alert.alert('Error', apiError(err, 'Failed to load active job.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  // Start broadcasting GPS when status is on_the_way
  useEffect(() => {
    const jobStatus = booking?.job_status as JobStatus | null;

    if (jobStatus === 'on_the_way' && booking) {
      startLocationBroadcast(booking.id);
    } else {
      stopLocationBroadcast();
    }

    return () => stopLocationBroadcast();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking?.job_status, booking?.id]);

  const startLocationBroadcast = async (bookingId: string) => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location permission required', 'Enable location to share your position with the client.');
      return;
    }

    if (!getSocket()?.connected) {
      Alert.alert('Not connected', 'Socket not connected. Restart the app.');
      return;
    }

    setBroadcasting(true);
    locationIntervalRef.current = setInterval(async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        emitLocation(bookingId, loc.coords.latitude, loc.coords.longitude);
      } catch {
        // Location read failed, try again next interval
      }
    }, 4000); // every 4 seconds
  };

  const stopLocationBroadcast = () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
    setBroadcasting(false);
  };

  const advanceStatus = async () => {
    if (!booking) return;
    const current = booking.job_status as JobStatus;
    const currentIdx = STATUS_FLOW.indexOf(current);
    const next = STATUS_FLOW[currentIdx + 1] as JobStatus | undefined;
    if (!next || next === 'accepted') return;

    Alert.alert(
      `Mark as "${STATUS_LABELS[next]}"?`,
      next === 'completed' ? 'This will complete the job and notify the client.' : undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setUpdating(true);
              await bookingsApi.updateStatus(booking.id, next as any);
              setBooking((b) => b ? { ...b, job_status: next } : b);
              if (next === 'completed') {
                Alert.alert('Job completed!', 'Great work! The client has been prompted to leave a review.');
              }
            } catch (err) {
              Alert.alert('Error', apiError(err, 'Failed to update status.'));
            } finally {
              setUpdating(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <ActivityIndicator color="#3b82f6" size="large" />
          <Text style={styles.loadingText}>Loading active job…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🔧</Text>
          <Text style={styles.emptyText}>No active job</Text>
          <Text style={styles.emptySubtext}>Accept a booking from the Home tab to start</Text>
          <Pressable style={styles.refreshBtn} onPress={load}>
            <Text style={styles.refreshBtnText}>Refresh</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const currentStatus = booking.job_status as JobStatus;
  const currentIdx = STATUS_FLOW.indexOf(currentStatus);
  const isCompleted = currentStatus === 'completed';
  const nextStatus = !isCompleted ? STATUS_FLOW[currentIdx + 1] as JobStatus : null;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Job ID + status */}
        <View style={styles.jobHeader}>
          <Text style={styles.jobTitle}>Active Job</Text>
          <View style={[styles.statusPill, { backgroundColor: STATUS_COLORS[currentStatus] + '33' }]}>
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[currentStatus] }]} />
            <Text style={[styles.statusPillText, { color: STATUS_COLORS[currentStatus] }]}>
              {STATUS_LABELS[currentStatus]}
            </Text>
          </View>
        </View>

        <Text style={styles.bookingId}>#{booking.id.slice(-10).toUpperCase()}</Text>

        {/* Broadcasting indicator */}
        {broadcasting && (
          <View style={styles.broadcastBanner}>
            <ActivityIndicator color="#22c55e" size="small" />
            <Text style={styles.broadcastText}>📡 Broadcasting your location to client…</Text>
          </View>
        )}

        {/* Status timeline */}
        <View style={styles.timeline}>
          {STATUS_FLOW.filter((s) => s !== 'accepted').map((step, i) => {
            const stepIdx = STATUS_FLOW.indexOf(step);
            const done = stepIdx <= currentIdx;
            const active = step === currentStatus;
            return (
              <View key={step} style={styles.timelineRow}>
                <View style={[styles.timelineCircle, done && styles.timelineCircleDone, active && styles.timelineCircleActive]}>
                  <Text style={styles.timelineNum}>{done ? '✓' : String(i + 1)}</Text>
                </View>
                {i < 3 && <View style={[styles.timelineLine, done && styles.timelineLineDone]} />}
                <Text style={[styles.timelineLabel, active && styles.timelineLabelActive]}>
                  {STATUS_LABELS[step]}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Next action button */}
        {!isCompleted && nextStatus && (
          <Pressable
            style={[styles.nextBtn, { backgroundColor: STATUS_COLORS[nextStatus] }, updating && styles.btnDisabled]}
            onPress={advanceStatus}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.nextBtnText}>
                {nextStatus === 'on_the_way' ? '🚗 ' : nextStatus === 'reached' ? '📍 ' : nextStatus === 'work_started' ? '🔧 ' : '✅ '}
                Mark as "{STATUS_LABELS[nextStatus]}"
              </Text>
            )}
          </Pressable>
        )}

        {isCompleted && (
          <View style={styles.completedBox}>
            <Text style={styles.completedIcon}>🎉</Text>
            <Text style={styles.completedText}>Job Completed!</Text>
            <Text style={styles.completedSub}>Client has been notified and prompted for a review.</Text>
          </View>
        )}

        {/* Upload photo button */}
        <Pressable
          style={styles.photoBtn}
          onPress={() => navigation.navigate('UploadPhoto', { bookingId: booking.id })}
        >
          <Text style={styles.photoBtnText}>📷 Upload Job Photo</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050b1a' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingText: { color: '#64748b', fontSize: 14 },
  emptyIcon: { fontSize: 52 },
  emptyText: { color: '#94a3b8', fontSize: 20, fontWeight: '700' },
  emptySubtext: { color: '#475569', fontSize: 14, textAlign: 'center' },
  refreshBtn: {
    backgroundColor: '#1e3a5f',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 8,
  },
  refreshBtnText: { color: '#3b82f6', fontWeight: '600' },
  container: { padding: 20, gap: 16, paddingBottom: 40 },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jobTitle: { fontSize: 24, fontWeight: '800', color: '#e2e8f0' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  bookingId: { color: '#475569', fontSize: 13, marginTop: -8 },
  broadcastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#052e16',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#166534',
  },
  broadcastText: { color: '#22c55e', fontSize: 13, fontWeight: '600', flex: 1 },
  timeline: {
    backgroundColor: '#0d1626',
    borderRadius: 14,
    padding: 20,
    gap: 0,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  timelineCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineCircleDone: { backgroundColor: '#166534' },
  timelineCircleActive: { backgroundColor: '#1d4ed8' },
  timelineNum: { color: '#fff', fontSize: 11, fontWeight: '700' },
  timelineLine: {
    position: 'absolute',
    left: 14,
    top: 32,
    width: 2,
    height: 20,
    backgroundColor: '#1e3a5f',
  },
  timelineLineDone: { backgroundColor: '#166534' },
  timelineLabel: { color: '#64748b', fontSize: 14, fontWeight: '500' },
  timelineLabelActive: { color: '#e2e8f0', fontWeight: '700' },
  nextBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  btnDisabled: { opacity: 0.5 },
  completedBox: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#052e16',
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,
    borderColor: '#166534',
  },
  completedIcon: { fontSize: 40 },
  completedText: { color: '#22c55e', fontWeight: '700', fontSize: 20 },
  completedSub: { color: '#4ade80', fontSize: 13, textAlign: 'center' },
  photoBtn: {
    backgroundColor: '#0d1626',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  photoBtnText: { color: '#94a3b8', fontWeight: '600', fontSize: 15 },
});
