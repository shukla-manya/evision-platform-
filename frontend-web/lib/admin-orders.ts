/** Order row statuses that still need packing / shipment (aligned with admin orders UI). */
export const ADMIN_SHIPPABLE_STATUSES = new Set([
  'order_received',
  'payment_confirmed',
  'confirmed',
  'pending',
]);

export function orderNeedsShipment(status: string | undefined | null): boolean {
  return ADMIN_SHIPPABLE_STATUSES.has(String(status || '').toLowerCase());
}
