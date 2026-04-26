const NOMINATIM_HEADERS = {
  Accept: 'application/json',
  'Accept-Language': 'en',
  'User-Agent': 'evision-platform/1.0 (shop-registration)',
} as const;

type NominatimAddress = {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  postcode?: string;
};

function pickCityFromNominatim(a: NominatimAddress): string {
  return (
    a.city ||
    a.town ||
    a.village ||
    a.county ||
    a.suburb ||
    ''
  ).trim();
}

function line1FromNominatim(a: NominatimAddress): string {
  const road = [a.house_number, a.road].filter(Boolean).join(' ').trim();
  const tail = [a.neighbourhood, a.suburb].filter(Boolean).join(', ');
  const parts = [road, tail].filter(Boolean);
  return parts.join(', ').trim();
}

/** Reverse-geocode coordinates to shop-style fields (India-friendly via OSM). */
export async function reverseGeocodeIndia(
  lat: number,
  lng: number,
): Promise<{ address: string; city: string; pincode: string } | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}&addressdetails=1`;
  try {
    const res = await fetch(url, { headers: NOMINATIM_HEADERS });
    if (!res.ok) return null;
    const data = (await res.json()) as { display_name?: string; address?: NominatimAddress };
    const a = data.address;
    if (!a) return null;
    const pinRaw = String(a.postcode ?? '').replace(/\D/g, '').slice(0, 6);
    const pincode = pinRaw.length === 6 ? pinRaw : '';
    const city = pickCityFromNominatim(a);
    let address = line1FromNominatim(a);
    if (!address && data.display_name) {
      address = data.display_name.split(',').slice(0, 3).join(',').trim();
    }
    if (!address && !city) return null;
    return { address, city, pincode };
  } catch {
    return null;
  }
}

/** Browser GPS; returns null if unavailable, denied, or timeout. */
export function getBrowserGeolocation(timeoutMs = 12000): Promise<{ lat: number; lng: number } | null> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const t = window.setTimeout(() => resolve(null), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(t);
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        window.clearTimeout(t);
        resolve(null);
      },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: timeoutMs },
    );
  });
}

export async function geocodeIndia(city: string, pincode: string): Promise<{ lat: number; lng: number }> {
  const pin = pincode.trim();
  const cty = city.trim();

  // Structured pincode lookup — Nominatim indexes Indian pincodes well with this param
  if (/^\d{6}$/.test(pin)) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&postalcode=${encodeURIComponent(pin)}&countrycodes=in`,
        { headers: { ...NOMINATIM_HEADERS } },
      );
      if (res.ok) {
        const data = (await res.json()) as { lat?: string; lon?: string }[];
        const hit = data?.[0];
        if (hit?.lat && hit?.lon) return { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) };
      }
    } catch { /* fall through */ }
  }

  // Free-text city + pincode
  try {
    const q = [pin, cty, 'India'].filter(Boolean).join(' ');
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
      { headers: { ...NOMINATIM_HEADERS } },
    );
    if (res.ok) {
      const data = (await res.json()) as { lat?: string; lon?: string }[];
      const hit = data?.[0];
      if (hit?.lat && hit?.lon) return { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) };
    }
  } catch { /* fall through */ }

  // City-only fallback
  if (cty) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(cty + ' India')}`,
        { headers: { ...NOMINATIM_HEADERS } },
      );
      if (res.ok) {
        const data = (await res.json()) as { lat?: string; lon?: string }[];
        const hit = data?.[0];
        if (hit?.lat && hit?.lon) return { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) };
      }
    } catch { /* fall through */ }
  }

  throw new Error('Could not resolve location from city and pincode');
}

/** Prefer device GPS; fall back to city + pincode centroid (India). */
export async function resolveRegistrationCoordinates(
  city: string,
  pincode: string,
): Promise<{ lat: number; lng: number } | null> {
  const gps = await getBrowserGeolocation();
  if (gps) return gps;
  try {
    return await geocodeIndia(city, pincode);
  } catch {
    return null;
  }
}
