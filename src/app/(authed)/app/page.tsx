"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import SaveToBoardModal from "@/components/SaveToBoardModal";

type Guidance = {
  id: string;
  title: string;
  bullets: string[];
  why: string;
  intent: string;
  source?: string;
  occasion?: string | null;
  created_at?: string;
  anchors: {
    sun: string | null;
    moon: string | null;
    rising: string | null;
    mc: string | null;
  };
};

type HistoryItem = {
  id: string;
  title: string;
  bullets: string[];
  why: string;
  intent: string;
  occasion?: string | null;
  created_at: string;
  source: string;
  anchors: {
    sun: string | null;
    moon: string | null;
    rising: string | null;
    mc: string | null;
  };
};

export default function AppPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [guidance, setGuidance] = useState<Guidance | null>(null);
  const [dailyGuidance, setDailyGuidance] = useState<Guidance | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [userTimezone, setUserTimezone] = useState<string>("UTC");
  const [profile, setProfile] = useState<{
    birth_date: string | null;
    birth_time: string | null;
  } | null>(null);
  const [guidanceError, setGuidanceError] = useState<string | null>(null);

  useEffect(() => {
    loadUserAndGuidance();
  }, []);

  async function loadUserAndGuidance() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    setUserId(user.id);

    // Fetch user profile to get timezone and birth info
    const { data: profileData } = await supabase
      .from("profiles")
      .select("tz, birth_date, birth_time, style_intent")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileData) {
      setProfile({
        birth_date: profileData.birth_date,
        birth_time: profileData.birth_time,
      });
      if (profileData.tz) {
        setUserTimezone(profileData.tz);
      }
    }

    // Only fetch guidance if birth_date exists
    if (!profileData?.birth_date) {
      setLoading(false);
      return;
    }

    // Call API which will return cached or generate new
    setLoading(true);
    setGuidanceError(null);
    try {
      const result = await fetchGuidance();
      if (result?.ok && result?.data) {
        setGuidance(result.data);
        // Store daily guidance separately
        setDailyGuidance(result.data);
      }
    } catch (error: any) {
      console.error("Failed to fetch guidance:", error);
      setGuidanceError(error?.message || "Unable to load guidance");
    } finally {
      setLoading(false);
  }
  }

  function getDayKey(tz: string): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());

    const y = parts.find((p) => p.type === "year")?.value ?? "1970";
    const m = parts.find((p) => p.type === "month")?.value ?? "01";
    const d = parts.find((p) => p.type === "day")?.value ?? "01";
    return `${y}-${m}-${d}`;
  }

  async function loadHistory() {
    if (!userId) return;

    const dayKey = getDayKey(userTimezone);

    const { data, error } = await supabase
      .from("ai_guidance")
      .select("id, title, bullets, why, intent, anchors, occasion, created_at, source")
      .eq("user_id", userId)
      .eq("day_key", dayKey)
      .eq("source", "today_manual")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Failed to load history:", error);
      return;
    }

    setHistoryItems((data as HistoryItem[]) || []);
  }

  function handleHistoryItemClick(item: HistoryItem) {
    setGuidance(item as Guidance);
  }

  function handleBackToToday() {
    if (dailyGuidance) {
      setGuidance(dailyGuidance);
    }
  }

  async function fetchGuidance(options?: { force?: boolean; occasion?: string | null }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No user");

    // Get intent from profile or default to "everyday"
    const { data: profileData } = await supabase
      .from("profiles")
      .select("style_intent")
      .eq("user_id", user.id)
      .maybeSingle();
    
    const intent = profileData?.style_intent || "everyday";
    const occasion = options?.occasion ?? null;
    const force = options?.force ?? false;

      const res = await fetch("/api/nefeli/today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        intent,
        occasion,
        force,
      }),
    });

    const status = res.status;
    const statusText = res.statusText;

    // Read response as text first
    let rawText = "";
    try {
      rawText = await res.text();
    } catch (e) {
      rawText = "__FAILED_TO_READ_BODY__";
    }

    // Parse JSON safely
    let payload: any = null;
    try {
      payload = rawText && rawText.startsWith("{") ? JSON.parse(rawText) : null;
    } catch (parseError) {
      console.error("Failed to parse API response:", parseError);
      payload = null;
    }

    // Log for debugging
    console.log("[/api/nefeli/today] rawText:", rawText);
    console.log("[/api/nefeli/today] parsed payload:", payload);

      if (!res.ok) {
      console.error("today API failed:", { status, statusText, rawText, payload });
      // Build user-visible error message with priority:
      // payload.supabase.message → payload.message → payload.error → first 300 chars of rawText → ${status} ${statusText}
      let errorMessage: string;
      if (payload?.supabase?.message) {
        errorMessage = typeof payload.supabase.message === "string" ? payload.supabase.message : String(payload.supabase.message);
      } else if (payload?.message) {
        errorMessage = typeof payload.message === "string" ? payload.message : String(payload.message);
      } else if (payload?.error) {
        errorMessage = typeof payload.error === "string" ? payload.error : String(payload.error);
      } else if (rawText && rawText.length > 0) {
        errorMessage = rawText.substring(0, 300);
      } else {
        errorMessage = `${status} ${statusText || "Error"}`;
      }
      
      throw new Error(errorMessage);
    }

    // Success ONLY when payload.ok === true AND payload.data exists
    if (payload?.ok === true && payload?.data) {
      // Map API response to Guidance type
      const guidanceData: Guidance = {
        id: "",
        title: payload.data.title || "",
        bullets: [...(payload.data.rules || []), ...(payload.data.color_story || [])],
        why: payload.data.one_liner || "",
        intent: payload.intent || intent,
        source: payload.source || "today",
        occasion: payload.occasion || null,
        anchors: {
          sun: null,
          moon: null,
          rising: null,
          mc: null,
        },
      };
      
      setGuidance(guidanceData);
      return { ok: true, data: guidanceData };
    }

    // If payload.data is missing, surface clear error
    if (payload?.ok === true && !payload?.data) {
      throw new Error("API returned ok but missing data");
    }

    const errorText = rawText && rawText.length > 0 ? rawText.substring(0, 300) : "empty body";
    throw new Error(`Unexpected API response format: ${errorText}`);
      }

  async function handleRegenerate() {
    if (!userId) return;
    setRegenerating(true);
    try {
      const result = await fetchGuidance({ force: true });
      if (result?.ok && result?.data) {
        setGuidance(result.data);
        // Load history after manual generation
        await loadHistory();
      }
    } catch (error: any) {
      console.error("Failed to regenerate guidance:", error);
      // Show user-readable error
      const errorMessage = error?.message || "Failed to regenerate guidance. Please try again.";
      setToastType("error");
      setSaveToast(errorMessage);
      setTimeout(() => {
        setSaveToast(null);
      }, 3000);
    } finally {
      setRegenerating(false);
    }
  }

  async function handleOccasionClick(occasion: string) {
    if (!userId) return;
    setRegenerating(true);
    try {
      const result = await fetchGuidance({ force: true, occasion });
      if (result?.ok && result?.data) {
        setGuidance(result.data);
        // Load history after manual generation
        await loadHistory();
      }
    } catch (error: any) {
      console.error("Failed to fetch guidance for occasion:", error);
      // Show user-readable error
      const errorMessage = error?.message || "Failed to generate guidance. Please try again.";
      setToastType("error");
      setSaveToast(errorMessage);
      setTimeout(() => {
        setSaveToast(null);
      }, 3000);
    } finally {
      setRegenerating(false);
    }
  }

  function handleSaveSuccess(boardName: string) {
    setToastType("success");
    setSaveToast(`Saved to ${boardName}`);
    setTimeout(() => {
      setSaveToast(null);
    }, 2500);
  }

  function formatTime(createdAt: string, tz: string): string {
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  const occasions = [
    "Job interview",
    "Work meeting",
    "Networking",
    "Date night",
    "Errands",
    "Weekend brunch",
    "Travel",
  ];

  // Show setup card if birth_date is missing
  if (!profile?.birth_date) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-50">Today</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Your personalized style guidance for today.
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-12 text-center">
          <h2 className="text-xl font-semibold text-neutral-50 mb-2">Complete your profile</h2>
          <p className="text-sm text-neutral-400 mb-6">
            Add your birth details to get personalized style guidance based on your chart.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/onboarding"
              className="rounded-xl bg-neutral-50 px-6 py-2.5 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-100"
            >
              Complete setup
            </Link>
            <Link
              href="/profile"
              className="rounded-xl border border-neutral-700 bg-transparent px-6 py-2.5 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-900"
            >
              Go to profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-neutral-50">Today</h1>
              <p className="mt-2 text-sm text-neutral-400">
                Your personalized style guidance for today.
              </p>
            </div>
            <Link
              href="/capsule"
              className="rounded-lg bg-neutral-50 px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100"
            >
              Build a capsule
            </Link>
          </div>
        </div>
        <div className="mb-6 flex flex-wrap gap-2">
          {occasions.map((occasion) => (
            <button
              key={occasion}
              type="button"
              disabled
              className="rounded-lg border border-neutral-700 bg-transparent px-3 py-1.5 text-sm font-medium text-neutral-300 opacity-50 cursor-not-allowed"
            >
              {occasion}
            </button>
          ))}
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-8 text-center">
          <p className="text-neutral-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!guidance) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-neutral-50">Today</h1>
              <p className="mt-2 text-sm text-neutral-400">
                Your personalized style guidance for today.
              </p>
            </div>
            <Link
              href="/capsule"
              className="rounded-lg bg-neutral-50 px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100"
            >
              Build a capsule
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-8 text-center">
          <p className="text-neutral-400 mb-4">{guidanceError || "Unable to load guidance."}</p>
          <button
            type="button"
            onClick={async () => {
              if (!userId) return;
              setLoading(true);
              setGuidanceError(null);
              try {
                const result = await fetchGuidance();
                if (result?.ok && result?.data) {
                  setGuidance(result.data);
                  setDailyGuidance(result.data);
                }
              } catch (error: any) {
                console.error("Failed to fetch guidance:", error);
                setGuidanceError(error?.message || "Unable to load guidance");
              } finally {
                setLoading(false);
              }
            }}
            className="rounded-xl border border-neutral-700 bg-transparent px-4 py-2 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-900"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-50">Today</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Your personalized style guidance for today.
        </p>
      </div>
          <div className="flex items-center gap-3">
            <Link
              href="/capsule/saved"
              className="text-sm font-medium text-neutral-300 underline-offset-4 hover:text-neutral-50 hover:underline"
            >
              Saved capsules
            </Link>
            <Link
              href="/capsule"
              className="rounded-lg bg-neutral-50 px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100"
            >
              Build a capsule
            </Link>
          </div>
        </div>
      </div>

      {/* Occasion Chips */}
      <div className="mb-6 flex flex-wrap gap-2">
        {occasions.map((occasion) => (
          <button
            key={occasion}
            type="button"
            onClick={() => handleOccasionClick(occasion)}
            disabled={regenerating || loading}
            className="rounded-lg border border-neutral-700 bg-transparent px-3 py-1.5 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-900 hover:border-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {occasion}
          </button>
        ))}
        {regenerating && (
          <span className="flex items-center px-3 py-1.5 text-xs text-neutral-500">
            Generating…
          </span>
        )}
      </div>

      {/* Birth time note */}
      {!profile?.birth_time && (
        <div className="mb-6 rounded-lg border border-amber-800/50 bg-amber-950/20 p-4">
          <p className="text-sm text-amber-400">
            Add birth time to unlock Rising + Midheaven insights
          </p>
          <Link
            href="/profile"
            className="mt-2 inline-block text-xs text-amber-300 underline-offset-4 hover:text-amber-200 hover:underline"
          >
            Update profile →
          </Link>
        </div>
      )}

      {/* Guidance Card */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
        {guidance.source === "today_manual" && (
          <div className="mb-4 flex items-center justify-between">
            <div className="text-xs text-neutral-500">
              Manual refresh{guidance.occasion ? ` • ${guidance.occasion}` : ""}
            </div>
            {dailyGuidance && (
              <button
                type="button"
                onClick={handleBackToToday}
                className="text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                Back to Today
              </button>
            )}
          </div>
        )}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-neutral-50">{guidance.title}</h2>
        </div>

        {/* Bullets */}
        <ul className="mb-4 space-y-2">
          {guidance.bullets.map((bullet, i) => (
            <li key={i} className="text-sm text-neutral-300">
              • {bullet}
            </li>
          ))}
        </ul>

        {/* Why */}
        <div className="mb-6 rounded-xl border border-neutral-800 bg-neutral-950/50 p-4">
          <p className="text-sm text-neutral-400">{guidance.why}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowSaveModal(true)}
            className="rounded-xl border border-neutral-700 bg-transparent px-4 py-2 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-900 hover:border-neutral-600"
          >
            Save to board
          </button>
          <Link
            href="/ask"
            className="rounded-xl border border-neutral-700 bg-transparent px-4 py-2 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-900 hover:border-neutral-600"
          >
            Ask NEFELI
          </Link>
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={regenerating}
            className="rounded-xl border border-neutral-700 bg-transparent px-4 py-2 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-900 hover:border-neutral-600 disabled:opacity-50"
          >
            {regenerating ? "Regenerating..." : "Regenerate"}
          </button>
        </div>
      </div>

      {/* Earlier Today History */}
      {historyItems.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-4 text-sm font-semibold text-neutral-400">Earlier today</h3>
          <div className="space-y-2">
            {historyItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleHistoryItemClick(item)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900/40 p-4 text-left transition-colors hover:bg-neutral-900 hover:border-neutral-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-neutral-200">{item.title}</div>
                    <div className="mt-1 text-xs text-neutral-500">
                      {item.occasion && `${item.occasion} • `}
                      {formatTime(item.created_at, userTimezone)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Save Toast */}
      {saveToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className={`rounded-lg border px-4 py-2 text-sm shadow-lg ${
            toastType === "error"
              ? "border-red-800/50 bg-red-950/90 text-red-200"
              : "border-green-800/50 bg-green-950/90 text-green-200"
          }`}>
            {saveToast}
          </div>
        </div>
      )}

      {/* Save Modal */}
      <SaveToBoardModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        userId={userId}
        savePayload={
          guidance
            ? {
                title: guidance.title,
                bullets: guidance.bullets,
                why: guidance.why,
                intent: guidance.intent,
                occasion: guidance.occasion,
                anchors: guidance.anchors,
              }
            : null
        }
        onSuccess={handleSaveSuccess}
      />
    </div>
  );
}

