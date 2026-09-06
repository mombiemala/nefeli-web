import { describe, it, expect } from "vitest";
import { splitAction } from "./daily";

describe("splitAction", () => {
  it("splits a trailing ACTION line from the body", () => {
    const raw = "First paragraph.\n\nSecond paragraph.\n\nACTION: Take a slow walk at dusk.";
    const { body, action } = splitAction(raw);
    expect(body).toBe("First paragraph.\n\nSecond paragraph.");
    expect(action).toBe("Take a slow walk at dusk.");
  });

  it("is case-insensitive and tolerates extra spacing", () => {
    const { action } = splitAction("Body.\n\n  action :   Notice one small kindness.  ");
    expect(action).toBe("Notice one small kindness.");
  });

  it("strips surrounding quotes from the action", () => {
    const { action } = splitAction('Body.\n\nACTION: "Say the thing you keep postponing."');
    expect(action).toBe("Say the thing you keep postponing.");
  });

  it("returns the whole text as body when no marker is present", () => {
    const raw = "Just a grounding reading with no action.";
    const { body, action } = splitAction(raw);
    expect(body).toBe(raw);
    expect(action).toBeNull();
  });

  it("keeps a multi-sentence action intact", () => {
    const { action } = splitAction("Body.\n\nACTION: Rest first. Then decide.");
    expect(action).toBe("Rest first. Then decide.");
  });
});
