"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Intent = "work" | "date" | "everyday" | "staples";

export default function OnboardingPage() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  // Step 1: Display name
  const [displayName, setDisplayName] = useState("");

  // Step 2: Birth details
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthPlace, setBirthPlace] = useState("");

  // Step 3: Style intent
  const [intent, setIntent] = useState<Intent>("everyday");

  function nextStep() {
    setError(null);

    if (step === 1) {
      if (!displayName.trim()) {
        setError("Please enter your display name.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!birthDate) {
        setError("Birth date is required.");
        return;
      }
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  }

  function prevStep() {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
    }
  }

  async function saveProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Authentication error. Please try logging in again.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      user_id: user.id,
      email: user.email,
      display_name: displayName.trim(),
      birth_date: birthDate,
      birth_time: birthTime || null,
      birth_place: birthPlace.trim() || null,
      style_intent: intent,
    };

    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "user_id" });

    if (upsertError) {
      setError(upsertError.message);
      setSaving(false);
      return;
    }

    // Success - redirect to profile
    window.location.href = "/profile";
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-50">
          Complete your profile
        </h1>
        <p className="mt-2 text-sm text-neutral-400">
          This helps NEFELI tailor styling suggestions to you and your goals.
        </p>
      </div>

      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full ${
                s <= step ? "bg-neutral-50" : "bg-neutral-800"
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-neutral-500">Step {step} of 4</p>
      </div>

      {/* Step 1: Display Name */}
      {step === 1 && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8">
          <h2 className="text-xl font-semibold text-neutral-50">What should we call you?</h2>
          <p className="mt-2 text-sm text-neutral-400">
            This is how your name will appear in your profile.
          </p>

          <div className="mt-6">
            <label htmlFor="displayName" className="block text-sm font-medium text-neutral-200">
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              required
              className="mt-2 block w-full rounded-lg border border-neutral-800 bg-neutral-950/50 px-3 py-2.5 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoFocus
            />
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-800/50 bg-red-950/20 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={nextStep}
              disabled={!displayName.trim()}
              className="rounded-lg bg-neutral-50 px-6 py-2.5 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-50 focus:ring-offset-2 focus:ring-offset-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Birth Details */}
      {step === 2 && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8">
          <h2 className="text-xl font-semibold text-neutral-50">Birth details</h2>
          <p className="mt-2 text-sm text-neutral-400">
            We use your birth information to calculate your astrological chart placements—Sun,
            Moon, Rising, and more—which inform your personalized styling guidance. The more
            accurate your details, the more precise your chart and style recommendations.
          </p>

          <div className="mt-6 space-y-6">
            <div>
              <label htmlFor="birthDate" className="block text-sm font-medium text-neutral-200">
                Birth date <span className="text-neutral-500">(required)</span>
              </label>
              <input
                id="birthDate"
                type="date"
                required
                className="mt-2 block w-full rounded-lg border border-neutral-800 bg-neutral-950/50 px-3 py-2.5 text-sm text-neutral-50 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
              <p className="mt-2 text-xs text-neutral-500">
                Used to calculate your Sun and Moon signs.
              </p>
            </div>

            <div>
              <label htmlFor="birthTime" className="block text-sm font-medium text-neutral-200">
                Birth time <span className="text-neutral-500">(optional)</span>
              </label>
              <input
                id="birthTime"
                type="time"
                className="mt-2 block w-full rounded-lg border border-neutral-800 bg-neutral-950/50 px-3 py-2.5 text-sm text-neutral-50 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
                value={birthTime}
                onChange={(e) => setBirthTime(e.target.value)}
              />
              <p className="mt-2 text-xs text-neutral-500">
                Helps calculate your Rising sign and Midheaven more accurately.
              </p>
            </div>

            <div>
              <label htmlFor="birthPlace" className="block text-sm font-medium text-neutral-200">
                Birth location <span className="text-neutral-500">(optional)</span>
              </label>
              <input
                id="birthPlace"
                type="text"
                className="mt-2 block w-full rounded-lg border border-neutral-800 bg-neutral-950/50 px-3 py-2.5 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
                placeholder="City, State / Country"
                value={birthPlace}
                onChange={(e) => setBirthPlace(e.target.value)}
              />
              <p className="mt-2 text-xs text-neutral-500">
                Used for precise chart calculations based on location.
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-6 rounded-lg border border-red-800/50 bg-red-950/20 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="mt-8 flex justify-between">
            <button
              type="button"
              onClick={prevStep}
              className="rounded-lg border border-neutral-800 bg-transparent px-6 py-2.5 text-sm font-semibold text-neutral-50 transition-colors hover:border-neutral-700 hover:bg-neutral-900/50 focus:outline-none focus:ring-2 focus:ring-neutral-800 focus:ring-offset-2 focus:ring-offset-neutral-900"
            >
              Back
            </button>
            <button
              type="button"
              onClick={nextStep}
              disabled={!birthDate}
              className="rounded-lg bg-neutral-50 px-6 py-2.5 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-50 focus:ring-offset-2 focus:ring-offset-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Style Intent */}
      {step === 3 && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8">
          <h2 className="text-xl font-semibold text-neutral-50">Style intent</h2>
          <p className="mt-2 text-sm text-neutral-400">
            What are you dressing for most often? This helps us prioritize which chart placements
            to highlight in your styling guidance.
          </p>

          <div className="mt-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ["work", "Work / business"],
                ["date", "Dates / romance"],
                ["everyday", "Everyday"],
                ["staples", "Closet staples"],
              ] as Array<[Intent, string]>).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setIntent(key)}
                  className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
                    intent === key
                      ? "border-neutral-50 bg-neutral-50 text-neutral-950"
                      : "border-neutral-800 bg-transparent text-neutral-100 hover:border-neutral-700 hover:bg-neutral-900/50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mt-6 rounded-lg border border-red-800/50 bg-red-950/20 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="mt-8 flex justify-between">
            <button
              type="button"
              onClick={prevStep}
              className="rounded-lg border border-neutral-800 bg-transparent px-6 py-2.5 text-sm font-semibold text-neutral-50 transition-colors hover:border-neutral-700 hover:bg-neutral-900/50 focus:outline-none focus:ring-2 focus:ring-neutral-800 focus:ring-offset-2 focus:ring-offset-neutral-900"
            >
              Back
            </button>
            <button
              type="button"
              onClick={nextStep}
              className="rounded-lg bg-neutral-50 px-6 py-2.5 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-50 focus:ring-offset-2 focus:ring-offset-neutral-900"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8">
          <h2 className="text-xl font-semibold text-neutral-50">Review your information</h2>
          <p className="mt-2 text-sm text-neutral-400">
            Please review your details before completing your profile.
          </p>

          <div className="mt-6 space-y-4 rounded-lg border border-neutral-800 bg-neutral-950/50 p-6">
            <div>
              <span className="text-xs font-medium text-neutral-500">Display name</span>
              <p className="mt-1 text-sm text-neutral-50">{displayName}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-neutral-500">Birth date</span>
              <p className="mt-1 text-sm text-neutral-50">{birthDate || "Not provided"}</p>
            </div>
            {birthTime && (
              <div>
                <span className="text-xs font-medium text-neutral-500">Birth time</span>
                <p className="mt-1 text-sm text-neutral-50">{birthTime}</p>
              </div>
            )}
            {birthPlace && (
              <div>
                <span className="text-xs font-medium text-neutral-500">Birth location</span>
                <p className="mt-1 text-sm text-neutral-50">{birthPlace}</p>
              </div>
            )}
            <div>
              <span className="text-xs font-medium text-neutral-500">Style intent</span>
              <p className="mt-1 text-sm text-neutral-50 capitalize">{intent}</p>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-neutral-800 bg-neutral-950/50 p-4">
            <p className="text-xs font-medium text-neutral-200">Privacy note</p>
            <p className="mt-2 text-xs leading-relaxed text-neutral-400">
              You control your data. You can edit or delete your profile and birth information at
              any time from your profile page. Your chart data is stored securely and only used to
              provide your personalized styling guidance.
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-lg border border-red-800/50 bg-red-950/20 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="mt-8 flex justify-between">
            <button
              type="button"
              onClick={prevStep}
              className="rounded-lg border border-neutral-800 bg-transparent px-6 py-2.5 text-sm font-semibold text-neutral-50 transition-colors hover:border-neutral-700 hover:bg-neutral-900/50 focus:outline-none focus:ring-2 focus:ring-neutral-800 focus:ring-offset-2 focus:ring-offset-neutral-900"
            >
              Back
            </button>
            <button
              type="button"
              onClick={saveProfile}
              disabled={saving}
              className="rounded-lg bg-neutral-50 px-6 py-2.5 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-50 focus:ring-offset-2 focus:ring-offset-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : "Complete setup"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

