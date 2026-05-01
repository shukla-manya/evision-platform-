import * as Location from 'expo-location';
import { API_BASE_URL } from './services/api';

const REVERSE_GEOCODE_FETCH_MS = 8000;

async function fetchWithTimeout(
  input: string,
  init: RequestInit | undefined,
  timeoutMs: number,
): Promise<Response> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: ac.signal });
  } finally {
    clearTimeout(t);
  }
}

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

async function reverseGeocodeViaBackend(
  lat: number,
  lng: number,
): Promise<{ address: string; city: string; pincode: string } | null> {
  const base = API_BASE_URL.replace(/\/$/, '');
  if (!base) return null;
  try {
    const res = await fetchWithTimeout(
      `${base}/geo/reverse?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`,
      undefined,
      REVERSE_GEOCODE_FETCH_MS,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { address?: string; city?: string; pincode?: string };
    const address = String(data.address ?? '').trim();
    const city = String(data.city ?? '').trim();
    const pinRaw = String(data.pincode ?? '').replace(/\D/g, '').slice(0, 6);
    const pincode = pinRaw.length === 6 ? pinRaw : '';
    if (!address && !city) return null;
    return { address, city, pincode };
  } catch {
    return null;
  }
}

async function reverseGeocodeIndiaDirect(
  lat: number,
  lng: number,
): Promise<{ address: string; city: string; pincode: string } | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}&addressdetails=1`;
  try {
    const res = await fetchWithTimeout(url, { headers: { ...NOMINATIM_HEADERS } }, REVERSE_GEOCODE_FETCH_MS);
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

/** Reverse-geocode GPS to street / city / pin (OSM Nominatim via backend when possible). */
export async function reverseGeocodeIndia(
  lat: number,
  lng: number,
): Promise<{ address: string; city: string; pincode: string } | null> {
  const viaApi = await reverseGeocodeViaBackend(lat, lng);
  if (viaApi) return viaApi;
  return reverseGeocodeIndiaDirect(lat, lng);
}

export async function geocodeIndia(city: string, pincode: string): Promise<{ lat: number; lng: number }> {
  const pin = pincode.trim();
  const cty = city.trim();

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
    } catch {
      /* fall through */
    }
  }

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
  } catch {
    /* fall through */
  }

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
    } catch {
      /* fall through */
    }
  }

  throw new Error('Could not resolve location from city and pincode');
}

export async function getExpoGeolocation(): Promise<{ lat: number; lng: number } | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;

  const coords = (p: Location.LocationObject) => ({
    lat: p.coords.latitude,
    lng: p.coords.longitude,
  });

  try {
    const last = await Location.getLastKnownPositionAsync({ maxAge: 120_000 });
    if (last?.coords && Number.isFinite(last.coords.latitude) && Number.isFinite(last.coords.longitude)) {
      return coords(last);
    }
  } catch {
    /* fall through */
  }

  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
    return coords(pos);
  } catch {
    /* fall through */
  }

  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return coords(pos);
  } catch {
    /* fall through */
  }

  try {
    const last = await Location.getLastKnownPositionAsync();
    if (last?.coords && Number.isFinite(last.coords.latitude) && Number.isFinite(last.coords.longitude)) {
      return coords(last);
    }
  } catch {
    /* ignore */
  }

  return null;
}

/** Prefer GPS; fall back to city + pincode (India) via Nominatim. */
export async function resolveRegistrationCoordinates(
  city: string,
  pincode: string,
): Promise<{ lat: number; lng: number } | null> {
  const gps = await getExpoGeolocation();
  if (gps) return gps;
  try {
    return await geocodeIndia(city, pincode);
  } catch {
    return null;
  }
}
