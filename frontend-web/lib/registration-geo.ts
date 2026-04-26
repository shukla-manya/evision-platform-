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
