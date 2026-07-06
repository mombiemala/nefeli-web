import type {
  UserDeclaration, UserInsight, UserLifeContext,
} from "@prisma/client";
import { titleCase } from "./utils";

/**
 * Condense UserLifeContext rows into a compact, structured paragraph.
 * Kept deliberately short (target < 500 tokens) for the system prompt.
 */
export function summarizeLifeContext(entries: UserLifeContext[]): string {
  const active = entries.filter((e) => e.isActive);
  if (active.length === 0) {
    return "No life context on file yet. Gently invite them to share what's happening in their life so guidance can be specific.";
  }
  const byCategory = new Map<string, UserLifeContext[]>();
  for (const e of active) {
    const arr = byCategory.get(e.category) ?? [];
    arr.push(e);
    byCategory.set(e.category, arr);
  }
  const parts: string[] = [];
  for (const [category, items] of byCategory) {
    const label = titleCase(category);
    const detail = items
      .map((i) => {
        const desc = i.description.trim().replace(/\s+/g, " ");
        const clipped = desc.length > 220 ? desc.slice(0, 217) + "…" : desc;
        return `${i.title} — ${clipped}`;
      })
      .join("; ");
    parts.push(`• ${label}: ${detail}`);
  }
  return parts.join("\n");
}

export function summarizeDeclarations(declarations: UserDeclaration[]): string {
  const active = declarations.filter((d) => d.isActive);
  if (active.length === 0) return "None declared yet.";
  return active
    .map((d) => {
      const when = new Date(d.declaredAt).toISOString().slice(0, 10);
      const note = d.contextNote ? ` (context: ${d.contextNote.trim()})` : "";
      return `• "${d.declaration.trim()}" — declared ${when}${note}`;
    })
    .join("\n");
}

export function summarizeInsights(insights: UserInsight[]): string {
  if (insights.length === 0) return "None recorded yet.";
  return insights
    .slice(0, 5)
    .map((i) => `• [${titleCase(i.insightType)}] ${i.title}: ${i.content.trim()}`)
    .join("\n");
}
