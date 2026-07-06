# Scripts

## `seed-explore.mjs` — populate the Explore page with editorial imagery

Seeds the **Explore** page (`curator_collections` + `curator_images`) with
openly-licensed fashion photos from **Pexels** and **Pixabay** (both free for
commercial use, no attribution legally required — a credit is stored in each
image's caption anyway).

It is fully self-contained via the Supabase **service-role** key:

1. creates the public `curator-images` storage bucket if missing (the bucket the
   Explore / collections / curator pages render from),
2. creates a house **“NEFELI Editorial”** curator account + approved profile,
3. fetches, uploads, and inserts imagery tagged by intent (`work`, `date`,
   `everyday`, `staples`), one collection per intent, all published.

### Prerequisites

Free API keys (2 minutes each):
- Pexels — https://www.pexels.com/api/
- Pixabay — https://pixabay.com/api/docs/

You only need one, but both gives more variety.

### Run

```bash
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=sb_secret_... \
PEXELS_API_KEY=... \
PIXABAY_API_KEY=... \
node scripts/seed-explore.mjs
```

`SUPABASE_SERVICE_ROLE_KEY` is the **secret** key from Project Settings → API.
Run it from your machine (it needs outbound access to Supabase and the photo APIs).

Optional:
- `PER_QUERY=4` — images per search query per provider (default 4).
- `FORCE=1` — seed again even if editorial images already exist.

Re-running without `FORCE` is a no-op once seeded. To reset, delete the house
curator's rows (and the `editorial/` folder in the bucket) and run again.

### Notes / next steps

- Stock imagery is generic; curate/prune afterwards for on-brand quality.
- To add **Openverse** (CC, 800M+ works) later, add an `attribution jsonb` column
  to `curator_images` first so per-item CC credit can be stored.
- Do **not** add DeepFashion/DeepFashion2 imagery — those datasets are
  non-commercial only. Fashionpedia (CC-BY 4.0) is fine for tag taxonomy.
