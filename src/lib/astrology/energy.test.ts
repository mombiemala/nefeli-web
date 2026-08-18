import { describe, it, expect } from "vitest";
import { dayEnergy, energyCalendar, bestWindows, energyTargets } from "./energy";

// A spread-out natal set so transits actually land on something.
const NATAL = [
  { name: "Sun", absoluteDegree: 84 },
  { name: "Moon", absoluteDegree: 200 },
  { name: "Venus", absoluteDegree: 45 },
  { name: "Mars", absoluteDegree: 300 },
  { name: "Jupiter", absoluteDegree: 120 },
  { name: "Saturn", absoluteDegree: 280 },
];

describe("dayEnergy", () => {
  it("returns a score in 0–100", () => {
    const e = dayEnergy(NATAL, new Date("2026-08-18T12:00:00Z"));
    expect(e.score).toBeGreaterThanOrEqual(0);
    expect(e.score).toBeLessThanOrEqual(100);
  });
});

describe("energyCalendar", () => {
  const cal = energyCalendar(NATAL, new Date("2026-08-18T00:00:00Z"), 30);

  it("returns one entry per day with ISO dates", () => {
    expect(cal).toHaveLength(30);
    expect(cal[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("varies day to day (the Moon moves)", () => {
    const scores = new Set(cal.map((d) => d.score));
    expect(scores.size).toBeGreaterThan(1);
  });
});

describe("bestWindows", () => {
  it("returns the top days sorted by score, highest first", () => {
    const w = bestWindows(NATAL, new Date("2026-08-18T00:00:00Z"), 30, "love", 5);
    expect(w).toHaveLength(5);
    for (let i = 1; i < w.length; i++) expect(w[i].score).toBeLessThanOrEqual(w[i - 1].score);
  });
});

describe("energyTargets", () => {
  it("keeps major bodies and angles, drops nodes/Lilith", () => {
    const kept = energyTargets([
      { name: "Sun", absoluteDegree: 0 },
      { name: "Ascendant", absoluteDegree: 10 },
      { name: "North Node", absoluteDegree: 20 },
      { name: "Lilith", absoluteDegree: 30 },
    ]).map((p) => p.name);
    expect(kept).toEqual(["Sun", "Ascendant"]);
  });
});
