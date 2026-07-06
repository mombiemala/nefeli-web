"use client";

import type { ConversationType } from "@prisma/client";

export interface Starter {
  label: string;
  prompt: string;
  type: ConversationType;
}

export const STARTERS: Starter[] = [
  { label: "Tell me about today", prompt: "Tell me about today.", type: "DAILY_GUIDANCE" },
  { label: "What's happening this month?", prompt: "What's happening this month for me?", type: "MONTHLY_GUIDE" },
  { label: "Help me understand a placement", prompt: "Help me understand my Moon placement.", type: "CHART_READING" },
  { label: "I'm feeling something heavy", prompt: "I'm feeling heavy today — what does my chart say about this moment?", type: "HEALING_SESSION" },
  { label: "I need to make a decision", prompt: "I need to make a decision about something important. What's the timing like for me right now?", type: "TRANSIT_DEEP_DIVE" },
  { label: "What are my patterns?", prompt: "What are my recurring patterns around self-worth?", type: "OPEN_CHAT" },
];

export function ConversationStarters({
  onPick,
}: {
  onPick: (s: Starter) => void;
}) {
  return (
    <div className="mx-auto grid max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-2">
      {STARTERS.map((s) => (
        <button
          key={s.label}
          onClick={() => onPick(s)}
          className="glass group rounded-xl px-4 py-3 text-left text-sm text-cream-muted transition hover:border-gold/30 hover:text-cream"
        >
          <span className="mr-1.5 text-gold opacity-70 group-hover:opacity-100">✦</span>
          {s.label}
        </button>
      ))}
    </div>
  );
}
