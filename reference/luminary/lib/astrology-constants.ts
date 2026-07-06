import type { ZodiacSign } from "./types";

export const SIGNS: ZodiacSign[] = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

export const SIGN_GLYPHS: Record<ZodiacSign, string> = {
  Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋",
  Leo: "♌", Virgo: "♍", Libra: "♎", Scorpio: "♏",
  Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓",
};

export const SIGN_ELEMENT: Record<ZodiacSign, "Fire" | "Earth" | "Air" | "Water"> = {
  Aries: "Fire", Leo: "Fire", Sagittarius: "Fire",
  Taurus: "Earth", Virgo: "Earth", Capricorn: "Earth",
  Gemini: "Air", Libra: "Air", Aquarius: "Air",
  Cancer: "Water", Scorpio: "Water", Pisces: "Water",
};

export const SIGN_MODALITY: Record<ZodiacSign, "Cardinal" | "Fixed" | "Mutable"> = {
  Aries: "Cardinal", Cancer: "Cardinal", Libra: "Cardinal", Capricorn: "Cardinal",
  Taurus: "Fixed", Leo: "Fixed", Scorpio: "Fixed", Aquarius: "Fixed",
  Gemini: "Mutable", Virgo: "Mutable", Sagittarius: "Mutable", Pisces: "Mutable",
};

export const PLANET_GLYPHS: Record<string, string> = {
  Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂",
  Jupiter: "♃", Saturn: "♄", Uranus: "♅", Neptune: "♆", Pluto: "♇",
  Chiron: "⚷", "North Node": "☊", "South Node": "☋",
  Ascendant: "AC", Midheaven: "MC", MC: "MC",
};

export const ASPECT_GLYPHS: Record<string, string> = {
  conjunction: "☌",
  opposition: "☍",
  trine: "△",
  square: "□",
  sextile: "⚹",
};

export const ASPECT_ANGLE: Record<string, number> = {
  conjunction: 0,
  sextile: 60,
  square: 90,
  trine: 120,
  opposition: 180,
};

export const HOUSE_THEMES: Record<number, string> = {
  1: "Identity, body, first impressions",
  2: "Money, values, self-worth",
  3: "Communication, siblings, local world",
  4: "Home, family, roots, the past",
  5: "Creativity, romance, play, children",
  6: "Work, health, daily routine, service",
  7: "Partnership, marriage, the other",
  8: "Intimacy, shared resources, transformation",
  9: "Meaning, travel, philosophy, belief",
  10: "Career, public role, legacy",
  11: "Community, friends, hopes, the future",
  12: "The unconscious, solitude, healing, release",
};

export const SIGN_KEYWORDS: Record<ZodiacSign, string> = {
  Aries: "courageous, direct, pioneering",
  Taurus: "steady, sensual, grounded",
  Gemini: "curious, quick, communicative",
  Cancer: "nurturing, protective, tidal",
  Leo: "warm, expressive, generous",
  Virgo: "precise, devoted, discerning",
  Libra: "relational, fair, aesthetic",
  Scorpio: "intense, penetrating, transformative",
  Sagittarius: "expansive, honest, seeking",
  Capricorn: "ambitious, disciplined, enduring",
  Aquarius: "inventive, humane, unconventional",
  Pisces: "compassionate, dreamy, permeable",
};

export const PLANET_ORDER = [
  "Sun", "Moon", "Mercury", "Venus", "Mars",
  "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto",
  "Chiron", "North Node", "Ascendant", "Midheaven",
];
