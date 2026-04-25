import { colors } from './colors';

const successStatuses = new Set([
  'delivered',
  'completed',
  'work_completed',
  'payment_confirmed',
  'order_received',
  'confirmed',
  'accepted',
  'reached',
  'work_started',
]);

const pendingStatuses = new Set([
  'pending',
  'shipment_created',
  'picked_up',
  'in_transit',
  'out_for_delivery',
  'on_the_way',
]);

const errorStatuses = new Set([
  'order_cancelled',
  'payment_failed',
  'declined',
  'cancelled',
  'failed',
]);

export function statusColor(status?: string | null) {
  const normalized = String(status || '').toLowerCase();
  if (successStatuses.has(normalized)) return colors.serviceSuccess;
  if (pendingStatuses.has(normalized)) return colors.pending;
  if (errorStatuses.has(normalized)) return colors.error;
  return colors.textSecondary;
}
