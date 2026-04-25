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
 * Price visibility (enforced at response layer — never put both prices on customer/dealer payloads).
 *
 * - **customer, guest, unregistered, admin, electrician** → only `price_customer`
 * - **dealer** → only `price_dealer`
 * - **superadmin** → both `price_customer` and `price_dealer`
 */
export function serializeProductForRole(
  product: Record<string, unknown>,
  role: PriceViewerRole,
): Record<string, unknown> {
  const out = baseWithoutPrices(product) as Record<string, unknown>;

  if (role === 'dealer') {
    out.price_dealer = Number(product.price_dealer);
    delete out.price_customer;
    return out;
  }

  if (role === 'superadmin') {
    out.price_customer = Number(product.price_customer);
    out.price_dealer = Number(product.price_dealer);
    return out;
  }

  // customer, guest, unregistered, admin, electrician — retail price only
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
