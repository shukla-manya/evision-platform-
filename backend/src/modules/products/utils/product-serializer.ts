import type { UserRole } from '../../../common/decorators/roles.decorator';

export type PriceViewerRole = UserRole | 'guest' | 'unregistered';

function stripInternalPrices(p: Record<string, any>) {
  const { price_customer: _pc, price_dealer: _pd, ...rest } = p;
  return rest;
}

/**
 * Public catalog pricing: customer/guest/admin/electrician → customer price only;
 * dealer → dealer price only; superadmin → both (operations / analytics).
 */
export function serializeProductForRole(
  product: Record<string, any>,
  role: PriceViewerRole,
): Record<string, any> {
  const out = { ...stripInternalPrices(product) };

  if (role === 'dealer') {
    out.price_dealer = Number(product.price_dealer);
    return out;
  }

  if (role === 'superadmin') {
    out.price_customer = Number(product.price_customer);
    out.price_dealer = Number(product.price_dealer);
    return out;
  }

  out.price_customer = Number(product.price_customer);
  return out;
}

export function serializeProductsForRole(
  products: Record<string, any>[],
  role: PriceViewerRole,
): Record<string, any>[] {
  return products.map((p) => serializeProductForRole(p, role));
}
