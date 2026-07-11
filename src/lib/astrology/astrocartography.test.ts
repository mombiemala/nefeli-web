import { describe, it, expect } from "vitest";
import { computeAstroMap, linesNear, birthToUTC } from "./astrocartography";

const BIRTH = {
  date: "1990-06-15",
  time: "14:30",
  timeUnknown: false,
  timezone: "America/New_York",
  latitude: 40.7128,
  longitude: -74.006,
};

describe("computeAstroMap", () => {
  const map = computeAstroMap(BIRTH);

  it("returns lines for all 10 planets and 4 angles", () => {
    expect(map.timeUnknown).toBe(false);
    const planets = new Set(map.lines.map((l) => l.planet));
    expect(planets.size).toBe(10);
    // Every planet has MC + IC (vertical); most have ASC + DSC too.
    expect(map.lines.filter((l) => l.angle === "MC")).toHaveLength(10);
    expect(map.lines.filter((l) => l.angle === "IC")).toHaveLength(10);
    expect(map.lines.some((l) => l.angle === "ASC")).toBe(true);
    expect(map.lines.some((l) => l.angle === "DSC")).toBe(true);
  });

  it("keeps every longitude within [-180, 180)", () => {
    for (const line of map.lines) {
      for (const p of line.points) {
        expect(p.lon).toBeGreaterThanOrEqual(-180);
        expect(p.lon).toBeLessThan(180);
      }
    }
  });

  it("MC and IC meridians are 180° apart", () => {
    const mc = map.lines.find((l) => l.planet === "Sun" && l.angle === "MC")!;
    const ic = map.lines.find((l) => l.planet === "Sun" && l.angle === "IC")!;
    let diff = Math.abs(mc.points[0].lon - ic.points[0].lon);
    if (diff > 180) diff = 360 - diff;
    expect(diff).toBeCloseTo(180, 0);
  });

  it("returns no lines when the birth time is unknown", () => {
    const unknown = computeAstroMap({ ...BIRTH, timeUnknown: true, time: null });
    expect(unknown.timeUnknown).toBe(true);
    expect(unknown.lines).toHaveLength(0);
  });
});

describe("linesNear", () => {
  const map = computeAstroMap(BIRTH);

  it("finds the planetary lines closest to a location, sorted by orb", () => {
    // Somewhere on Earth is near some line; assert the API shape + ordering.
    const near = linesNear(map, 51.5, -0.13, 8); // London
    expect(Array.isArray(near)).toBe(true);
    for (let i = 1; i < near.length; i++) {
      expect(near[i].orbDeg).toBeGreaterThanOrEqual(near[i - 1].orbDeg);
    }
    for (const n of near) expect(n.orbDeg).toBeLessThanOrEqual(8);
  });
});

describe("birthToUTC", () => {
  it("converts local birth time to UTC", () => {
    // 14:30 EDT (UTC-4 in June) → 18:30 UTC.
    const utc = birthToUTC("1990-06-15", "14:30", "America/New_York")!;
    expect(utc.getUTCHours()).toBe(18);
    expect(utc.getUTCMinutes()).toBe(30);
  });
});
