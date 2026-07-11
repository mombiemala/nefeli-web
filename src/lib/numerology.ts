// Pythagorean numerology — pure, dependency-free. Core numbers from a birth
// date and (optionally) a full birth name. Master numbers 11/22/33 are kept.

const MASTERS = new Set([11, 22, 33]);

/** Reduce to a single digit, preserving master numbers. */
export function reduceNumber(n: number): number {
  let x = Math.abs(n);
  while (x > 9 && !MASTERS.has(x)) {
    x = String(x).split("").reduce((s, d) => s + Number(d), 0);
  }
  return x;
}

/** Pythagorean value of a letter A–Z (1–9), 0 for non-letters. */
function letterValue(ch: string): number {
  const c = ch.toUpperCase().charCodeAt(0);
  if (c < 65 || c > 90) return 0;
  return ((c - 65) % 9) + 1;
}

const VOWELS = new Set(["A", "E", "I", "O", "U"]);

function sumLetters(name: string, filter: (ch: string) => boolean): number {
  return name
    .split("")
    .filter((ch) => /[a-zA-Z]/.test(ch) && filter(ch.toUpperCase()))
    .reduce((s, ch) => s + letterValue(ch), 0);
}

/** Life Path — from the birth date (YYYY-MM-DD), reducing each part first. */
export function lifePath(dateISO: string): number {
  const [y, m, d] = dateISO.split("-").map(Number);
  if ([y, m, d].some((n) => Number.isNaN(n))) return 0;
  return reduceNumber(reduceNumber(m) + reduceNumber(d) + reduceNumber(y));
}

/** Birthday number — the day of the month, reduced. */
export function birthdayNumber(dateISO: string): number {
  const d = Number(dateISO.split("-")[2]);
  return Number.isNaN(d) ? 0 : reduceNumber(d);
}

/** Expression / Destiny — all letters of the full name. */
export function expression(name: string): number {
  return reduceNumber(sumLetters(name, () => true));
}

/** Soul Urge / Heart's Desire — the vowels. */
export function soulUrge(name: string): number {
  return reduceNumber(sumLetters(name, (ch) => VOWELS.has(ch)));
}

/** Personality — the consonants. */
export function personality(name: string): number {
  return reduceNumber(sumLetters(name, (ch) => !VOWELS.has(ch)));
}

export interface NumerologyCore {
  lifePath: number;
  birthday: number;
  expression?: number;
  soulUrge?: number;
  personality?: number;
}

/** Everything computable from a date, plus name numbers when a name is given. */
export function computeNumerology(dateISO: string, fullName?: string): NumerologyCore {
  const core: NumerologyCore = {
    lifePath: lifePath(dateISO),
    birthday: birthdayNumber(dateISO),
  };
  if (fullName && /[a-zA-Z]/.test(fullName)) {
    core.expression = expression(fullName);
    core.soulUrge = soulUrge(fullName);
    core.personality = personality(fullName);
  }
  return core;
}
