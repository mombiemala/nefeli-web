import type { GeocodeResult } from "./types";
import { isDemoMode } from "./utils";

/**
 * Convert a birth city/country into coordinates + timezone.
 * Uses OpenCage in production; falls back to a deterministic demo geocoder
 * (well-known cities + a hashed fallback) when no key is present.
 */
export async function geocodeBirthPlace(
  city: string,
  country?: string,
): Promise<GeocodeResult> {
  const query = [city, country].filter(Boolean).join(", ");

  if (isDemoMode() || !process.env.OPENCAGE_API_KEY) {
    return demoGeocode(city, country);
  }

  const url = new URL("https://api.opencagedata.com/geocode/v1/json");
  url.searchParams.set("q", query);
  url.searchParams.set("key", process.env.OPENCAGE_API_KEY!);
  url.searchParams.set("limit", "1");
  url.searchParams.set("no_annotations", "0");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`OpenCage geocoding failed: ${res.status}`);
  }
  const data = await res.json();
  const first = data.results?.[0];
  if (!first) {
    throw new Error(`No geocoding result for "${query}"`);
  }
  const comp = first.components ?? {};
  return {
    latitude: first.geometry.lat,
    longitude: first.geometry.lng,
    timezone: first.annotations?.timezone?.name ?? "UTC",
    formatted: first.formatted,
    city: comp.city ?? comp.town ?? comp.village ?? city,
    country: comp.country ?? country ?? "",
  };
}

const KNOWN_CITIES: Record<string, Omit<GeocodeResult, "formatted">> = {
  "new york": { latitude: 40.7128, longitude: -74.006, timezone: "America/New_York", city: "New York", country: "United States" },
  "los angeles": { latitude: 34.0522, longitude: -118.2437, timezone: "America/Los_Angeles", city: "Los Angeles", country: "United States" },
  "chicago": { latitude: 41.8781, longitude: -87.6298, timezone: "America/Chicago", city: "Chicago", country: "United States" },
  "london": { latitude: 51.5074, longitude: -0.1278, timezone: "Europe/London", city: "London", country: "United Kingdom" },
  "paris": { latitude: 48.8566, longitude: 2.3522, timezone: "Europe/Paris", city: "Paris", country: "France" },
  "berlin": { latitude: 52.52, longitude: 13.405, timezone: "Europe/Berlin", city: "Berlin", country: "Germany" },
  "tokyo": { latitude: 35.6762, longitude: 139.6503, timezone: "Asia/Tokyo", city: "Tokyo", country: "Japan" },
  "sydney": { latitude: -33.8688, longitude: 151.2093, timezone: "Australia/Sydney", city: "Sydney", country: "Australia" },
  "mumbai": { latitude: 19.076, longitude: 72.8777, timezone: "Asia/Kolkata", city: "Mumbai", country: "India" },
  "toronto": { latitude: 43.6532, longitude: -79.3832, timezone: "America/Toronto", city: "Toronto", country: "Canada" },
  "mexico city": { latitude: 19.4326, longitude: -99.1332, timezone: "America/Mexico_City", city: "Mexico City", country: "Mexico" },
  "são paulo": { latitude: -23.5505, longitude: -46.6333, timezone: "America/Sao_Paulo", city: "São Paulo", country: "Brazil" },
};

function demoGeocode(city: string, country?: string): GeocodeResult {
  const key = city.trim().toLowerCase();
  const known = KNOWN_CITIES[key];
  if (known) {
    return { ...known, formatted: `${known.city}, ${known.country}` };
  }
  // Deterministic pseudo-coordinates for anything else.
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  const lat = ((Math.abs(h) % 12000) / 100) - 60;
  const lng = ((Math.abs(h >> 3) % 36000) / 100) - 180;
  return {
    latitude: Math.round(lat * 10000) / 10000,
    longitude: Math.round(lng * 10000) / 10000,
    timezone: "UTC",
    formatted: [city, country].filter(Boolean).join(", "),
    city,
    country: country ?? "",
  };
}
