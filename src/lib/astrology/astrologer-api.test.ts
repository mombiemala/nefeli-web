import { describe, it, expect } from "vitest";
import {
  mapApiChart, mapApiTransits, mapApiMoonPhase,
  normaliseSign, houseNumber, normaliseAspect, titlePlanet,
} from "./astrologer-api";

// A trimmed but faithful Astrologer API v5 (Kerykeion) birth-chart response:
// planets are named fields on chart_data.subject with 3-letter signs and
// "Nth_House" strings; houses are first_house..twelfth_house; aspects live
// under chart_data.aspects; the SVG is at the top level.
const SAMPLE_CHART = {
  status: "OK",
  chart: "<svg>chart</svg>",
  chart_data: {
    subject: {
      sun: { name: "Sun", sign: "Gem", position: 12.3, abs_pos: 72.3, house: "Tenth_House", retrograde: false, speed: 0.95, emoji: "☉" },
      moon: { name: "Moon", sign: "Pis", position: 4.1, abs_pos: 334.1, house: "Seventh_House", retrograde: false, speed: 13.2, emoji: "☽" },
      mercury: { name: "Mercury", sign: "Tau", position: 28.0, abs_pos: 58.0, house: "Ninth_House", retrograde: true, speed: -0.3, emoji: "☿" },
      pluto: { name: "Pluto", sign: "Sco", position: 2.0, abs_pos: 212.0, house: "Third_House", retrograde: true, speed: -0.01, emoji: "♇" },
      mean_north_lunar_node: { name: "Mean_North_Lunar_Node", sign: "Cap", position: 10, abs_pos: 280, house: "Fifth_House", retrograde: true, speed: -0.05 },
      first_house: { sign: "Vir", position: 5.0, abs_pos: 155.0, point_type: "House", house: null },
      tenth_house: { sign: "Gem", position: 1.0, abs_pos: 61.0, point_type: "House", house: null },
      fourth_house: { sign: "Pis", position: 1.0, abs_pos: 331.0, point_type: "House", house: null },
      seventh_house: { sign: "Pis", position: 5.0, abs_pos: 335.0, point_type: "House", house: null },
    },
    aspects: [
      { p1_name: "Sun", p2_name: "Moon", aspect: "trine", orbit: 1.8, aspect_movement: "Applying" },
      { p1_name: "Sun", p2_name: "Pluto", aspect: "square", orbit: -3.2, aspect_movement: "Separating" },
      { p1_name: "Moon", p2_name: "Mercury", aspect: "quincunx", orbit: 0.5, aspect_movement: "Applying" }, // non-major → dropped
    ],
  },
};

describe("mapApiChart", () => {
  const chart = mapApiChart(SAMPLE_CHART, false);

  it("parses planets from named subject fields with full sign names", () => {
    const sun = chart.planets.find((p) => p.name === "Sun");
    expect(sun).toBeTruthy();
    expect(sun!.sign).toBe("Gemini");
    expect(sun!.degree).toBeCloseTo(12.3);
    expect(sun!.absoluteDegree).toBeCloseTo(72.3);
    expect(sun!.house).toBe(10);
    expect(sun!.retrograde).toBe(false);
  });

  it("reads retrograde correctly", () => {
    expect(chart.planets.find((p) => p.name === "Mercury")!.retrograde).toBe(true);
  });

  it("derives Sun/Moon/Ascendant signs (ascendant from first_house)", () => {
    expect(chart.sunSign).toBe("Gemini");
    expect(chart.moonSign).toBe("Pisces");
    expect(chart.ascendantSign).toBe("Virgo"); // first_house.sign = "Vir"
  });

  it("builds house cusps from first_house..twelfth_house", () => {
    const h1 = chart.houses.find((h) => h.house === 1);
    expect(h1?.sign).toBe("Virgo");
    expect(h1?.absoluteDegree).toBeCloseTo(155.0);
  });

  it("keeps only the five major aspects, with orb + applying", () => {
    expect(chart.aspects).toHaveLength(2); // quincunx dropped
    const trine = chart.aspects.find((a) => a.type === "trine");
    expect(trine).toMatchObject({ a: "Sun", b: "Moon", applying: true });
    expect(trine!.orb).toBeCloseTo(1.8);
    const square = chart.aspects.find((a) => a.type === "square");
    expect(square!.applying).toBe(false); // "Separating"
    expect(square!.orb).toBeCloseTo(3.2); // absolute value
  });

  it("does not duplicate North Node when both node fields exist", () => {
    const both = {
      ...SAMPLE_CHART,
      chart_data: {
        ...SAMPLE_CHART.chart_data,
        subject: {
          ...SAMPLE_CHART.chart_data.subject,
          true_north_lunar_node: { name: "True_North_Lunar_Node", sign: "Cap", position: 11, abs_pos: 281, house: "Fifth_House" },
        },
      },
    };
    const nodes = mapApiChart(both, false).planets.filter((p) => p.name === "North Node");
    expect(nodes).toHaveLength(1);
  });

  it("passes the SVG through", () => {
    expect(chart.svg).toBe("<svg>chart</svg>");
  });
});

