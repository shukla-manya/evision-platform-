/** Uses India Post data via postalpincode.in (public JSON API). */

const MIN_CITY_LEN = 3;

type PostalOfficeRow = { Pincode?: string; DeliveryStatus?: string };

function normalizePostOffices(raw: unknown): PostalOfficeRow[] {
  if (!raw) return [];
  return Array.isArray(raw) ? (raw as PostalOfficeRow[]) : [raw as PostalOfficeRow];
}

async function fetchPinForPostOfficeQuery(q: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.postalpincode.in/postoffice/${encodeURIComponent(q)}`);
    if (!res.ok) return null;
    const json: unknown = await res.json();
    const root = Array.isArray(json) ? json[0] : json;
    if (!root || typeof root !== 'object') return null;
    const status = String((root as { Status?: string }).Status || '');
    if (status !== 'Success') return null;
    const list = normalizePostOffices((root as { PostOffice?: unknown }).PostOffice);
    const withPin = list
      .map((o) => ({
        pin: String(o.Pincode ?? '').replace(/\D/g, '').slice(0, 6),
        delivery: String(o.DeliveryStatus ?? '').toLowerCase(),
      }))
      .filter((x) => /^\d{6}$/.test(x.pin));
    if (withPin.length === 0) return null;
    const delivery = withPin.find((x) => x.delivery === 'delivery');
    return delivery?.pin ?? withPin[0]!.pin;
  } catch {
    return null;
  }
}

/** Returns a representative 6-digit pincode for the city name, or null if lookup fails. */
export async function suggestPincodeForIndianCity(city: string): Promise<string | null> {
  const q = city.trim().replace(/\s+/g, ' ');
  if (q.length < MIN_CITY_LEN) return null;
  const primary = await fetchPinForPostOfficeQuery(q);
  if (primary) return primary;
  if (!q.includes(' ')) return null;
  const parts = q.split(' ').filter(Boolean);
  const last = parts[parts.length - 1];
  if (!last || last.length < MIN_CITY_LEN || last === q) return null;
  return fetchPinForPostOfficeQuery(last);
}
