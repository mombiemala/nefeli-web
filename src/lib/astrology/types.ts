// Shared domain types used across the API clients, server and UI.

export type ZodiacSign =
  | "Aries" | "Taurus" | "Gemini" | "Cancer" | "Leo" | "Virgo"
  | "Libra" | "Scorpio" | "Sagittarius" | "Capricorn" | "Aquarius" | "Pisces";

export interface PlanetPosition {
  name: string;        // "Sun", "Moon", "Mercury", ... also "Ascendant", "MC"
  sign: ZodiacSign;
  signGlyph: string;   // ♈ ♉ ...
  glyph: string;       // ☉ ☽ ☿ ...
  degree: number;      // 0-29.999 within sign
  absoluteDegree: number; // 0-359.999 within zodiac
  house: number;       // 1-12
  speed: number;       // deg/day; negative = retrograde
  retrograde: boolean;
}

export interface HouseCusp {
  house: number;       // 1-12
  sign: ZodiacSign;
  degree: number;
  absoluteDegree: number;
}

export type AspectType =
  | "conjunction" | "opposition" | "trine" | "square" | "sextile";

export interface Aspect {
  a: string;           // planet name
  b: string;           // planet name
  type: AspectType;
  glyph: string;
  orb: number;         // degrees of orb
  applying: boolean;
}

export interface NatalChart {
  planets: PlanetPosition[];
  houses: HouseCusp[];
  aspects: Aspect[];
  ascendantSign: ZodiacSign;
  sunSign: ZodiacSign;
  moonSign: ZodiacSign;
  svg?: string;        // raw SVG markup (optional)
  timeUnknown: boolean;
}

export interface Transit {
  transitingPlanet: string;
  aspect: AspectType;
  natalPlanet: string;
  glyph: string;
  exactDate: string;   // ISO date the aspect perfects
  startDate: string;
  endDate: string;
  house: number;       // natal house activated
  intensity: 1 | 2 | 3 | 4 | 5;
  meaning: string;     // one-line base meaning
}

export interface MoonPhaseData {
  phaseName: string;   // "Waxing Crescent", ...
  emoji: string;
  illumination: number; // 0-100
  moonSign: ZodiacSign;
  nextFullMoon?: string;
  nextNewMoon?: string;
}

export type EnergyBadge = "HIGH" | "MEDIUM" | "LOW" | "REST";

export interface DailyGuidancePayload {
  date: string;
  moonSign: string;
  moonPhase: string;
  moonEmoji: string;
  energyLevel: EnergyBadge;
  keyTransits: Transit[];
  guidance: string;
  prompt: string;
  upcoming: { date: string; label: string }[];
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  timezone: string;
  formatted: string;
  city: string;
  country: string;
}