describe("mapApiTransits", () => {
  const data = {
    chart_data: {
      aspects: [
        { p1_name: "Mars", p1_owner: "Transit", p2_name: "Venus", p2_owner: "Natal", aspect: "conjunction", orbit: 0.4, aspect_movement: "Applying" },
        { p1_name: "Sun", p1_owner: "Natal", p2_name: "Saturn", p2_owner: "Transit", aspect: "opposition", orbit: 2.0, aspect_movement: "Separating" },
        { p1_name: "Moon", p1_owner: "Transit", p2_name: "Mars", p2_owner: "Natal", aspect: "semisextile", orbit: 0.2 }, // non-major → dropped
      ],
    },
  };
  const transits = mapApiTransits(data, new Date("2026-07-08T00:00:00Z"));

  it("keeps only major aspects", () => {
    expect(transits).toHaveLength(2);
  });

  it("resolves transiting vs natal from p*_owner", () => {
    const conj = transits.find((t) => t.aspect === "conjunction")!;
    expect(conj.transitingPlanet).toBe("Mars");
    expect(conj.natalPlanet).toBe("Venus");
    const opp = transits.find((t) => t.aspect === "opposition")!;
    expect(opp.transitingPlanet).toBe("Saturn"); // p2 is the Transit owner
    expect(opp.natalPlanet).toBe("Sun");
  });

  it("derives intensity from the aspect type", () => {
    expect(transits.find((t) => t.aspect === "conjunction")!.intensity).toBe(5);
    expect(transits.find((t) => t.aspect === "opposition")!.intensity).toBe(4);
  });
});

describe("mapApiMoonPhase", () => {
  it("reads the nested moon_phase_overview.moon shape", () => {
    const m = mapApiMoonPhase(
      { moon_phase_overview: { moon: { phase_name: "Waxing Gibbous", illumination: 0.72, emoji: "🌔" } } },
      new Date("2026-07-08T00:00:00Z"),
    );
    expect(m.phaseName).toBe("Waxing Gibbous");
    expect(m.emoji).toBe("🌔");
    expect(m.illumination).toBe(72); // 0-1 fraction scaled to percent
  });
});

describe("helpers", () => {
  it("normaliseSign expands 3-letter codes and passes full names", () => {
    expect(normaliseSign("Gem")).toBe("Gemini");
    expect(normaliseSign("sco")).toBe("Scorpio");
    expect(normaliseSign("Pisces")).toBe("Pisces");
  });

  it("houseNumber parses Nth_House strings and numbers", () => {
    expect(houseNumber("Tenth_House")).toBe(10);
    expect(houseNumber("first_house")).toBe(1);
    expect(houseNumber(7)).toBe(7);
    expect(houseNumber(null)).toBe(0);
  });

  it("normaliseAspect keeps majors, drops the rest", () => {
    expect(normaliseAspect("Trine")).toBe("trine");
    expect(normaliseAspect("quincunx")).toBeNull();
  });

  it("titlePlanet maps node field names to display names", () => {
    expect(titlePlanet("Mean_North_Lunar_Node")).toBe("North Node");
    expect(titlePlanet("sun")).toBe("Sun");
  });
});
