#!/usr/bin/env node
/**
 * Seed the Explore page with editorial style imagery.
 *
 * What it does (all via the Supabase service-role key — no SQL Editor needed):
 *   1. Ensures a PUBLIC `curator-images` storage bucket exists (the bucket the
 *      Explore / collections / curator pages render from).
 *   2. Ensures a house "NEFELI Editorial" curator account + profile exists.
 *   3. Fetches openly-licensed fashion photos from Pexels and Pixabay
 *      (both free for commercial use, no attribution legally required — we store
 *      a credit in the caption anyway), uploads them into the bucket, and inserts
 *      `curator_images` rows tagged by intent, plus one `curator_collections` per
 *      intent. Everything is published so it shows up immediately.
 *
 * Run it from your own machine (this needs outbound internet to Supabase + the
 * photo APIs):
 *
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=sb_secret_... \
 *   PEXELS_API_KEY=... \
 *   PIXABAY_API_KEY=... \
 *   node scripts/seed-explore.mjs
 *
 * Optional env:
 *   PER_QUERY=4     images to pull per search query per provider (default 4)
 *   FORCE=1         re-seed even if editorial images already exist
 *
 * Get free API keys: https://www.pexels.com/api/  and  https://pixabay.com/api/docs/
 */

import { createClient } from "@supabase/supabase-js";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  PEXELS_API_KEY,
  PIXABAY_API_KEY,
  PER_QUERY = "4",
  FORCE,
} = process.env;

const BUCKET = "curator-images";
const HOUSE = {
  email: "editorial@nefeli.app",
  display_name: "NEFELI Editorial",
  public_handle: "nefeli",
  curator_tier: "editor",
};
const perQuery = Math.max(1, Math.min(10, parseInt(PER_QUERY, 10) || 4));

// intent -> collection meta + search queries + default style tags
const PLAN = [
  {
    intent: "work",
    collection: { title: "Polished at Work", description: "Tailored, considered pieces for the office and beyond." },
    tags: ["work", "minimalist", "formal"],
    queries: ["tailored blazer outfit", "minimal workwear woman", "office outfit neutral"],
  },
  {
    intent: "date",
    collection: { title: "Date Night", description: "Elevated looks with a little drama." },
    tags: ["date", "high fashion"],
    queries: ["evening outfit elegant", "date night dress", "night out fashion"],
  },
  {
    intent: "everyday",
    collection: { title: "Everyday Ease", description: "Relaxed, wearable looks for daily life." },
    tags: ["everyday", "casual", "street style"],
    queries: ["casual street style outfit", "everyday minimalist outfit", "denim casual look"],
  },
  {
    intent: "staples",
    collection: { title: "Wardrobe Staples", description: "The neutral building blocks of a capsule wardrobe." },
    tags: ["staples", "minimalist"],
    queries: ["capsule wardrobe neutral", "wardrobe basics flat lay", "neutral essentials clothing"],
  },
];

function must(name, val) {
  if (!val) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return val;
}

