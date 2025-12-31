"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

type Intent = "work" | "date" | "everyday" | "staples";
type Sign = string | null;

type Profile = {
  display_name: string | null;
  style_intent: Intent | null;
  sun_sign: Sign;
  moon_sign: Sign;
  rising_sign: Sign;
  mc_sign: Sign;
};

type GuidanceData = {
  title: string;
  bullets: string[];
  why: string;
} | null;

// Raw data type for API responses (allows optional fields)
type RawGuidanceData = {
  title?: string;
  bullets?: string[];
  why?: string;
  [key: string]: any;
} | null;

type Board = {
  id: string;
  name: string;
};

export default function TodayPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [intent, setIntent] = useState<Intent>("everyday");
  const [guidance, setGuidance] = useState<GuidanceData>(null);
  const [guidanceLoading, setGuidanceLoading] = useState(false);
  const [guidanceError, setGuidanceError] = useState<string | null>(null);
  const [rawGuidanceText, setRawGuidanceText] = useState<string | null>(null); // Fallback for parsing failures
  const [boards, setBoards] = useState<Board[]>([]);
  const [savingCardKey, setSavingCardKey] = useState<string | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const [creatingNewBoard, setCreatingNewBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [savedCardId, setSavedCardId] = useState<string | null>(null);
  const [savedBoardId, setSavedBoardId] = useState<string | null>(null);
  const [savedBoardName, setSavedBoardName] = useState<string | null>(null);
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});
  const [savingToCapsule, setSavingToCapsule] = useState(false);
  const [capsuleToast, setCapsuleToast] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
    loadBoards();
  }, []);

  useEffect(() => {
    if (profile && intent) {
      fetchGuidance();
    }
  }, [profile, intent]);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("display_name, style_intent, sun_sign, moon_sign, rising_sign, mc_sign")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(profileError);
      setLoading(false);
      return;
    }

    if (profileData) {
      setProfile(profileData as Profile);
      setIntent((profileData.style_intent as Intent) || "everyday");
    }

    setLoading(false);
  }

  async function fetchGuidance() {
    if (!profile) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setGuidanceLoading(true);
    setGuidanceError(null);
    setRawGuidanceText(null);

    try {
      const res = await fetch("/api/nefeli/today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          force: false,
          occasion: intent,
          intent: intent,
        }),
      });

      const status = res?.status ?? null;
      const statusText = res?.statusText ?? null;

      let rawText = "";
      try {
        rawText = await res.text();
      } catch (e) {
        rawText = "__FAILED_TO_READ_BODY__";
      }

      let payload: any = null;
      try {
        payload = rawText && rawText.startsWith("{") ? JSON.parse(rawText) : null;
      } catch (parseError) {
        // If JSON parsing fails, store raw text for fallback display
        setRawGuidanceText(rawText);
        setGuidanceError("Failed to parse response. Showing raw text.");
        setGuidanceLoading(false);
        return;
      }

      if (!res.ok) {
        // Log error details for debugging
        console.error("today API failed:", { status, statusText, rawText });
        
        // Set user-visible error message with priority: supabase.message > error > status
        const errorMessage = payload?.supabase?.message || payload?.error || `${status} ${statusText || "Error"}`;
        setGuidanceError(errorMessage);
        setGuidanceLoading(false);
        return;
      }

      // Extract guidance data from response - read from API response data field
      const data = payload?.data ?? payload?.guidance ?? null;

      // If data is null/undefined, set error and stop
      if (!data) {
        setGuidance(null);
        setGuidanceError("No guidance data received");
        setGuidanceLoading(false);
        return;
      }

      // Runtime normalizer to guarantee GuidanceData always has safe defaults
      // Map bullets → rules UI, why → one-liner text
      // Make parsing tolerant: handle old format fields (rules, color_story, avoid)
      const rules = Array.isArray(data?.rules) ? data.rules.filter(Boolean) : [];
      const colorStory = Array.isArray(data?.color_story) ? data.color_story.filter(Boolean) : [];
      const avoid = Array.isArray(data?.avoid) ? data.avoid.filter(Boolean) : [];
      const bullets = Array.isArray(data?.bullets) ? data.bullets.filter(Boolean) : [];
      
      // Combine old format fields if bullets is empty
      const combinedBullets = bullets.length > 0 
        ? bullets 
        : [...rules, ...colorStory, ...avoid].filter(Boolean);

      const normalized = {
        title: typeof data?.title === "string" ? data.title : "",
        bullets: combinedBullets,
        why: typeof data?.why === "string" ? data.why : (typeof data?.one_liner === "string" ? data.one_liner : ""),
      };

      setGuidance(normalized);
    } catch (error: any) {
      console.error("Failed to fetch guidance:", error);
      setGuidanceError(error?.message || "Failed to fetch guidance");
    } finally {
      setGuidanceLoading(false);
    }
  }

  async function loadBoards() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("boards")
      .select("id,name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setBoards((data as Board[]) || []);
  }

  async function createBoardAndSave(cardKey: "outfitDirection" | "colorTexture" | "beauty") {
    if (!newBoardName.trim()) {
      setCardErrors((prev) => ({ ...prev, [cardKey]: "Board name is required" }));
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    // Create board
    const { data: boardData, error: boardError } = await supabase
      .from("boards")
      .insert({
        user_id: user.id,
        name: newBoardName.trim(),
      })
      .select()
      .single();

    if (boardError) {
      setCardErrors((prev) => ({ ...prev, [cardKey]: boardError.message }));
      return;
    }

    // Add to boards list
    setBoards((prev) => [{ id: boardData.id, name: boardData.name }, ...prev]);
    setSelectedBoardId(boardData.id);
    setCreatingNewBoard(false);
    setNewBoardName("");

    // Now save the item
    await saveToBoard(cardKey, boardData.id, boardData.name);
  }

  async function saveToBoard(
    cardKey: "outfitDirection" | "colorTexture" | "beauty",
    boardId: string,
    boardName: string
  ) {
    if (!profile) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    setCardErrors((prev) => ({ ...prev, [cardKey]: "" }));

    if (!guidance) {
      setCardErrors((prev) => ({ ...prev, [cardKey]: "No guidance available to save" }));
      return;
    }

    const anchors = {
      sun: profile.sun_sign,
      moon: profile.moon_sign,
      rising: profile.rising_sign,
      mc: profile.mc_sign,
    };

    // Map guidance fields to board_items format
    // Store bullets as rules, why as description text
    let title = "";
    let itemJson: any = null;

    if (cardKey === "outfitDirection") {
      title = "Outfit direction";
      itemJson = {
        title: guidance.title,
        one_liner: guidance.why,
        rules: guidance.bullets || [],
        occasion: null,
      };
    } else if (cardKey === "colorTexture") {
      title = "Color + texture";
      itemJson = {
        title: guidance.title,
        one_liner: guidance.why,
        rules: guidance.bullets || [],
        occasion: null,
      };
    } else if (cardKey === "beauty") {
      title = "Beauty & finishing touches";
      itemJson = {
        title: guidance.title,
        one_liner: guidance.why,
        rules: guidance.bullets || [],
        occasion: null,
      };
    }

    // Generate day_key in YYYY-MM-DD format
    const dayKey = new Date().toISOString().split("T")[0];

    // Try to insert with metadata columns, fallback to item_json if columns don't exist
    const insertData: any = {
      board_id: boardId,
      user_id: user.id,
      intent: intent,
      title: title,
      item_type: "style_rules",
      item_json: itemJson,
      anchors: anchors,
      source: "today",
      day_key: dayKey,
      occasion: intent,
    };

    // Also store in item_json for backward compatibility
    (itemJson as any).day_key = dayKey;

    const { error } = await supabase.from("board_items").insert(insertData);

    if (error) {
      setCardErrors((prev) => ({ ...prev, [cardKey]: error.message }));
      return;
    }

    // Success
    setSavedCardId(cardKey);
    setSavedBoardId(boardId);
    setSavedBoardName(boardName);
    setSavingCardKey(null);
    setSelectedBoardId("");
    setTimeout(() => {
      setSavedCardId(null);
      setSavedBoardId(null);
      setSavedBoardName(null);
    }, 5000);
  }

  async function ensureMyCapsuleExists(): Promise<string | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    // Check if "My Capsule" exists
    const { data: existing } = await supabase
      .from("boards")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("name", "My Capsule")
      .maybeSingle();

    if (existing) {
      return existing.id;
    }

    // Create "My Capsule"
    const { data: newBoard, error } = await supabase
      .from("boards")
      .insert({
        user_id: user.id,
        name: "My Capsule",
        description: null,
      })
      .select("id, name")
      .single();

    if (error || !newBoard) {
      console.error("Failed to create My Capsule:", error);
      return null;
    }

    // Add to boards list
    setBoards((prev) => [{ id: newBoard.id, name: newBoard.name }, ...prev]);
    return newBoard.id;
  }

  async function handleSaveClick(cardKey: "outfitDirection" | "colorTexture" | "beauty") {
    if (boards.length === 0) {
      // Auto-create "My Capsule" silently
      const capsuleId = await ensureMyCapsuleExists();
      if (capsuleId) {
        // Reload boards to get the new board in the list
        await loadBoards();
        // Proceed with save using the new board (we know it's "My Capsule")
        saveToBoard(cardKey, capsuleId, "My Capsule");
        return;
      } else {
        // Fallback to manual creation if auto-create fails
        setCardErrors((prev) => ({
          ...prev,
          [cardKey]: "Failed to create board. Please try again.",
        }));
        setCreatingNewBoard(true);
        setSavingCardKey(cardKey);
        return;
      }
    }

    setSavingCardKey(cardKey);
    setSelectedBoardId("");
    setCreatingNewBoard(false);
    setNewBoardName("");
    setCardErrors((prev) => ({ ...prev, [cardKey]: "" }));
  }

  function handleSaveSubmit(cardKey: "outfitDirection" | "colorTexture" | "beauty") {
    if (creatingNewBoard) {
      createBoardAndSave(cardKey);
      return;
    }

    if (!selectedBoardId) {
      setCardErrors((prev) => ({ ...prev, [cardKey]: "Please select a board" }));
      return;
    }

    const board = boards.find((b) => b.id === selectedBoardId);
    if (!board) return;

    saveToBoard(cardKey, selectedBoardId, board.name);
  }

  // This function is no longer used but kept for compatibility
  async function saveGuidance(cardKey: "outfitDirection" | "colorTexture" | "beauty") {
    handleSaveClick(cardKey);
  }

  async function saveToCapsule() {
    if (!profile || !guidance || savingToCapsule) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    setSavingToCapsule(true);
    setCapsuleToast(null);

    try {
      // Find or create "My Capsule" board
      let capsuleBoardId: string | null = null;

      // First, try to find existing "My Capsule" board
      const { data: existingBoard } = await supabase
        .from("boards")
        .select("id")
        .eq("user_id", user.id)
        .eq("name", "My Capsule")
        .maybeSingle();

      if (existingBoard) {
        capsuleBoardId = existingBoard.id;
      } else {
        // Create "My Capsule" board if it doesn't exist
        const { data: newBoard, error: createError } = await supabase
          .from("boards")
          .insert({
            user_id: user.id,
            name: "My Capsule",
          })
          .select("id")
          .single();

        if (createError || !newBoard) {
          throw new Error(createError?.message || "Failed to create board");
        }

        capsuleBoardId = newBoard.id;
        // Add to boards list
        setBoards((prev) => [{ id: newBoard.id, name: "My Capsule" }, ...prev]);
      }

      // Build anchors JSON
      const anchors = {
        sun: profile.sun_sign,
        moon: profile.moon_sign,
        rising: profile.rising_sign,
        mc: profile.mc_sign,
      };

      // Generate day_key in YYYY-MM-DD format
      const dayKey = new Date().toISOString().split("T")[0];

      // Insert into board_items with item_type and item_json
      // Store bullets as rules, why as description text
      const itemJson = {
        title: guidance.title,
        one_liner: guidance.why,
        rules: guidance.bullets || [],
        occasion: null,
      };

      // Try to insert with metadata columns, fallback to item_json if columns don't exist
      const insertData: any = {
        board_id: capsuleBoardId,
        user_id: user.id,
        intent: profile.style_intent || "everyday",
        title: guidance.title,
        item_type: "style_rules",
        item_json: itemJson,
        anchors: anchors,
        source: "today",
        day_key: dayKey,
        occasion: profile.style_intent || "everyday",
      };

      // Also store in item_json for backward compatibility
      (itemJson as any).day_key = dayKey;

      const { error: insertError } = await supabase.from("board_items").insert(insertData);

      if (insertError) {
        throw new Error(insertError.message);
      }

      // Show success toast
      setCapsuleToast("Saved to My Capsule");
      setTimeout(() => {
        setCapsuleToast(null);
      }, 3000);
    } catch (error: any) {
      console.error("Failed to save to capsule:", error);
      setCapsuleToast(error?.message || "Failed to save");
      setTimeout(() => {
        setCapsuleToast(null);
      }, 3000);
    } finally {
      setSavingToCapsule(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <div className="text-center">
          <p className="text-neutral-400">Loading…</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-50">Today</h1>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-12 text-center">
          <p className="text-sm text-neutral-400">Please complete your profile first.</p>
          <Link
            href="/onboarding"
            className="mt-4 inline-block rounded-lg bg-neutral-50 px-6 py-2.5 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100"
          >
            Complete setup
          </Link>
        </div>
      </div>
    );
  }

  // Check if Big 4 are missing
  const hasBig4 = profile.sun_sign && profile.moon_sign && profile.rising_sign && profile.mc_sign;

  if (!hasBig4) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-50">Today</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Style guidance based on your chart + your goal.
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-12 text-center">
          <h2 className="text-xl font-semibold text-neutral-50">Generate your chart</h2>
          <p className="mt-2 text-sm text-neutral-400">
            Once your chart is generated, you'll see personalized style guidance here.
          </p>
          <Link
            href="/profile"
            className="mt-6 inline-block rounded-xl bg-neutral-50 px-6 py-2.5 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-100"
          >
            Generate your chart
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-50">Today</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Style guidance based on your chart + your goal.
        </p>
      </div>

      {/* Intent Selector */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-neutral-200 mb-3">
          What are you dressing for?
        </label>
        <div className="flex gap-2 flex-wrap">
          {([
            ["work", "Work"],
            ["date", "Date"],
            ["everyday", "Everyday"],
            ["staples", "Staples"],
          ] as Array<[Intent, string]>).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setIntent(key);
                // Intent selector now affects the API response
              }}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                intent === key
                  ? "bg-neutral-50 text-neutral-950"
                  : "border border-neutral-800 bg-transparent text-neutral-200 hover:bg-neutral-900/50 hover:border-neutral-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Your anchors */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-neutral-50 mb-4">Your anchors</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { name: "Sun", sign: profile.sun_sign },
            { name: "Moon", sign: profile.moon_sign },
            { name: "Rising", sign: profile.rising_sign },
            { name: "MC", sign: profile.mc_sign },
          ].map((placement) => (
            <div
              key={placement.name}
              className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3 text-center"
            >
              <p className="text-xs font-medium text-neutral-500">{placement.name}</p>
              <p className="mt-1 text-sm font-semibold text-neutral-50 capitalize">
                {placement.sign || "—"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Your guidance */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-neutral-50">Your guidance</h2>
          <div className="flex items-center gap-4">
            {guidance && !guidanceLoading && (
              <button
                type="button"
                onClick={saveToCapsule}
                disabled={savingToCapsule}
                className="rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-900 hover:border-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingToCapsule ? "Saving..." : "Save to Capsule"}
              </button>
            )}
            <Link
              href="/boards"
              className="text-sm text-neutral-400 underline-offset-4 hover:text-neutral-300 hover:underline"
            >
              View saved
            </Link>
          </div>
        </div>

        {/* Toast notification */}
        {capsuleToast && (
          <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            capsuleToast.includes("Failed") || capsuleToast.includes("Error")
              ? "border-red-800/50 bg-red-950/20 text-red-400"
              : "border-green-800/50 bg-green-950/20 text-green-400"
          }`}>
            {capsuleToast}
          </div>
        )}

        {guidanceLoading && (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-12 text-center">
            <p className="text-neutral-400">Loading guidance...</p>
          </div>
        )}

        {guidanceError && (
          <div className="rounded-2xl border border-red-800/50 bg-red-950/20 p-6 mb-6">
            <p className="text-sm text-red-400 mb-2">{guidanceError}</p>
            {rawGuidanceText && (
              <pre className="text-xs text-neutral-300 whitespace-pre-wrap break-words">
                {rawGuidanceText}
              </pre>
            )}
          </div>
        )}

        {!guidanceLoading && !guidance && !guidanceError && (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-12 text-center">
            <p className="text-neutral-400">No guidance available. Try refreshing.</p>
          </div>
        )}

        {guidance && !guidanceLoading && (
          <div className="space-y-6">
            {/* Title and one-liner */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
              <h3 className="text-lg font-semibold text-neutral-50 mb-2">{guidance.title}</h3>
              <p className="text-sm text-neutral-300">{guidance.why}</p>
            </div>

            {/* Rules */}
            <div className="relative rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
              {savingCardKey === "outfitDirection" ? (
              <div className="absolute top-6 right-6 w-64 rounded-lg border border-neutral-800 bg-neutral-950 p-4 shadow-lg">
                <div className="space-y-3">
                  {creatingNewBoard ? (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-neutral-200 mb-1.5">
                          Board name
                        </label>
                        <input
                          type="text"
                          value={newBoardName}
                          onChange={(e) => setNewBoardName(e.target.value)}
                          placeholder="e.g., Work essentials"
                          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-neutral-50 placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
                          autoFocus
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveSubmit("outfitDirection")}
                          className="flex-1 rounded-lg bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-950 transition-colors hover:bg-neutral-100"
                        >
                          Create & Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSavingCardKey(null);
                            setCreatingNewBoard(false);
                            setNewBoardName("");
                            setCardErrors((prev) => ({ ...prev, outfitDirection: "" }));
                          }}
                          className="rounded-lg border border-neutral-700 bg-transparent px-3 py-1.5 text-xs font-medium text-neutral-200 transition-colors hover:bg-neutral-900"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <label className="block text-xs font-medium text-neutral-200 mb-1.5">
                        Select board
                      </label>
                      <select
                        value={selectedBoardId}
                        onChange={(e) => setSelectedBoardId(e.target.value)}
                        className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-neutral-50 focus:border-neutral-600 focus:outline-none"
                      >
                        <option value="">Choose a board...</option>
                        {boards.map((board) => (
                          <option key={board.id} value={board.id}>
                            {board.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setCreatingNewBoard(true);
                          setSelectedBoardId("");
                        }}
                        className="w-full text-left text-xs text-neutral-400 hover:text-neutral-300 underline"
                      >
                        + Create new board
                      </button>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveSubmit("outfitDirection")}
                          className="flex-1 rounded-lg bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-950 transition-colors hover:bg-neutral-100"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSavingCardKey(null);
                            setSelectedBoardId("");
                            setCardErrors((prev) => ({ ...prev, outfitDirection: "" }));
                          }}
                          className="rounded-lg border border-neutral-700 bg-transparent px-3 py-1.5 text-xs font-medium text-neutral-200 transition-colors hover:bg-neutral-900"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                  {cardErrors.outfitDirection && (
                    <p className="text-xs text-red-400">{cardErrors.outfitDirection}</p>
                  )}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleSaveClick("outfitDirection")}
                className="absolute top-6 right-6 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs font-medium text-neutral-200 transition-colors hover:bg-neutral-900 hover:border-neutral-600"
              >
                {savedCardId === "outfitDirection" ? "Saved" : "Save"}
              </button>
            )}
            <h3 className="text-base font-semibold text-neutral-50 mb-3 pr-20">Rules</h3>
            <ul className="space-y-2">
              {guidance?.bullets?.map((rule: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-50" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
            {savedCardId === "outfitDirection" && savedBoardName && (
              <div className="mt-2">
                <p className="text-xs text-green-400">
                  Saved to {savedBoardName}
                </p>
                {savedBoardId && (
                  <Link
                    href={`/boards/${savedBoardId}`}
                    className="text-xs text-neutral-400 underline-offset-4 hover:text-neutral-300 hover:underline"
                  >
                    View board
                  </Link>
                )}
              </div>
            )}
            {cardErrors.outfitDirection && savingCardKey !== "outfitDirection" && (
              <p className="mt-2 text-xs text-red-400">{cardErrors.outfitDirection}</p>
            )}
          </div>
          </div>
        )}
      </div>

      {/* Privacy note */}
      <div className="mb-8 rounded-lg border border-neutral-800 bg-neutral-950/50 p-4">
        <p className="text-xs text-neutral-500">
          Your birth details stay in your account and can be edited anytime.
        </p>
      </div>

      {/* View profile link */}
      <div className="text-center">
        <Link
          href="/profile"
          className="text-sm text-neutral-400 underline-offset-4 hover:text-neutral-300 hover:underline"
        >
          View profile
        </Link>
      </div>
    </div>
  );
}

