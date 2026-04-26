import * as Location from 'expo-location';

export async function geocodeIndia(city: string, pincode: string): Promise<{ lat: number; lng: number }> {
  const q = `${pincode.trim()} ${city.trim()} India`;
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
    { headers: { Accept: 'application/json', 'Accept-Language': 'en' } },
  );
  if (!res.ok) throw new Error('Location lookup failed');
  const data = (await res.json()) as { lat?: string; lon?: string }[];
  const hit = data?.[0];
  if (!hit?.lat || !hit?.lon) throw new Error('Could not find that city and pincode on the map');
  return { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) };
}

export async function getExpoGeolocation(): Promise<{ lat: number; lng: number } | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
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
