import { describe, it, expect } from "vitest";
import * as Astronomy from "astronomy-engine";
import { solarReturnMoment, currentSolarYear } from "./solar-return";

// Natal: 1990-06-15 18:30 UTC.
const NATAL = new Date("1990-06-15T18:30:00Z");

describe("solarReturnMoment", () => {
  it("falls within a day or two of the birthday", () => {
    const sr = solarReturnMoment(NATAL, 2026)!;
    expect(sr).toBeTruthy();
    expect(sr.getUTCMonth()).toBe(5); // June (0-indexed)
    expect(Math.abs(sr.getUTCDate() - 15)).toBeLessThanOrEqual(2);
  });

  it("returns the Sun to its natal longitude", () => {
    const natalLon = Astronomy.SunPosition(Astronomy.MakeTime(NATAL)).elon;
    const sr = solarReturnMoment(NATAL, 2026)!;
    const srLon = Astronomy.SunPosition(Astronomy.MakeTime(sr)).elon;
    let diff = Math.abs(srLon - natalLon);
    if (diff > 180) diff = 360 - diff;
    expect(diff).toBeLessThan(0.05);
  });
});

describe("currentSolarYear", () => {
  it("uses this year once the birthday has passed", () => {
    expect(currentSolarYear(NATAL, new Date("2026-09-01T00:00:00Z"))).toBe(2026);
  });
  it("uses last year before the birthday", () => {
    expect(currentSolarYear(NATAL, new Date("2026-02-01T00:00:00Z"))).toBe(2025);
  });
});
