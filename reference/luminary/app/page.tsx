import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/session";

const FEATURES = [
  {
    icon: "✶",
    title: "It remembers your life",
    body: "Luminary holds what you told it last week — the toxic pattern you declared freedom from, the job search, the parent you're caring for — and reads every transit through that lens.",
  },
  {
    icon: "☽",
    title: "Not a generic horoscope",
    body: "Every reading connects your actual placements to your lived experience. If it can't tie a transit to your real life, it isn't being specific enough.",
  },
  {
    icon: "✷",
    title: "A healing companion",
    body: "Astrology as a growth tool, not entertainment. It honors grief and ambivalence instead of bypassing them with toxic positivity.",
  },
];

const TIERS = [
  { name: "Free", price: "$0", features: ["Full birth chart", "10 chat messages / month", "Basic daily guidance"] },
  { name: "Premium", price: "$9.99/mo", features: ["Unlimited chat", "Full monthly guides", "Transit tracker", "Life context + insights"], featured: true },
  { name: "Founding Member", price: "$79.99/yr", features: ["Everything in Premium", "Early access", "Chart comparison & synastry"] },
];

export default async function Landing() {
  const uid = await currentUserId();
  if (uid) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <nav className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✶</span>
          <span className="heading text-xl text-gold">Luminary</span>
        </div>
        <Link href="/login" className="btn-ghost">
          Sign in
        </Link>
      </nav>

      <section className="mx-auto mt-20 max-w-3xl text-center animate-fade-up">
        <p className="chip mx-auto mb-6">✦ Your AI astrology companion</p>
        <h1 className="heading text-4xl leading-tight md:text-6xl">
          The astrologer who has{" "}
          <span className="bg-gold-shimmer bg-clip-text text-transparent">known you for years</span>
        </h1>
        <p className="subtle mx-auto mt-6 max-w-2xl text-lg">
          Luminary connects your birth chart to your actual life — your healing journey, your career,
          your creative practice, your relationships — and interprets every planetary event through
          that lens, specifically.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/login" className="btn-primary px-7 py-3 text-base">
            Begin your chart
          </Link>
          <Link href="/login" className="btn-ghost px-7 py-3 text-base">
            Sign in
          </Link>
        </div>
      </section>

      <section className="mt-24 grid gap-5 md:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="glass p-6">
            <div className="mb-3 text-3xl text-gold">{f.icon}</div>
            <h3 className="heading mb-2 text-xl">{f.title}</h3>
            <p className="subtle text-sm leading-relaxed">{f.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-24">
        <h2 className="heading text-center text-3xl">Choose your orbit</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`glass p-6 ${t.featured ? "border-gold/40 shadow-glow" : ""}`}
            >
              {t.featured && <p className="chip mb-3">Most loved</p>}
              <h3 className="heading text-xl">{t.name}</h3>
              <p className="mt-1 text-2xl text-gold">{t.price}</p>
              <ul className="mt-4 space-y-2 text-sm text-cream-muted">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="text-gold">✦</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/login" className={`mt-6 w-full ${t.featured ? "btn-primary" : "btn-ghost"}`}>
                Get started
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-24 border-t border-white/10 py-8 text-center text-sm text-cream-dim">
        Luminary · Built with care under the same sky as you.
      </footer>
    </main>
  );
}
