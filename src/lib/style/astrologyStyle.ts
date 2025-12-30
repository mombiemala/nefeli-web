export type Intent = "work" | "date" | "everyday" | "staples";

type Sign =
  | "Aries" | "Taurus" | "Gemini" | "Cancer" | "Leo" | "Virgo"
  | "Libra" | "Scorpio" | "Sagittarius" | "Capricorn" | "Aquarius" | "Pisces";

export function signElement(sign?: string | null) {
  const s = sign as Sign | undefined;
  if (!s) return null;
  if (["Aries", "Leo", "Sagittarius"].includes(s)) return "fire";
  if (["Taurus", "Virgo", "Capricorn"].includes(s)) return "earth";
  if (["Gemini", "Libra", "Aquarius"].includes(s)) return "air";
  if (["Cancer", "Scorpio", "Pisces"].includes(s)) return "water";
  return null;
}

export function signKeywords(sign?: string | null) {
  const el = signElement(sign);
  if (el === "fire") return { vibe: "bold and expressive", steer: "statement + contrast" };
  if (el === "earth") return { vibe: "grounded and polished", steer: "quality + structure" };
  if (el === "air") return { vibe: "clean and intentional", steer: "lines + layering" };
  if (el === "water") return { vibe: "soft and magnetic", steer: "drape + texture" };
  return { vibe: "balanced and adaptable", steer: "simple, well-fit staples" };
}

export function whyLine(args: {
  intent: Intent;
  sun?: string | null;
  moon?: string | null;
  rising?: string | null;
  mc?: string | null;
}) {
  const { intent, sun, moon, rising, mc } = args;

  const risingK = signKeywords(rising);
  const mcK = signKeywords(mc);
  const moonK = signKeywords(moon);
  const sunK = signKeywords(sun);

  switch (intent) {
    case "work":
      return `Work looks land best when they support your public signal. With MC in ${mc ?? "—"}, leaning ${mcK.steer} helps you read as ${mcK.vibe} without trying too hard.`;
    case "date":
      return `For dates, lead with approachability and texture. With Rising in ${rising ?? "—"} and Moon in ${moon ?? "—"}, a ${risingK.steer} base plus ${moonK.steer} details creates a vibe that feels ${risingK.vibe} and emotionally easy.`;
    case "everyday":
      return `Everyday style should feel easy to live in. With Moon in ${moon ?? "—"}, comfort-first choices with ${moonK.steer} keep you feeling like yourself while Rising in ${rising ?? "—"} keeps the look intentional.`;
    case "staples":
      return `Staples work when they match your signature. With Sun in ${sun ?? "—"} and MC in ${mc ?? "—"}, a core of ${sunK.steer} basics that still feel ${sunK.vibe} will stay wearable across situations.`;
    default:
      return `These picks align with your chart anchors so the look feels like you.`;
  }
}