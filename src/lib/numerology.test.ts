import { describe, it, expect } from "vitest";
import {
  reduceNumber, lifePath, birthdayNumber, expression, soulUrge, personality, computeNumerology,
} from "./numerology";

describe("reduceNumber", () => {
  it("reduces to a single digit", () => {
    expect(reduceNumber(19)).toBe(1); // 1+9=10 → 1
    expect(reduceNumber(25)).toBe(7); // 2+5=7
    expect(reduceNumber(38)).toBe(11); // 3+8=11 (master, kept)
  });
  it("preserves master numbers 11/22/33", () => {
    expect(reduceNumber(29)).toBe(11); // 2+9=11
    expect(reduceNumber(11)).toBe(11);
    expect(reduceNumber(22)).toBe(22);
  });
});

describe("date numbers", () => {
  it("computes Life Path from the birth date", () => {
    // 1990-06-15: month 6, day 1+5=6, year 1+9+9+0=19→1 → 6+6+1=13→4
    expect(lifePath("1990-06-15")).toBe(4);
  });
  it("computes the Birthday number", () => {
    expect(birthdayNumber("1990-06-15")).toBe(6); // 15 → 6
    expect(birthdayNumber("1990-06-29")).toBe(11); // 29 → master 11
  });
});

describe("name numbers", () => {
  it("computes Expression, Soul Urge, Personality", () => {
    // "John": J1 O6 H8 N5 = 20 → 2; vowels O=6 → 6; consonants J1 H8 N5 = 14 → 5
    expect(expression("John")).toBe(2);
    expect(soulUrge("John")).toBe(6);
    expect(personality("John")).toBe(5);
  });
  it("ignores spaces and punctuation", () => {
    expect(expression("Jo hn!")).toBe(expression("John"));
  });
});

describe("computeNumerology", () => {
  it("returns only date numbers without a name", () => {
    const core = computeNumerology("1990-06-15");
    expect(core.lifePath).toBe(4);
    expect(core.expression).toBeUndefined();
  });
  it("adds name numbers when a name is given", () => {
    const core = computeNumerology("1990-06-15", "John");
    expect(core.expression).toBe(2);
    expect(core.soulUrge).toBe(6);
    expect(core.personality).toBe(5);
  });
});
