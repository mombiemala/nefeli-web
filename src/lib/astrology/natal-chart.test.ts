import { describe, it, expect } from "vitest";
import { computeNatalChart } from "./natal-chart";
import type { BirthSubject } from "./astrologer-api";

function subject(o: Partial<BirthSubject>): BirthSubject {
  return {
    name: "Test", year: 2000, month: 1, day: 1, hour: 12, minute: 0,
    city: "", nation: "", latitude: 0, longitude: 0, timezone: "UTC", timeUnknown: false, ...o,
  };
}

describe("computeNatalChart — known charts", () => {
  // Albert Einstein: 1879-03-14, 11:30 LMT Ulm (48.4°N, 10.0°E) → ~10:50 UT.
  // Documented: Sun ~23.5° Pisces, Ascendant in Cancer.
  const einstein = computeNatalChart(subject({
    year: 1879, month: 3, day: 14, hour: 10, minute: 50,
    latitude: 48.4, longitude: 10.0, timezone: "UTC",
  }));

  it("places Einstein's Sun at ~23° Pisces", () => {
    const sun = einstein.planets.find((p) => p.name === "Sun")!;
    expect(sun.sign).toBe("Pisces");
    expect(sun.degree).toBeGreaterThan(22);
    expect(sun.degree).toBeLessThan(25);
  });

  it("puts Einstein's Ascendant in Cancer", () => {
    expect(einstein.ascendantSign).toBe("Cancer");
  });

  // 2000-01-01 12:00 UT — Sun ~10° Capricorn.
  it("places the millennium Sun in Capricorn", () => {
    const c = computeNatalChart(subject({}));
    const sun = c.planets.find((p) => p.name === "Sun")!;
    expect(sun.sign).toBe("Capricorn");
  });
});

describe("computeNatalChart — structure", () => {
  const c = computeNatalChart(subject({ hour: 14, minute: 30, latitude: 40.71, longitude: -74.0, timezone: "America/New_York", year: 1990, month: 6, day: 15 }));

  it("returns 11 bodies, 12 whole-sign houses, and aspects", () => {
    expect(c.planets).toHaveLength(11); // Sun–Pluto + North Node
    expect(c.houses).toHaveLength(12);
    expect(c.houses[0].sign).toBe(c.ascendantSign); // whole-sign: house 1 = asc sign
    expect(c.aspects.length).toBeGreaterThan(0);
  });

  it("keeps every longitude in range and marks retrogrades", () => {
    for (const p of c.planets) {
      expect(p.absoluteDegree).toBeGreaterThanOrEqual(0);
      expect(p.absoluteDegree).toBeLessThan(360);
      expect(p.degree).toBeGreaterThanOrEqual(0);
      expect(p.degree).toBeLessThan(30);
    }
    // The Sun is never retrograde.
    expect(c.planets.find((p) => p.name === "Sun")!.retrograde).toBe(false);
  });
});
