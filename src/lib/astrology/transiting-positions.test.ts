import { describe, it, expect } from "vitest";
import { transitingPositions } from "./transiting-positions";

describe("transitingPositions", () => {
  const pos = transitingPositions(new Date("2026-07-11T12:00:00Z"));

  it("returns all 10 bodies with in-range longitudes", () => {
    expect(pos).toHaveLength(10);
    for (const p of pos) {
      expect(p.absoluteDegree).toBeGreaterThanOrEqual(0);
      expect(p.absoluteDegree).toBeLessThan(360);
    }
  });

  it("places the Sun near 19° Cancer in mid-July (geocentric, not heliocentric)", () => {
    const sun = pos.find((p) => p.name === "Sun")!;
    // ~109° absolute = 19° Cancer. Heliocentric would be ~289° — guard against that.
    expect(sun.absoluteDegree).toBeGreaterThan(105);
    expect(sun.absoluteDegree).toBeLessThan(113);
  });
});
