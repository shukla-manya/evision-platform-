/**
 * Service address on technician records is stored as:
 * `Experience: {n} yrs · {city, PIN, …}` (see technician registration).
 */

export type ParsedElectricianServiceAddress = {
  experienceYears: number | null;
  experienceLabel: string;
  areaLabel: string;
  full: string;
};

export function parseElectricianServiceAddress(addr?: string | null): ParsedElectricianServiceAddress {
  const raw = String(addr || '').trim();
  if (!raw) {
    return { experienceYears: null, experienceLabel: '', areaLabel: '—', full: '—' };
  }
  const m = raw.match(/^Experience:\s*(\d{1,2})\s*yrs?\s*·\s*([\s\S]+)$/i);
  if (m) {
    const y = Number(m[1]);
    return {
      experienceYears: Number.isFinite(y) ? y : null,
      experienceLabel: `${m[1]} yrs`,
      areaLabel: m[2].trim(),
      full: raw,
    };
  }
  const m2 = raw.match(/^Experience:\s*([^·]+)\s*·\s*([\s\S]+)$/i);
  if (m2) {
    const num = Number(String(m2[1]).match(/\d+/)?.[0]);
    return {
      experienceYears: Number.isFinite(num) ? num : null,
      experienceLabel: m2[1].trim(),
      areaLabel: m2[2].trim(),
      full: raw,
    };
  }
  return { experienceYears: null, experienceLabel: '', areaLabel: raw, full: raw };
}
