const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "MT-Application-Tracker/1.0 (personal use, not for high-volume use)";

export interface GeocodeResult {
  latitude: number;
  longitude: number;
}

// Free geocoding via OpenStreetMap's Nominatim. Callers must space out
// requests to respect its 1-request-per-second usage policy.
export async function geocodeQuery(query: string): Promise<GeocodeResult | null> {
  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return null;

  const results = (await res.json()) as { lat: string; lon: string }[];
  if (results.length === 0) return null;

  const latitude = parseFloat(results[0].lat);
  const longitude = parseFloat(results[0].lon);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;
  return { latitude, longitude };
}
