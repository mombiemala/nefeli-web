"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

type Intent = "work" | "date" | "everyday" | "staples";

type CapsulePiece = {
  category: string;
  item: string;
  notes?: string;
};

type OutfitFormula = {
  name: string;
  items: string[];
  notes?: string;
};

type CapsuleResponse = {
  title: string;
  pieces: CapsulePiece[];
  outfits: OutfitFormula[];
  why: string[];
};

export default function CapsulePage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [savedIntent, setSavedIntent] = useState<Intent>("everyday");

  // Form state
  const [intent, setIntent] = useState<Intent>("everyday");
  const [season, setSeason] = useState("Any");
  const [colorVibe, setColorVibe] = useState("Any");
  const [dressCode, setDressCode] = useState("Any");
  const [notes, setNotes] = useState("");

  // Results state
  const [capsule, setCapsule] = useState<CapsuleResponse | null>(null);

  useEffect(() => {
    loadUserProfile();
  }, []);

  async function loadUserProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    setUserId(user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("style_intent")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile?.style_intent) {
      const userIntent = (profile.style_intent as Intent) || "everyday";
      setSavedIntent(userIntent);
      setIntent(userIntent);
    }
  }

  async function handleGenerate() {
    if (!userId) {
      setError("Please log in to generate a capsule.");
      return;
    }

    setLoading(true);
    setError(null);
    // Store previous capsule to restore on error
    const previousCapsule = capsule;
    setCapsule(null);

    try {
      const res = await fetch("/api/nefeli/capsule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          intent,
          season: season !== "Any" ? season : null,
          colorVibe: colorVibe !== "Any" ? colorVibe : null,
          dressCode: dressCode !== "Any" ? dressCode : null,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to generate capsule.");
        // Restore previous capsule on error so user can still save it
        if (previousCapsule) {
          setCapsule(previousCapsule);
        }
        setLoading(false);
        // Form inputs remain intact (controlled by state)
        return;
      }

      if (data.ok && data.data) {
        setCapsule(data.data);
        setError(null); // Clear any previous errors on success
      } else {
        setError(data.error || "Invalid response from server.");
        // Restore previous capsule on error
        if (previousCapsule) {
          setCapsule(previousCapsule);
        }
      }
    } catch (error: any) {
      console.error("Generate capsule error:", error);
      setError(error.message || "Failed to generate capsule. Please try again.");
      // Restore previous capsule on error
      if (previousCapsule) {
        setCapsule(previousCapsule);
      }
      // Form inputs remain intact (controlled by state)
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!userId || !capsule) return;

    setSaving(true);
    setError(null);

    try {
      const title = capsule.title || `My ${intent.charAt(0).toUpperCase() + intent.slice(1)} capsule`;

      const { error: saveError } = await supabase.from("capsules").insert({
        user_id: userId,
        title,
        intent,
        params: {
          season: season !== "Any" ? season : null,
          colorVibe: colorVibe !== "Any" ? colorVibe : null,
          dressCode: dressCode !== "Any" ? dressCode : null,
          notes: notes.trim() || null,
        },
        capsule_json: capsule,
      });

      if (saveError) {
        setError(saveError.message);
        setSaving(false);
        return;
      }

      setToast("Capsule saved");
      setJustSaved(true);
      setTimeout(() => {
        setToast(null);
      }, 3000);
    } catch (error: any) {
      console.error("Save capsule error:", error);
      setError("Failed to save capsule.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-50">Build a capsule</h1>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 rounded-lg bg-neutral-900 border border-neutral-800 px-4 py-3 text-sm text-neutral-50 shadow-lg z-50">
          {toast}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-800/50 bg-red-950/20 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Form */}
      <div className="mb-8 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8">
        <div className="space-y-6">
          {/* Intent pills */}
          <div>
            <label className="block text-sm font-medium text-neutral-200 mb-3">
              Style intent
            </label>
            <div className="flex flex-wrap gap-2">
              {([
                ["work", "Work"],
                ["date", "Dates"],
                ["everyday", "Everyday"],
                ["staples", "Staples"],
              ] as Array<[Intent, string]>).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setIntent(key)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    intent === key
                      ? "bg-neutral-50 text-neutral-950"
                      : "border border-neutral-800 bg-transparent text-neutral-200 hover:border-neutral-700 hover:bg-neutral-900/50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Season dropdown */}
          <div>
            <label htmlFor="season" className="block text-sm font-medium text-neutral-200 mb-2">
              Season
            </label>
            <select
              id="season"
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950/50 px-3 py-2.5 text-sm text-neutral-50 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
            >
              <option value="Any">Any</option>
              <option value="Winter">Winter</option>
              <option value="Spring">Spring</option>
              <option value="Summer">Summer</option>
              <option value="Fall">Fall</option>
            </select>
          </div>

          {/* Color vibe dropdown */}
          <div>
            <label htmlFor="colorVibe" className="block text-sm font-medium text-neutral-200 mb-2">
              Color vibe
            </label>
            <select
              id="colorVibe"
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950/50 px-3 py-2.5 text-sm text-neutral-50 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
              value={colorVibe}
              onChange={(e) => setColorVibe(e.target.value)}
            >
              <option value="Any">Any</option>
              <option value="Neutral">Neutral</option>
              <option value="Warm">Warm</option>
              <option value="Cool">Cool</option>
              <option value="High-contrast">High-contrast</option>
              <option value="Monochrome">Monochrome</option>
            </select>
          </div>

          {/* Dress code dropdown */}
          <div>
            <label htmlFor="dressCode" className="block text-sm font-medium text-neutral-200 mb-2">
              Dress code
            </label>
            <select
              id="dressCode"
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950/50 px-3 py-2.5 text-sm text-neutral-50 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
              value={dressCode}
              onChange={(e) => setDressCode(e.target.value)}
            >
              <option value="Any">Any</option>
              <option value="Business">Business</option>
              <option value="Business casual">Business casual</option>
              <option value="Casual">Casual</option>
              <option value="Night out">Night out</option>
            </select>
          </div>

          {/* Notes textarea */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-neutral-200 mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950/50 px-3 py-2.5 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
              placeholder="Anything to avoid or prioritize?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Generate button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="w-full rounded-xl bg-neutral-50 px-6 py-3 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Generating…" : "Generate capsule"}
          </button>
        </div>
      </div>

      {/* Results */}
      {capsule && (
        <div className="space-y-8">
          {/* Capsule pieces */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8">
            <h2 className="text-lg font-semibold text-neutral-50 mb-6">Capsule pieces</h2>
            <div className="space-y-6">
              {Object.entries(
                capsule.pieces.reduce((acc, piece) => {
                  if (!acc[piece.category]) {
                    acc[piece.category] = [];
                  }
                  acc[piece.category].push(piece);
                  return acc;
                }, {} as Record<string, CapsulePiece[]>)
              ).map(([category, pieces]) => (
                <div key={category}>
                  <h3 className="text-sm font-medium text-neutral-300 mb-2">{category}</h3>
                  <ul className="space-y-1">
                    {pieces.map((piece, itemIndex) => (
                      <li key={itemIndex} className="text-sm text-neutral-400">
                        • {piece.item}
                        {piece.notes && (
                          <span className="text-neutral-500 ml-2">({piece.notes})</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Outfit formulas */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8">
            <h2 className="text-lg font-semibold text-neutral-50 mb-6">Outfit formulas</h2>
            <div className="space-y-6">
              {capsule.outfits.map((outfit, index) => (
                <div key={index}>
                  <h3 className="text-sm font-medium text-neutral-300 mb-2">{outfit.name}</h3>
                  <ul className="space-y-1">
                    {outfit.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="text-sm text-neutral-400">
                        • {item}
                      </li>
                    ))}
                  </ul>
                  {outfit.notes && (
                    <p className="mt-2 text-xs text-neutral-500">{outfit.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Why this fits you */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8">
            <h2 className="text-lg font-semibold text-neutral-50 mb-6">Why this fits you</h2>
            <ul className="space-y-3">
              {capsule.why.map((reason, index) => (
                <li key={index} className="text-sm text-neutral-300">
                  • {reason}
                </li>
              ))}
            </ul>
          </div>

          {/* Save button and link */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-neutral-50 px-6 py-3 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : "Save capsule"}
            </button>
            <Link
              href="/capsule/saved"
              className="text-sm font-medium text-neutral-300 underline-offset-4 hover:text-neutral-50 hover:underline"
            >
              View saved capsules
            </Link>
          </div>
          
          {/* Success message with link after save */}
          {justSaved && (
            <div className="mt-4 rounded-lg border border-green-800/50 bg-green-950/20 p-3 text-sm text-green-200">
              Capsule saved!{" "}
              <Link
                href="/capsule/saved"
                className="font-medium underline-offset-4 hover:text-green-100 hover:underline"
                onClick={() => setJustSaved(false)}
              >
                View saved capsules
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

