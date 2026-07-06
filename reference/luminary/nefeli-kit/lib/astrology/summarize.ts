// Condensers that turn your Supabase rows into compact prompt sections.
// Genericized (no Prisma) — map your rows to these plain shapes.

import { titleCase } from "./utils";

export interface LifeContextRow {
  category: string;
  title: string;
  description: string;
  isActive?: boolean;
}
export interface DeclarationRow {
  declaration: string;
  contextNote?: string | null;
  declaredAt: string | Date;
  isActive?: boolean;
}
export interface InsightRow {
  insightType: string;
  title: string;
  content: string;
}

/** Condense life-context rows into a compact paragraph (target < 500 tokens). */
export function summarizeLifeContext(entries: LifeContextRow[]): string {
  const active = entries.filter((e) => e.isActive !== false);
  if (active.length === 0) {
    return "No life context on file yet. Gently invite them to share what's happening in their life so guidance can be specific.";
  }
  const byCategory = new Map<string, LifeContextRow[]>();
  for (const e of active) {
    const arr = byCategory.get(e.category) ?? [];
    arr.push(e);
    byCategory.set(e.category, arr);
  }
  const parts: string[] = [];
  for (const [category, items] of byCategory) {
    const detail = items
      .map((i) => {
        const desc = i.description.trim().replace(/\s+/g, " ");
        const clipped = desc.length > 220 ? desc.slice(0, 217) + "…" : desc;
        return `${i.title} — ${clipped}`;
      })
      .join("; ");
    parts.push(`• ${titleCase(category)}: ${detail}`);
  }
  return parts.join("\n");
}

export function summarizeDeclarations(declarations: DeclarationRow[]): string {
  const active = declarations.filter((d) => d.isActive !== false);
  if (active.length === 0) return "None declared yet.";
  return active
    .map((d) => {
      const when = new Date(d.declaredAt).toISOString().slice(0, 10);
      const note = d.contextNote ? ` (context: ${d.contextNote.trim()})` : "";
      return `• "${d.declaration.trim()}" — declared ${when}${note}`;
    })
    .join("\n");
}

export function summarizeInsights(insights: InsightRow[]): string {
  if (insights.length === 0) return "None recorded yet.";
  return insights
    .slice(0, 5)
    .map((i) => `• [${titleCase(i.insightType)}] ${i.title}: ${i.content.trim()}`)
    .join("\n");
}
