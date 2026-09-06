import { describe, it, expect } from "vitest";
import {
  daysBetween, isoWeekKey, recencyLabel, reachOutScore, computeConnections,
  type ConnectionInput,
} from "./connections";

describe("daysBetween", () => {
  it("counts whole days between two instants", () => {
    expect(daysBetween(new Date("2026-09-01T00:00:00Z"), new Date("2026-09-15T00:00:00Z"))).toBe(14);
    expect(daysBetween(new Date("2026-09-15T12:00:00Z"), new Date("2026-09-15T18:00:00Z"))).toBe(0);
  });
});

describe("isoWeekKey", () => {
  it("is stable within a week and changes across weeks", () => {
    const mon = isoWeekKey(new Date("2026-09-07T09:00:00Z"));
    const sun = isoWeekKey(new Date("2026-09-13T23:00:00Z"));
    const nextMon = isoWeekKey(new Date("2026-09-14T00:00:00Z"));
    expect(mon).toBe(sun);
    expect(nextMon).not.toBe(mon);
    expect(mon).toMatch(/^\d{4}-W\d{2}$/);
  });
});

describe("recencyLabel", () => {
  it("reads naturally across ranges", () => {
    expect(recencyLabel(null)).toBe("Not logged yet");
    expect(recencyLabel(0)).toBe("Connected today");
    expect(recencyLabel(1)).toBe("Connected yesterday");
    expect(recencyLabel(3)).toBe("Connected 3 days ago");
    expect(recencyLabel(18)).toBe("It's been about two weeks");
    expect(recencyLabel(90)).toBe("It's been a long while");
  });
});

describe("reachOutScore", () => {
  it("ranks warm-and-overdue above warm-and-recent", () => {
    const overdue = reachOutScore("warm", 30, 1);
    const recent = reachOutScore("warm", 2, 1);
    expect(overdue).toBeGreaterThan(recent);
  });
  it("ranks a warm window above a quiet one", () => {
    expect(reachOutScore("warm", null, 1)).toBeGreaterThan(reachOutScore("quiet", null, 0));
  });
});

describe("computeConnections", () => {
  const now = new Date("2026-09-06T12:00:00Z");
  // A minimal chart is enough — the recency fields are deterministic regardless
  // of the sky, and quality is always one of the known values.
  const chart = { planets: [{ name: "Venus", absoluteDegree: 100 }, { name: "Sun", absoluteDegree: 20 }] } as unknown as ConnectionInput["chart"];

  it("computes recency and overdue from last contact", () => {
    const people: ConnectionInput[] = [
      { id: "a", name: "Maya", relationship: "friend", chart, lastContactAt: "2026-08-01T00:00:00Z" }, // ~36d
      { id: "b", name: "Sam", relationship: null, chart, lastContactAt: "2026-09-05T00:00:00Z" },       // ~1d
      { id: "c", name: "Kai", relationship: "sister", chart, lastContactAt: null },                      // never
    ];
    const byId = Object.fromEntries(computeConnections(people, now).map((c) => [c.personId, c]));
    expect(byId.a.overdue).toBe(true);
    expect(byId.a.daysSince).toBeGreaterThanOrEqual(30);
    expect(byId.b.overdue).toBe(false);
    expect(byId.c.daysSince).toBeNull();
    for (const c of Object.values(byId)) expect(["warm", "tender", "quiet"]).toContain(c.quality);
  });

  it("returns highest reach-out score first", () => {
    const people: ConnectionInput[] = [
      { id: "recent", name: "Recent", relationship: null, chart, lastContactAt: now.toISOString() },
      { id: "overdue", name: "Overdue", relationship: null, chart, lastContactAt: "2026-07-01T00:00:00Z" },
    ];
    const sorted = computeConnections(people, now);
    expect(sorted[0].score).toBeGreaterThanOrEqual(sorted[sorted.length - 1].score);
  });
});
