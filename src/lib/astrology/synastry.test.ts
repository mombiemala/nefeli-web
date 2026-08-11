import { describe, it, expect } from "vitest";
import { synastryAspects, relationshipPlanets, compatibilityScore } from "./synastry";

describe("synastryAspects", () => {
  it("detects a conjunction within orb", () => {
    const a = [{ name: "Venus", absoluteDegree: 100 }];
    const b = [{ name: "Mars", absoluteDegree: 103 }];
    const asp = synastryAspects(a, b);
    expect(asp).toHaveLength(1);
    expect(asp[0]).toMatchObject({ a: "Venus", b: "Mars", type: "conjunction" });
    expect(asp[0].orb).toBeCloseTo(3);
  });

  it("detects opposition, trine, square, sextile", () => {
    const a = [{ name: "Sun", absoluteDegree: 0 }];
    expect(synastryAspects(a, [{ name: "Moon", absoluteDegree: 180 }])[0].type).toBe("opposition");
    expect(synastryAspects(a, [{ name: "Moon", absoluteDegree: 120 }])[0].type).toBe("trine");
    expect(synastryAspects(a, [{ name: "Moon", absoluteDegree: 90 }])[0].type).toBe("square");
    expect(synastryAspects(a, [{ name: "Moon", absoluteDegree: 60 }])[0].type).toBe("sextile");
  });

  it("ignores separations outside orb", () => {
    const a = [{ name: "Sun", absoluteDegree: 0 }];
    const b = [{ name: "Moon", absoluteDegree: 45 }]; // 45° from nothing major
    expect(synastryAspects(a, b, 6)).toHaveLength(0);
  });

  it("handles the 360° wrap (conjunction across 0°)", () => {
    const asp = synastryAspects(
      [{ name: "Sun", absoluteDegree: 358 }],
      [{ name: "Sun", absoluteDegree: 2 }],
    );
    expect(asp[0].type).toBe("conjunction");
    expect(asp[0].orb).toBeCloseTo(4);
  });

  it("sorts tightest orb first", () => {
    const a = [{ name: "Sun", absoluteDegree: 0 }, { name: "Venus", absoluteDegree: 10 }];
    const b = [{ name: "Moon", absoluteDegree: 5 }]; // Venus-Moon 5°, Sun-Moon 5° → both conj
    const asp = synastryAspects(a, b);
    for (let i = 1; i < asp.length; i++) expect(asp[i].orb).toBeGreaterThanOrEqual(asp[i - 1].orb);
  });
});

describe("compatibilityScore", () => {
  it("is 50 (neutral) with no aspects", () => {
    expect(compatibilityScore([]).score).toBe(50);
  });
  it("rises above 50 for flowing aspects and falls below for friction", () => {
    const flowing = compatibilityScore([{ a: "Sun", b: "Moon", type: "trine", glyph: "△", orb: 1 }]);
    const hard = compatibilityScore([{ a: "Sun", b: "Mars", type: "square", glyph: "□", orb: 1 }]);
    expect(flowing.score).toBeGreaterThan(50);
    expect(flowing.flowing).toBe(1);
    expect(hard.score).toBeLessThan(50);
    expect(hard.friction).toBe(1);
  });
  it("stays within 0–100", () => {
    const many = Array.from({ length: 40 }, () => ({ a: "Sun", b: "Moon", type: "trine" as const, glyph: "△", orb: 0 }));
    expect(compatibilityScore(many).score).toBe(100);
  });
});

describe("relationshipPlanets", () => {
  it("keeps only the relationship-relevant bodies", () => {
    const planets = [
      { name: "Sun", absoluteDegree: 0 },
      { name: "North Node", absoluteDegree: 10 },
      { name: "Venus", absoluteDegree: 20 },
      { name: "Lilith", absoluteDegree: 30 },
    ];
    const kept = relationshipPlanets(planets).map((p) => p.name);
    expect(kept).toEqual(["Sun", "Venus"]);
  });
});
