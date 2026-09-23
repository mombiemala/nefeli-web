import { describe, it, expect } from "vitest";
import { cleanModelText, looksInvalid, truncateAtSentence } from "./sanitize";

describe("cleanModelText", () => {
  it("strips a leaked self-check checklist (the Sep 22 Today bug)", () => {
    const raw =
      'constraints:**\n* Two short paragraphs? Yes.\n* Second person ("you")? Yes.\n* Warm, no headers? Yes.\n* Felt energy "Move Gently" included? Yes.\n\nYou have been steady this week, and the Taurus Moon meets that steadiness. Saturn asks you to stay with it.';
    const out = cleanModelText(raw);
    expect(out).not.toMatch(/constraints/i);
    expect(out).not.toMatch(/\?\s*yes/i);
    expect(out.startsWith("You have been steady")).toBe(true);
  });

  it("strips leaked prompt labels and markdown from nudges", () => {
    expect(cleanModelText("Goal:** Craft 1-2 warm sentences.\nVenus is warming your Jupiter today.")).toBe(
      "Venus is warming your Jupiter today.",
    );
    expect(cleanModelText("Natal Venus:* Gemini\nSomething true opens up between you and a friend.")).toBe(
      "Something true opens up between you and a friend.",
    );
    expect(cleanModelText("Examine Chart Context (\nThe Moon steadies you today, gently.")).toBe(
      "The Moon steadies you today, gently.",
    );
  });

  it("removes markdown emphasis and headings but keeps the words", () => {
    expect(cleanModelText("### Today\nYour **Virgo Ascendant** wants order.")).toBe(
      "Today\nYour Virgo Ascendant wants order.",
    );
  });

  it("leaves already-clean prose untouched", () => {
    const clean = "You moved a year ago and still haven't decided whether it counts as home.";
    expect(cleanModelText(clean)).toBe(clean);
  });
});

describe("looksInvalid", () => {
  it("rejects scaffolding-only output", () => {
    expect(looksInvalid("constraints: two short paragraphs? yes.")).toBe(true);
    expect(looksInvalid("* Warm, no headers? Yes.")).toBe(true);
    expect(looksInvalid("Goal: craft a warm reading")).toBe(true);
    expect(looksInvalid("")).toBe(true);
    expect(looksInvalid("Too short.")).toBe(true);
  });
  it("accepts a real reading", () => {
    expect(
      looksInvalid("You moved a year ago and still haven't decided whether it counts as home. Saturn is parked on your Neptune."),
    ).toBe(false);
  });
});

describe("truncateAtSentence", () => {
  it("trims a trailing incomplete sentence rather than cutting mid-phrase", () => {
    expect(truncateAtSentence("With Venus softly illuminating your natal Jupiter, ease arrives. And then Jupiter gently lighting up your natal Uranus right")).toBe(
      "With Venus softly illuminating your natal Jupiter, ease arrives.",
    );
  });
  it("leaves a clean sentence alone", () => {
    expect(truncateAtSentence("A good day to reach out.")).toBe("A good day to reach out.");
  });
});
