import { describe, it, expect } from "vitest";
import { signFromLongitude, moonPhase, computeSkyWeather } from "./sky-weather";

describe("signFromLongitude", () => {
  it("maps ecliptic longitude to the tropical sign", () => {
    expect(signFromLongitude(0)).toBe("Aries");
    expect(signFromLongitude(35)).toBe("Taurus");
    expect(signFromLongitude(109)).toBe("Cancer"); // ~19° Cancer
    expect(signFromLongitude(359)).toBe("Pisces");
    expect(signFromLongitude(360)).toBe("Aries"); // wraps
  });
});

describe("moonPhase", () => {
  it("names the phase from the phase angle", () => {
    expect(moonPhase(0).name).toBe("New Moon");
    expect(moonPhase(90).name).toBe("First Quarter");
    expect(moonPhase(180).name).toBe("Full Moon");
    expect(moonPhase(270).name).toBe("Last Quarter");
  });
});

describe("computeSkyWeather", () => {
  it("returns a moon sign, phase, and (optionally) a headline aspect", () => {
    const sw = computeSkyWeather(new Date("2026-08-27T12:00:00Z"));
    expect(sw.date).toBe("2026-08-27");
    expect(sw.moonSign).toBeTruthy();
    expect(sw.phase).toBeTruthy();
    if (sw.aspect) expect(sw.aspect.orb).toBeLessThanOrEqual(5);
  });
});
