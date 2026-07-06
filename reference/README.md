# reference/luminary — archived source

A full snapshot of the **Luminary** project (branch
`claude/luminary-astrology-app-2m8gzj`), preserved here before that repo was
deleted. It is the source of the NEFELI astrology kit and the reference
implementation the kit was extracted from (Prisma/NextAuth routes, components,
cron, `.env.example`, `vercel.json`).

**This directory is NOT part of the app build.** It is excluded from TypeScript
(`tsconfig.json` → `exclude`) and ESLint (`eslint.config.mjs`), and nothing under
`src/` imports from it. It exists purely as wiring reference for folding Luminary
into NEFELI (Supabase + token auth, no Prisma/NextAuth).

Key locations:
- `reference/luminary/nefeli-kit/` — the framework-agnostic kit to port into
  `src/lib/astrology` + `src/components/astrology`.
- `reference/luminary/app/api/**` — original routes (chat stream+persist,
  daily-guidance, monthly-guide, placement, cron/daily, conversations, user/*).
- `reference/luminary/lib/**` — original (Prisma-coupled) logic, for reference only.
- `reference/luminary/docs/` — the NEFELI × Luminary vision doc.

Safe to delete once the port (Phases 1–3) is complete.
