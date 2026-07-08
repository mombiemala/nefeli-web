import { describe, it, expect } from "vitest";
import { deriveEnergyLevel, pickPrompt, ENERGY_LABEL } from "./guidance-logic";
import type { Transit } from "./types";

function t(aspect: Transit["aspect"], intensity: Transit["intensity"]): Transit {
  return {
    transitingPlanet: "Mars", aspect, natalPlanet: "Sun", glyph: "",
    exactDate: "2026-07-08", startDate: "2026-07-08", endDate: "2026-07-08",
    house: 1, intensity, meaning: "",
  };
}

describe("deriveEnergyLevel", () => {
  it("defaults to MEDIUM with no transits", () => {
    expect(deriveEnergyLevel([])).toBe("MEDIUM");
  });

  it("reads flowing, high-intensity aspects as HIGH", () => {
    expect(deriveEnergyLevel([t("trine", 5), t("sextile", 4)])).toBe("HIGH");
  });

  it("reads hard, intense aspects as LOW", () => {
    expect(deriveEnergyLevel([t("square", 4), t("opposition", 4), t("square", 4)])).toBe("LOW");
  });

  it("reads faint aspects as REST", () => {
    expect(deriveEnergyLevel([t("sextile", 1), t("trine", 2)])).toBe("REST");
  });
});

describe("pickPrompt", () => {
  it("is deterministic for the same seed + level", () => {
    expect(pickPrompt("seed-a", "HIGH")).toBe(pickPrompt("seed-a", "HIGH"));
  });

  it("always returns a non-empty prompt for every level", () => {
    for (const level of Object.keys(ENERGY_LABEL) as (keyof typeof ENERGY_LABEL)[]) {
      expect(pickPrompt("x", level).length).toBeGreaterThan(0);
    }
  });
});