must("SUPABASE_URL", SUPABASE_URL);
must("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY);
if (!PEXELS_API_KEY && !PIXABAY_API_KEY) {
  console.error("Set at least one of PEXELS_API_KEY / PIXABAY_API_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// --- image sources -----------------------------------------------------------

// Returns [{ url, credit, ext }]
async function fromPexels(query, n) {
  if (!PEXELS_API_KEY) return [];
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${n}&orientation=portrait`,
    { headers: { Authorization: PEXELS_API_KEY } }
  );
  if (!res.ok) {
    console.warn(`  Pexels "${query}" -> ${res.status}`);
    return [];
  }
  const json = await res.json();
  return (json.photos || []).map((p) => ({
    url: p.src?.large || p.src?.original,
    credit: `Photo by ${p.photographer} on Pexels`,
    ext: "jpg",
  }));
}

async function fromPixabay(query, n) {
  if (!PIXABAY_API_KEY) return [];
  const res = await fetch(
    `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(query)}` +
      `&image_type=photo&category=fashion&per_page=${Math.max(3, n)}&safesearch=true`
  );
  if (!res.ok) {
    console.warn(`  Pixabay "${query}" -> ${res.status}`);
    return [];
  }
  const json = await res.json();
  return (json.hits || []).slice(0, n).map((h) => ({
    url: h.largeImageURL || h.webformatURL,
    credit: `Image by ${h.user} on Pixabay`,
    ext: "jpg",
  }));
}

async function downloadImages(query, n) {
  // Split the per-query budget across whichever providers are configured.
  const providers = [fromPexels, fromPixabay].filter((_, idx) =>
    idx === 0 ? !!PEXELS_API_KEY : !!PIXABAY_API_KEY
  );
  const per = Math.max(1, Math.ceil(n / providers.length));
  const out = [];
  for (const provider of providers) {
    try {
      out.push(...(await provider(query, per)));
    } catch (e) {
      console.warn(`  provider error for "${query}": ${e.message}`);
    }
  }
  return out.filter((x) => x.url).slice(0, n);
}

// --- setup helpers ------------------------------------------------------------

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets?.some((b) => b.name === BUCKET)) {
    console.log(`Bucket "${BUCKET}" already exists.`);
    return;
  }
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: "10MB",
  });
  if (error) throw new Error(`createBucket: ${error.message}`);
  console.log(`Created public bucket "${BUCKET}".`);
}

async function ensureHouseCurator() {
  // Find existing house user by email (paginate a little in case of other users).
  let houseId = null;
  for (let page = 1; page <= 5 && !houseId; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    houseId = data.users.find((u) => u.email === HOUSE.email)?.id || null;
    if (data.users.length < 200) break;
  }

  if (!houseId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: HOUSE.email,
      email_confirm: true,
      user_metadata: { display_name: HOUSE.display_name },
    });
    if (error) throw new Error(`createUser: ${error.message}`);
    houseId = data.user.id;
    console.log(`Created house curator user ${HOUSE.email}.`);
  } else {
    console.log(`House curator user already exists.`);
  }

  // Upsert the profile as an approved editorial curator. (service_role is exempt
  // from the privilege trigger, so these columns are allowed to be set here.)
  const { error: pErr } = await supabase.from("profiles").upsert(
    {
      user_id: houseId,
      email: HOUSE.email,
      display_name: HOUSE.display_name,
      public_handle: HOUSE.public_handle,
      role: "curator",
      curator_status: "approved",
      curator_tier: HOUSE.curator_tier,
    },
    { onConflict: "user_id" }
  );
  if (pErr) throw new Error(`profile upsert: ${pErr.message}`);
  return houseId;
}

// --- upload + insert ----------------------------------------------------------

async function uploadImage(intent, buf, contentType) {
  const id = crypto.randomUUID();
  const path = `editorial/${intent}/${id}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buf, { contentType, upsert: false });
  if (error) throw new Error(`upload: ${error.message}`);
  return path;
}

async function seedIntent(houseId, plan) {
  console.log(`\n[${plan.intent}] ${plan.collection.title}`);

  // Create the collection first (published), cover set after first image.
  const { data: col, error: cErr } = await supabase
    .from("curator_collections")
    .insert({
      curator_user_id: houseId,
      title: plan.collection.title,
      description: plan.collection.description,
      tags: plan.tags,
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (cErr) throw new Error(`collection insert: ${cErr.message}`);

  let firstPath = null;
  let count = 0;

  for (const query of plan.queries) {
    const imgs = await downloadImages(query, perQuery);
    for (const img of imgs) {
      try {
        const resp = await fetch(img.url);
        if (!resp.ok) continue;
        const contentType = resp.headers.get("content-type") || "image/jpeg";
        const buf = Buffer.from(await resp.arrayBuffer());
        const path = await uploadImage(plan.intent, buf, contentType);
        if (!firstPath) firstPath = path;

        const { error: iErr } = await supabase.from("curator_images").insert({
          curator_user_id: houseId,
          collection_id: col.id,
          storage_path: path,
          title: plan.collection.title,
          caption: img.credit,
          intent: plan.intent,
          tags: plan.tags,
          keywords: query.split(" ").filter((w) => w.length > 2),
          published_at: new Date().toISOString(),
        });
        if (iErr) {
          console.warn(`  insert row failed: ${iErr.message}`);
          continue;
        }
        count++;
        process.stdout.write(".");
      } catch (e) {
        console.warn(`  image failed (${query}): ${e.message}`);
      }
    }
  }

  if (firstPath) {
    await supabase
      .from("curator_collections")
      .update({ cover_image_path: firstPath })
      .eq("id", col.id);
  }
  console.log(`\n  -> ${count} images seeded.`);
  return count;
}

// --- main ---------------------------------------------------------------------

async function main() {
  await ensureBucket();
  const houseId = await ensureHouseCurator();

  if (!FORCE) {
    const { count } = await supabase
      .from("curator_images")
      .select("id", { count: "exact", head: true })
      .eq("curator_user_id", houseId)
      .not("published_at", "is", null);
    if (count && count > 0) {
      console.log(
        `\nEditorial curator already has ${count} published images. ` +
          `Set FORCE=1 to seed more. Exiting.`
      );
      return;
    }
  }

  let total = 0;
  for (const plan of PLAN) {
    total += await seedIntent(houseId, plan);
  }
  console.log(`\nDone. Seeded ${total} images across ${PLAN.length} collections.`);
  console.log("Open the Explore page to see them.");
}

main().catch((e) => {
  console.error("\nSeed failed:", e.message);
  process.exit(1);
});
