import type { UserRole } from '../../../common/decorators/roles.decorator';

export type PriceViewerRole = UserRole | 'guest' | 'unregistered';

function baseWithoutPrices(p: Record<string, unknown>) {
  const { price_customer: _pc, price_dealer: _pd, ...rest } = p as Record<string, unknown> & {
    price_customer?: unknown;
    price_dealer?: unknown;
  };
  return { ...rest } as Record<string, unknown>;
}

/**
 * Price visibility (enforced at response layer — wrong price fields are never included).
 *
 * - **customer**, **guest**, **unregistered**, **electrician** → only `price_customer`
 * - **dealer** → only `price_dealer`
 * - **superadmin** → both `price_customer` and `price_dealer`
 */
export function serializeProductForRole(
  product: Record<string, unknown>,
  role: PriceViewerRole,
): Record<string, unknown> {
  const out = baseWithoutPrices(product) as Record<string, unknown>;

  if (role === 'superadmin') {
    out.price_customer = Number(product.price_customer);
    out.price_dealer = Number(product.price_dealer);
    return out;
  }

  if (role === 'dealer') {
    out.price_dealer = Number(product.price_dealer);
    delete out.price_customer;
    const retailRef = Number(product.mrp ?? product.price_customer ?? 0);
    if (!Number.isNaN(retailRef) && retailRef > 0) {
      out.mrp = retailRef;
    }
    const minQ = Math.max(1, Number(product.min_order_quantity || 1));
    out.min_order_quantity = minQ;
    return out;
  }

  // customer, guest, unregistered, electrician — retail only (never wholesale)
  out.price_customer = Number(product.price_customer);
  delete out.price_dealer;
  return out;
}

export function serializeProductsForRole(
  products: Record<string, unknown>[],
  role: PriceViewerRole,
): Record<string, unknown>[] {
  return products.map((p) => serializeProductForRole(p, role));
}
