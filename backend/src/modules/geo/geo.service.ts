import { Injectable, Logger } from '@nestjs/common';

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'evision-platform/1.0 (server reverse-geocode)';

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

function pickCity(a: NominatimAddress): string {
  return (a.city || a.town || a.village || a.county || a.suburb || '').trim();
}

function line1(a: NominatimAddress): string {
  const road = [a.house_number, a.road].filter(Boolean).join(' ').trim();
  const tail = [a.neighbourhood, a.suburb].filter(Boolean).join(', ');
  const parts = [road, tail].filter(Boolean);
  return parts.join(', ').trim();
}

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);

  /** Reverse-geocode via OSM Nominatim (server-side; safe User-Agent, no browser CORS). */
  async reverseIndia(
    lat: number,
    lng: number,
  ): Promise<{ address: string; city: string; pincode: string } | null> {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const url = `${NOMINATIM}/reverse?format=json&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}&addressdetails=1`;
    try {
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'en',
          'User-Agent': USER_AGENT,
        },
      });
      if (!res.ok) {
        this.logger.warn(`Nominatim reverse ${res.status} for ${lat},${lng}`);
        return null;
      }
      const data = (await res.json()) as { display_name?: string; address?: NominatimAddress };
      const a = data.address;
      if (!a) return null;
      const pinRaw = String(a.postcode ?? '').replace(/\D/g, '').slice(0, 6);
      const pincode = pinRaw.length === 6 ? pinRaw : '';
      const city = pickCity(a);
      let address = line1(a);
      if (!address && data.display_name) {
        address = data.display_name.split(',').slice(0, 3).join(',').trim();
      }
      if (!address && !city) return null;
      return { address, city, pincode };
    } catch (e) {
      this.logger.warn(`Nominatim reverse failed: ${e}`);
      return null;
    }
  }
}
