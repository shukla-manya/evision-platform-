/** Logical partition keys for each `evision_*` collection (matches former DynamoDB keys). */
export function evisionPartitionKeyFields(tableName: string): string[] {
  if (tableName === 'evision_cart_items') return ['user_id', 'id'];
  if (tableName === 'evision_order_items') return ['order_id', 'id'];
  if (tableName === 'evision_otps') return ['phone'];
  return ['id'];
}
