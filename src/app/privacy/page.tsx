export default function PrivacyPage() {
  const year = new Date().getFullYear();

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-14 text-neutral-50">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs tracking-[0.25em] text-neutral-400">NEFELI</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Privacy</h1>
        <p className="mt-3 text-sm text-neutral-300">
          NEFELI is built to be private by default. This page explains what we store, why we store it,
          and how you can control it.
        </p>

        <div className="mt-8 space-y-6">
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
            <h2 className="text-lg font-semibold">What we store</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-300">
              <li><span className="text-neutral-100">Account info:</span> email (for login) and your chosen display name.</li>
              <li><span className="text-neutral-100">Birth details:</span> birth date, and optionally birth time + location (for Rising / Midheaven accuracy).</li>
              <li><span className="text-neutral-100">Chart outputs:</span> generated placements like Sun, Moon, Rising, and Midheaven.</li>
              <li><span className="text-neutral-100">Saved content:</span> boards and the guidance you save to them.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
            <h2 className="text-lg font-semibold">What we don't do</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-300">
              <li>We don't sell your personal data.</li>
              <li>We don't share your birth details publicly.</li>
              <li>We don't show your saved boards to other users.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
            <h2 className="text-lg font-semibold">Why we need birth time and location</h2>
            <p className="mt-3 text-sm text-neutral-300">
              Birth date is enough for some placements. Birth time and location improve accuracy for your
              Rising sign and Midheaven, which affect first impression and career-facing style guidance.
              You can still use NEFELI without them, but recommendations may be less precise.
            </p>
          </section>

          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
            <h2 className="text-lg font-semibold">Your controls</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-300">
              <li>You can edit your birth details anytime from your Profile.</li>
              <li>You can delete your NEFELI data from the Profile "Danger zone."</li>
              <li>If you choose to delete, we clear your birth details and placements, and (optionally) your boards.</li>
            </ul>

            <div className="mt-4">
              <a
                href="/profile"
                className="inline-flex items-center rounded-2xl border border-neutral-700 px-4 py-2 text-sm text-neutral-100 hover:bg-neutral-900"
              >
                Go to Profile
              </a>
            </div>
          </section>
        </div>

        <footer className="mt-10 border-t border-neutral-900 pt-6 text-xs text-neutral-500">
          © {year} NEFELI. This is an MVP privacy summary, not legal advice.
        </footer>
      </div>
    </main>
  );
}
