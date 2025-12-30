"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { whyLine } from "@/lib/style/astrologyStyle";

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

function getSignFamily(sign: string | null): "fire" | "earth" | "air" | "water" | null {
  if (!sign) return null;
  const s = sign.toLowerCase();
  if (["aries", "leo", "sagittarius"].includes(s)) return "fire";
  if (["taurus", "virgo", "capricorn"].includes(s)) return "earth";
  if (["gemini", "libra", "aquarius"].includes(s)) return "air";
  if (["cancer", "scorpio", "pisces"].includes(s)) return "water";
  return null;
}

function generateGuidance(intent: Intent, profile: Profile) {
  // Determine primary placements based on intent
  let primaryPlacement: { name: string; sign: Sign } | null = null;
  let secondaryPlacement: { name: string; sign: Sign } | null = null;

  if (intent === "work") {
    primaryPlacement = { name: "MC", sign: profile.mc_sign };
    secondaryPlacement = { name: "Rising", sign: profile.rising_sign };
  } else if (intent === "date") {
    primaryPlacement = { name: "Rising", sign: profile.rising_sign };
    secondaryPlacement = { name: "Moon", sign: profile.moon_sign };
  } else if (intent === "everyday") {
    primaryPlacement = { name: "Moon", sign: profile.moon_sign };
    secondaryPlacement = { name: "Rising", sign: profile.rising_sign };
  } else {
    // staples
    primaryPlacement = { name: "Sun", sign: profile.sun_sign };
    secondaryPlacement = { name: "MC", sign: profile.mc_sign };
  }

  // Get sign families
  const primaryFamily = getSignFamily(primaryPlacement?.sign || null);
  const secondaryFamily = getSignFamily(secondaryPlacement?.sign || null);

  // Outfit direction
  const outfitDirection = {
    title: "Outfit direction",
    bullets: [] as string[],
    why: "",
  };

  if (primaryFamily === "fire") {
    outfitDirection.bullets = [
      "Choose one statement piece—bold jacket, structured blazer, or standout accessory",
      "Keep the rest clean and minimal to let that piece shine",
      "High-contrast combinations work well (black + white, or deep + bright)",
    ];
  } else if (primaryFamily === "earth") {
    outfitDirection.bullets = [
      "Focus on quality fabrics—cotton, wool, or well-made synthetics",
      "Neutral palette with one grounding color (camel, olive, or charcoal)",
      "Tailored basics: straight-leg pants, fitted tops, structured outerwear",
    ];
  } else if (primaryFamily === "air") {
    outfitDirection.bullets = [
      "Clean lines and simple silhouettes",
      "Add one playful detail—unexpected color, interesting texture, or layered piece",
      "Avoid too much bulk; keep it light and moveable",
    ];
  } else {
    // water
    outfitDirection.bullets = [
      "Soft, drapey fabrics that move with you",
      "Tonal looks—different shades of the same color family",
      "Romantic textures: silk, cashmere, or soft knits",
    ];
  }

  outfitDirection.why = whyLine({
    intent,
    sun: profile.sun_sign,
    moon: profile.moon_sign,
    rising: profile.rising_sign,
    mc: profile.mc_sign,
  });

  // Color + texture
  const colorTexture = {
    title: "Color + texture",
    bullets: [] as string[],
    why: "",
  };

  if (primaryFamily === "fire") {
    colorTexture.bullets = [
      "High-contrast pairings: black and white, navy and cream, or deep burgundy with ivory",
      "Bold, saturated colors as accents",
      "Textured fabrics: tweed, corduroy, or structured knits",
    ];
  } else if (primaryFamily === "earth") {
    colorTexture.bullets = [
      "Neutral foundation: beige, taupe, charcoal, or olive",
      "Rich, muted tones: forest green, rust, or deep brown",
      "Natural textures: linen, wool, or quality denim",
    ];
  } else if (primaryFamily === "air") {
    colorTexture.bullets = [
      "Fresh, clear colors: crisp white, sky blue, or soft pastels",
      "Monochromatic looks with subtle variations",
      "Smooth, lightweight textures: cotton, silk, or fine knits",
    ];
  } else {
    // water
    colorTexture.bullets = [
      "Tonal palette: shades of blue, gray, or soft rose",
      "Soft, muted colors that blend together",
      "Fluid textures: silk, satin, or soft cashmere",
    ];
  }

  colorTexture.why = whyLine({
    intent,
    sun: profile.sun_sign,
    moon: profile.moon_sign,
    rising: profile.rising_sign,
    mc: profile.mc_sign,
  });

  // Beauty & finishing touches
  const beauty = {
    title: "Beauty & finishing touches",
    bullets: [] as string[],
    why: "",
  };

  if (intent === "work") {
    beauty.bullets = [
      "Sleek, polished hair—smooth blowout or neat updo",
      "Defined brows and clean, minimal makeup",
      "Neutral lip or one subtle accent color",
      "Sharp, structured accessories: watch or minimal jewelry",
    ];
    beauty.why = whyLine({
      intent,
      sun: profile.sun_sign,
      moon: profile.moon_sign,
      rising: profile.rising_sign,
      mc: profile.mc_sign,
    });
  } else if (intent === "date") {
    beauty.bullets = [
      "Soft, touchable hair with movement or gentle waves",
      "Glowy skin with soft blush and defined eyes",
      "A signature scent and one romantic detail (earrings or lip color)",
      "Gentle, approachable finish—nothing too done",
    ];
    beauty.why = whyLine({
      intent,
      sun: profile.sun_sign,
      moon: profile.moon_sign,
      rising: profile.rising_sign,
      mc: profile.mc_sign,
    });
  } else if (intent === "everyday") {
    beauty.bullets = [
      "Low-maintenance hair that looks good with minimal effort",
      "Fresh skin focus—tinted moisturizer or light coverage",
      "One defining feature: brows, mascara, or a signature lip",
      "Comfortable, easy accessories that don't distract",
    ];
    beauty.why = whyLine({
      intent,
      sun: profile.sun_sign,
      moon: profile.moon_sign,
      rising: profile.rising_sign,
      mc: profile.mc_sign,
    });
  } else {
    // staples
    beauty.bullets = [
      "Reliable hair routine that works consistently",
      "Simple, repeatable makeup look",
      "One signature element you can count on",
      "Quality basics: good skincare, dependable products",
    ];
    beauty.why = whyLine({
      intent,
      sun: profile.sun_sign,
      moon: profile.moon_sign,
      rising: profile.rising_sign,
      mc: profile.mc_sign,
    });
  }

  return {
    outfitDirection,
    colorTexture,
    beauty,
  };
}

