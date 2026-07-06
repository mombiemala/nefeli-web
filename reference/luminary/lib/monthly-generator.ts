import { prisma } from "./prisma";
import { assembleContext } from "./luminary-context";
import { completeLuminary } from "./claude";
import { getMoonPhase, getTransits } from "./astrologer-api";
import { profileToSubject } from "./chart-utils";
import { deriveEnergyLevel, ENERGY_LABEL } from "./guidance-generator";
import { seededPick, toISODate } from "./utils";
import type { Transit } from "./types";

export interface MonthlyDay {
  date: string;
  day: number;
  moonSign: string;
  moonEmoji: string;
  energy: string;
  keyTransit: string;
  advice: string;
  prompt: string;
}

export interface MonthlyPayload {
  month: number;
  year: number;
  monthName: string;
  overview: string;
  moonPhases: { date: string; phase: string; emoji: string; sign: string; note: string }[];
  majorTransits: {
    label: string;
    exactDate: string;
    base: string;
    forYou: string;
    tip: string;
  }[];
  days: MonthlyDay[];
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const ADVICE_LINES = [
  "Let the day set its own pace.",
  "One honest conversation moves everything.",
  "Protect your focus; guard the first hour.",
  "Rest is productive today.",
  "Say the true thing, kindly.",
  "Create before you consume.",
  "Follow the thread of what feels alive.",
];

export async function getOrCreateMonthlyGuide(
  userId: string,
  month: number,
  year: number,
  regenerate = false,
): Promise<MonthlyPayload | null> {
  if (!regenerate) {
    const existing = await prisma.monthlyGuide.findUnique({
      where: { userId_month_year: { userId, month, year } },
    });
    if (existing) {
      return {
        month,
        year,
        monthName: MONTH_NAMES[month - 1],
        overview: existing.overview,
        moonPhases: existing.moonPhases as unknown as MonthlyPayload["moonPhases"],
        majorTransits: existing.majorTransits as unknown as MonthlyPayload["majorTransits"],
        days: existing.dailyGuides as unknown as MonthlyDay[],
      };
    }
  }

  const ctx = await assembleContext(userId, new Date(Date.UTC(year, month - 1, 15)));
  if (!ctx) return null;

  const profile =
    (await prisma.birthProfile.findFirst({ where: { userId, isDefault: true } })) ??
    (await prisma.birthProfile.findFirst({ where: { userId } }));
  if (!profile) return null;
  const subject = profileToSubject(profile);

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  // Sweep the month: moon sign + a representative transit per day.
  const days: MonthlyDay[] = [];
  const moonPhaseMarkers: MonthlyPayload["moonPhases"] = [];
  let lastPhase = "";

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(Date.UTC(year, month - 1, d, 12));
    const moon = await getMoonPhase(date);
    const dayTransits = await getTransits(subject, date);
    const top = dayTransits[0];
    const energy = deriveEnergyLevel(dayTransits);

    days.push({
      date: toISODate(date),
      day: d,
      moonSign: moon.moonSign,
      moonEmoji: moon.emoji,
      energy: ENERGY_LABEL[energy],
      keyTransit: top ? `${top.transitingPlanet} ${top.aspect} ${top.natalPlanet}` : "—",
      advice: seededPick(userId + toISODate(date), ADVICE_LINES),
      prompt: top ? `Notice where "${top.natalPlanet}" themes surface today.` : "Check in with yourself.",
    });

    if (["New Moon", "First Quarter", "Full Moon", "Last Quarter"].includes(moon.phaseName) &&
        moon.phaseName !== lastPhase) {
      moonPhaseMarkers.push({
        date: toISODate(date),
        phase: moon.phaseName,
        emoji: moon.emoji,
        sign: moon.moonSign,
        note: `${moon.phaseName} in ${moon.moonSign} — ${moonNote(moon.phaseName)}`,
      });
      lastPhase = moon.phaseName;
    }
  }

  // Major transits for the month = the strongest distinct aspects.
  const midTransits = await getTransits(subject, new Date(Date.UTC(year, month - 1, 15)));
  const seen = new Set<string>();
  const major = midTransits
    .filter((t) => {
      const k = `${t.transitingPlanet}-${t.aspect}-${t.natalPlanet}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 5);

  const overview = await completeLuminary(
    ctx.system,
    `Write a warm 2-paragraph overview of ${MONTH_NAMES[month - 1]} ${year} for this person, connecting the month's astrological weather to their specific life context. No headers or lists.`,
    600,
  );

  const majorTransits = await Promise.all(
    major.map(async (t) => ({
      label: `${t.transitingPlanet} ${t.aspect} ${t.natalPlanet}`,
      exactDate: t.exactDate,
      base: t.meaning,
      forYou: await forYou(ctx.system, t),
      tip: seededPick(t.exactDate + t.natalPlanet, ADVICE_LINES),
    })),
  );

  const saved = await prisma.monthlyGuide.upsert({
    where: { userId_month_year: { userId, month, year } },
    update: {
      overview,
      moonPhases: moonPhaseMarkers as unknown as object,
      majorTransits: majorTransits as unknown as object,
      dailyGuides: days as unknown as object,
    },
    create: {
      userId,
      month,
      year,
      overview,
      moonPhases: moonPhaseMarkers as unknown as object,
      majorTransits: majorTransits as unknown as object,
      dailyGuides: days as unknown as object,
    },
  });

  return {
    month,
    year,
    monthName: MONTH_NAMES[month - 1],
    overview: saved.overview,
    moonPhases: moonPhaseMarkers,
    majorTransits,
    days,
  };
}

async function forYou(system: string, t: Transit): Promise<string> {
  return completeLuminary(
    system,
    `In 1-2 sentences, explain what "${t.transitingPlanet} ${t.aspect} ${t.natalPlanet}" (activating the ${t.house}th house) means for THIS person specifically, given their life context. Be concrete. No preamble.`,
    250,
  );
}

function moonNote(phase: string): string {
  const notes: Record<string, string> = {
    "New Moon": "a doorway for intention-setting.",
    "First Quarter": "a push to act on what you planted.",
    "Full Moon": "culmination and release; what's ready to be seen.",
    "Last Quarter": "an invitation to let go and integrate.",
  };
  return notes[phase] ?? "a shift in the emotional tide.";
}