type Board = {
  id: string;
  name: string;
};

export default function TodayPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [intent, setIntent] = useState<Intent>("everyday");
  const [boards, setBoards] = useState<Board[]>([]);
  const [savingCardKey, setSavingCardKey] = useState<string | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const [creatingNewBoard, setCreatingNewBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [savedCardId, setSavedCardId] = useState<string | null>(null);
  const [savedBoardId, setSavedBoardId] = useState<string | null>(null);
  const [savedBoardName, setSavedBoardName] = useState<string | null>(null);
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadProfile();
    loadBoards();
  }, []);

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

    const currentGuidance = generateGuidance(intent, profile);
    const card = currentGuidance[cardKey];
    const anchors = {
      sun: profile.sun_sign,
      moon: profile.moon_sign,
      rising: profile.rising_sign,
      mc: profile.mc_sign,
    };

    const { error } = await supabase.from("board_items").insert({
      board_id: boardId,
      user_id: user.id,
      intent: intent,
      title: card.title,
      bullets: card.bullets,
      why: card.why || null,
      anchors: anchors,
    });

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

  function handleSaveClick(cardKey: "outfitDirection" | "colorTexture" | "beauty") {
    if (boards.length === 0) {
      setCardErrors((prev) => ({
        ...prev,
        [cardKey]: "Create a board first to save guidance.",
      }));
      setCreatingNewBoard(true);
      setSavingCardKey(cardKey);
      return;
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

  const guidance = generateGuidance(intent, profile);

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
              onClick={() => setIntent(key)}
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
          <Link
            href="/boards"
            className="text-sm text-neutral-400 underline-offset-4 hover:text-neutral-300 hover:underline"
          >
            View saved
          </Link>
        </div>
        <div className="space-y-6">
          {/* Outfit direction */}
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
            <h3 className="text-base font-semibold text-neutral-50 mb-3 pr-20">
              {guidance.outfitDirection.title}
            </h3>
            <ul className="space-y-2 mb-4">
              {guidance.outfitDirection.bullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-50" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-neutral-500 italic">{guidance.outfitDirection.why}</p>
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

          {/* Color + texture */}
          <div className="relative rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
            {savingCardKey === "colorTexture" ? (
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
                          onClick={() => handleSaveSubmit("colorTexture")}
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
                            setCardErrors((prev) => ({ ...prev, colorTexture: "" }));
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
                          onClick={() => handleSaveSubmit("colorTexture")}
                          className="flex-1 rounded-lg bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-950 transition-colors hover:bg-neutral-100"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSavingCardKey(null);
                            setSelectedBoardId("");
                            setCardErrors((prev) => ({ ...prev, colorTexture: "" }));
                          }}
                          className="rounded-lg border border-neutral-700 bg-transparent px-3 py-1.5 text-xs font-medium text-neutral-200 transition-colors hover:bg-neutral-900"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                  {cardErrors.colorTexture && (
                    <p className="text-xs text-red-400">{cardErrors.colorTexture}</p>
                  )}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleSaveClick("colorTexture")}
                className="absolute top-6 right-6 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs font-medium text-neutral-200 transition-colors hover:bg-neutral-900 hover:border-neutral-600"
              >
                {savedCardId === "colorTexture" ? "Saved" : "Save"}
              </button>
            )}
            <h3 className="text-base font-semibold text-neutral-50 mb-3 pr-20">
              {guidance.colorTexture.title}
            </h3>
            <ul className="space-y-2 mb-4">
              {guidance.colorTexture.bullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-50" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-neutral-500 italic">{guidance.colorTexture.why}</p>
            {savedCardId === "colorTexture" && savedBoardName && (
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
            {cardErrors.colorTexture && savingCardKey !== "colorTexture" && (
              <p className="mt-2 text-xs text-red-400">{cardErrors.colorTexture}</p>
            )}
          </div>

          {/* Beauty & finishing touches */}
          <div className="relative rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
            {savingCardKey === "beauty" ? (
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
                          onClick={() => handleSaveSubmit("beauty")}
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
                            setCardErrors((prev) => ({ ...prev, beauty: "" }));
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
                          onClick={() => handleSaveSubmit("beauty")}
                          className="flex-1 rounded-lg bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-950 transition-colors hover:bg-neutral-100"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSavingCardKey(null);
                            setSelectedBoardId("");
                            setCardErrors((prev) => ({ ...prev, beauty: "" }));
                          }}
                          className="rounded-lg border border-neutral-700 bg-transparent px-3 py-1.5 text-xs font-medium text-neutral-200 transition-colors hover:bg-neutral-900"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                  {cardErrors.beauty && (
                    <p className="text-xs text-red-400">{cardErrors.beauty}</p>
                  )}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleSaveClick("beauty")}
                className="absolute top-6 right-6 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs font-medium text-neutral-200 transition-colors hover:bg-neutral-900 hover:border-neutral-600"
              >
                {savedCardId === "beauty" ? "Saved" : "Save"}
              </button>
            )}
            <h3 className="text-base font-semibold text-neutral-50 mb-3 pr-20">
              {guidance.beauty.title}
            </h3>
            <ul className="space-y-2 mb-4">
              {guidance.beauty.bullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-50" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-neutral-500 italic">{guidance.beauty.why}</p>
            {savedCardId === "beauty" && savedBoardName && (
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
            {cardErrors.beauty && savingCardKey !== "beauty" && (
              <p className="mt-2 text-xs text-red-400">{cardErrors.beauty}</p>
            )}
          </div>
        </div>
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

