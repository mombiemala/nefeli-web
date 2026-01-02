"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import LocationAutocomplete from "@/components/LocationAutocomplete";

type Intent = "work" | "date" | "everyday" | "staples";

type Profile = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  birth_date: string | null;
  birth_time: string | null;
  birth_place: string | null;
  style_intent: Intent | null;
  avatar_url: string | null;
  sun_sign: string | null;
  moon_sign: string | null;
  rising_sign: string | null;
  mc_sign: string | null;
  lat?: number | null;
  lng?: number | null;
  tz?: string | null;
};

type ChartInputs = {
  birth_date: string | null;
  birth_time: string | null;
  birth_place: string | null;
  lat: number | null;
  lng: number | null;
  tz: string | null;
};

type PlacementInsight = {
  title: string;
  body: string;
  chips?: string[];
};

const INTENT_MODS: Record<Intent, { focus: string; do: string[]; avoid: string[] }> = {
  work: {
    focus: "polished, professional, authoritative",
    do: ["Clean lines", "Polished", "Neutral base", "Structured", "Tailored"],
    avoid: ["Casual", "Overly relaxed"],
  },
  date: {
    focus: "refined, approachable, soft details",
    do: ["Soft detail", "Refined", "Warm accents", "Elegant", "Approachable"],
    avoid: ["Too formal", "Harsh lines"],
  },
  everyday: {
    focus: "versatile, comfortable, balanced",
    do: ["Versatile", "Comfortable", "Balanced", "Easy", "Practical"],
    avoid: ["Too dressy", "Overly casual"],
  },
  staples: {
    focus: "timeless, quality, foundational",
    do: ["Timeless", "Quality", "Foundational", "Classic", "Essential"],
    avoid: ["Trendy", "Disposable"],
  },
};

function getPlacementInsight(role: "Sun" | "Moon" | "Rising" | "MC", sign: string | null, intent: Intent = "everyday"): PlacementInsight | null {
  if (!sign) return null;

  const signLower = sign.toLowerCase();
  const signTraits: Record<string, { tone: string; silhouettes: string; palette: string; textures: string }> = {
    aries: { tone: "bold, direct", silhouettes: "structured, sharp", palette: "high contrast, warm", textures: "crisp, defined" },
    taurus: { tone: "grounded, tactile", silhouettes: "fitted, substantial", palette: "earth tones, rich", textures: "luxe, soft" },
    gemini: { tone: "versatile, light", silhouettes: "layered, mix-and-match", palette: "bright, varied", textures: "mixed, playful" },
    cancer: { tone: "comfortable, protective", silhouettes: "soft, enveloping", palette: "muted, gentle", textures: "cozy, soft" },
    leo: { tone: "bold, intentional", silhouettes: "structured, statement", palette: "warm, vibrant", textures: "luxe, defined" },
    virgo: { tone: "refined, practical", silhouettes: "tailored, clean", palette: "neutral, precise", textures: "crisp, quality" },
    libra: { tone: "balanced, harmonious", silhouettes: "flowing, elegant", palette: "soft, balanced", textures: "smooth, refined" },
    scorpio: { tone: "intense, transformative", silhouettes: "fitted, dramatic", palette: "deep, rich", textures: "luxe, structured" },
    sagittarius: { tone: "adventurous, free", silhouettes: "relaxed, movement-friendly", palette: "bold, varied", textures: "natural, comfortable" },
    capricorn: { tone: "authoritative, classic", silhouettes: "structured, timeless", palette: "neutral, sophisticated", textures: "quality, defined" },
    aquarius: { tone: "unique, forward", silhouettes: "unconventional, modern", palette: "unexpected, cool", textures: "innovative, mixed" },
    pisces: { tone: "dreamy, fluid", silhouettes: "flowing, soft", palette: "muted, ethereal", textures: "soft, delicate" },
  };

  const traits = signTraits[signLower];
  if (!traits) return null;

  const mod = INTENT_MODS[intent];
  const signName = sign.charAt(0).toUpperCase() + sign.slice(1).toLowerCase();

  if (role === "Sun") {
    let body = "";
    let chips: string[] = [];

    if (intent === "work") {
      body = `You read best in clean lines and restraint. ${traits.silhouettes.charAt(0).toUpperCase() + traits.silhouettes.slice(1)} silhouettes with ${mod.focus} details project authority.`;
      chips = ["Clean lines", "Polished", "Neutral base"];
    } else if (intent === "date") {
      body = `You read best in soft details and refined pieces. ${traits.silhouettes.charAt(0).toUpperCase() + traits.silhouettes.slice(1)} shapes with ${mod.focus} accents feel approachable.`;
      chips = ["Soft detail", "Refined", "Warm accents"];
    } else if (intent === "everyday") {
      body = `You read best in ${traits.tone} pieces—one statement element at a time. ${traits.silhouettes.charAt(0).toUpperCase() + traits.silhouettes.slice(1)} silhouettes and ${traits.palette} tones tend to look 'right' on you.`;
      chips = [traits.silhouettes.split(", ")[0], traits.palette.split(", ")[0], "Versatile"];
    } else {
      // staples
      body = `You read best in timeless, quality pieces. ${traits.silhouettes.charAt(0).toUpperCase() + traits.silhouettes.slice(1)} silhouettes in ${traits.palette} create a solid foundation.`;
      chips = ["Timeless", "Quality", "Foundational"];
    }

    return {
      title: `Sun in ${signName}`,
      body,
      chips: chips.slice(0, 3),
    };
  }

  if (role === "Moon") {
    let body = "";
    let chips: string[] = [];

    if (intent === "work") {
      body = `Comfort matters even in professional settings. ${traits.textures.charAt(0).toUpperCase() + traits.textures.slice(1)} layers that feel polished help you stay grounded.`;
      chips = ["Comfortable", "Polished", "Quality"];
    } else if (intent === "date") {
      body = `Comfort matters. ${traits.textures.charAt(0).toUpperCase() + traits.textures.slice(1)} layers with soft, ${mod.focus} textures help you feel at ease.`;
      chips = ["Comfortable", "Soft", "Refined"];
    } else if (intent === "everyday") {
      body = `Comfort matters. ${traits.textures.charAt(0).toUpperCase() + traits.textures.slice(1)} layers, ${traits.tone} textures, and pieces that feel safe-to-wear help you stay grounded.`;
      chips = [traits.textures.split(", ")[0], traits.tone.split(", ")[0], "Comfort"];
    } else {
      // staples
      body = `Comfort matters. Invest in ${traits.textures.charAt(0).toUpperCase() + traits.textures.slice(1)} layers that feel timeless and quality.`;
      chips = ["Comfortable", "Timeless", "Quality"];
    }

    return {
      title: `Moon in ${signName}`,
      body,
      chips: chips.slice(0, 3),
    };
  }

  if (role === "Rising") {
    let body = "";
    let chips: string[] = [];

    if (intent === "work") {
      body = `Your first impression benefits from ${traits.silhouettes} lines and ${mod.focus} colors. Clean, structured details help you present authentically.`;
      chips = ["Clean lines", "Structured", "Professional"];
    } else if (intent === "date") {
      body = `Your first impression benefits from ${traits.silhouettes} lines with soft, ${mod.focus} details. Refined touches help you present authentically.`;
      chips = ["Soft lines", "Refined", "Approachable"];
    } else if (intent === "everyday") {
      body = `Your first impression benefits from ${traits.silhouettes} lines and ${traits.palette} colors. ${traits.tone.charAt(0).toUpperCase() + traits.tone.slice(1)} details help you present authentically.`;
      chips = [traits.silhouettes.split(", ")[0], traits.palette.split(", ")[0], "First impression"];
    } else {
      // staples
      body = `Your first impression benefits from ${traits.silhouettes} lines in timeless ${traits.palette} colors. Classic, quality details help you present authentically.`;
      chips = ["Timeless", "Classic", "Quality"];
    }

    return {
      title: `Rising in ${signName}`,
      body,
      chips: chips.slice(0, 3),
    };
  }

  if (role === "MC") {
    let body = "";
    let chips: string[] = [];

    if (intent === "work") {
      body = `For public-facing moments, ${traits.silhouettes} shapes and ${mod.focus} palettes project authority. Polished finishes convey professionalism.`;
      chips = ["Structured", "Polished", "Professional"];
    } else if (intent === "date") {
      body = `For public-facing moments, ${traits.silhouettes} shapes with ${mod.focus} details feel elegant. Refined finishes convey approachability.`;
      chips = ["Elegant", "Refined", "Approachable"];
    } else if (intent === "everyday") {
      body = `For public-facing moments, ${traits.silhouettes} shapes and ${traits.palette} palettes project authority. ${traits.textures.charAt(0).toUpperCase() + traits.textures.slice(1)} finishes convey professionalism.`;
      chips = [traits.silhouettes.split(", ")[0], traits.palette.split(", ")[0], "Professional"];
    } else {
      // staples
      body = `For public-facing moments, ${traits.silhouettes} shapes in timeless ${traits.palette} palettes project authority. Quality finishes convey professionalism.`;
      chips = ["Timeless", "Quality", "Professional"];
    }

    return {
      title: `Midheaven in ${signName}`,
      body,
      chips: chips.slice(0, 3),
    };
  }

  return null;
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [chartInputs, setChartInputs] = useState<ChartInputs | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit states
  const [editingAccount, setEditingAccount] = useState(false);
  const [editingBirth, setEditingBirth] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState(false);

  // Form states
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [birthLat, setBirthLat] = useState<number | null>(null);
  const [birthLng, setBirthLng] = useState<number | null>(null);
  const [birthTz, setBirthTz] = useState<string | null>(null);
  const [styleIntent, setStyleIntent] = useState<Intent>("everyday");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarError, setAvatarError] = useState(false);

  // Saving states
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingBirth, setSavingBirth] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  // Chart generation states
  const [genLoading, setGenLoading] = useState(false);
  const [genStatus, setGenStatus] = useState<string | null>(null);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [recalcToast, setRecalcToast] = useState<string | null>(null);

  // Delete data states
  const [wipeBoards, setWipeBoards] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);

  // Why we ask expandable
  const [showWhyWeAsk, setShowWhyWeAsk] = useState(false);

  // Intent preview
  const [previewIntent, setPreviewIntent] = useState<Intent>("everyday");
  const [savingIntent, setSavingIntent] = useState(false);
  const [intentToast, setIntentToast] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  // Sync previewIntent with savedIntent when profile loads
  useEffect(() => {
    if (profile) {
      const newSavedIntent = (profile.style_intent as Intent) || "everyday";
      setPreviewIntent(newSavedIntent);
    }
  }, [profile?.style_intent]);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    setUserId(user.id);

    // Fetch profile with required fields
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("birth_date, birth_time, birth_place, lat, lng, tz, sun_sign, moon_sign, rising_sign, mc_sign, display_name, email, style_intent, avatar_url, user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(profileError);
      setError("Error loading profile.");
      setLoading(false);
      return;
    }

    if (!profileData) {
      setLoading(false);
      return;
    }

    // Fetch natal_charts.inputs
    const { data: chartData } = await supabase
      .from("natal_charts")
      .select("inputs")
      .eq("user_id", user.id)
      .maybeSingle();

    setProfile(profileData as Profile);
    setChartInputs((chartData?.inputs as ChartInputs) || null);
    setDisplayName(profileData.display_name || "");
    setEmail(profileData.email || user.email || "");
    setBirthDate(profileData.birth_date || "");
    setBirthTime(profileData.birth_time || "");
    setBirthPlace(profileData.birth_place || "");
    setBirthLat((profileData as any).lat || null);
    setBirthLng((profileData as any).lng || null);
    setBirthTz((profileData as any).tz || null);
    setStyleIntent((profileData.style_intent as Intent) || "everyday");
    setAvatarUrl(profileData.avatar_url || "");
    setAvatarError(false);
    setLoading(false);
  }

  function needsRecalc(profile: Profile | null, inputs: ChartInputs | null): boolean {
    if (!inputs) return true;
    if (!profile) return false;
    return (
      (profile.birth_date ?? null) !== (inputs.birth_date ?? null) ||
      (profile.birth_time ?? null) !== (inputs.birth_time ?? null) ||
      (profile.birth_place ?? null) !== (inputs.birth_place ?? null) ||
      Number(profile.lat ?? null) !== Number(inputs.lat ?? null) ||
      Number(profile.lng ?? null) !== Number(inputs.lng ?? null) ||
      (profile.tz ?? null) !== (inputs.tz ?? null)
    );
  }

  async function handleRecalculate() {
    if (!userId) return;

    setRecalcLoading(true);
    setError(null);
    setSuccess(null);
    setRecalcToast(null);

    try {
      const res = await fetch("/api/chart/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to recalculate chart.");
        setRecalcLoading(false);
        return;
      }

      setRecalcToast("Chart updated");
      setTimeout(() => {
        setRecalcToast(null);
      }, 3000);

      // Re-fetch profile + natal_charts.inputs
      await loadProfile();
    } catch (error: any) {
      console.error("Recalculate error:", error);
      setError("Failed to recalculate chart.");
    } finally {
      setRecalcLoading(false);
    }
  }

  async function handleSaveIntent() {
    if (!userId) return;

    setSavingIntent(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ style_intent: previewIntent })
        .eq("user_id", userId);

      if (updateError) {
        setError(updateError.message);
        setSavingIntent(false);
        return;
      }

      setIntentToast("Default updated");
      setTimeout(() => {
        setIntentToast(null);
      }, 3000);

      // Update profile state to reflect new saved intent
      if (profile) {
        setProfile({ ...profile, style_intent: previewIntent });
      }
    } catch (error: any) {
      console.error("Save intent error:", error);
      setError("Failed to update default intent.");
    } finally {
      setSavingIntent(false);
    }
  }

  async function saveAccount() {
    if (!userId) return;

    setSavingAccount(true);
    setError(null);
    setSuccess(null);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        email: email.trim() || null,
      })
      .eq("user_id", userId);

    if (updateError) {
      setError(updateError.message);
      setSavingAccount(false);
      return;
    }

    setSuccess("Account information updated.");
    setEditingAccount(false);
    setSavingAccount(false);
    await loadProfile();
  }

  async function handleLocationSelect(item: { label: string; lat: number; lng: number }) {
    setBirthPlace(item.label);
    setBirthLat(item.lat);
    setBirthLng(item.lng);

    // Fetch timezone from coordinates
    try {
      const res = await fetch("/api/geo/timezone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: item.lat, lng: item.lng }),
      });

      const data = await res.json();
      if (data.tz) {
        setBirthTz(data.tz);
      } else {
        setBirthTz(null);
      }
    } catch (error) {
      console.error("Timezone lookup error:", error);
      setBirthTz(null);
    }
  }

  async function saveBirth() {
    if (!userId) return;

    setSavingBirth(true);
    setError(null);
    setSuccess(null);

    const updateData: any = {
      birth_date: birthDate || null,
      style_intent: styleIntent,
    };

    if (birthTime) {
      updateData.birth_time = birthTime;
    }
    if (birthPlace.trim()) {
      updateData.birth_place = birthPlace.trim();
    }
    if (birthLat !== null) {
      updateData.lat = birthLat;
    }
    if (birthLng !== null) {
      updateData.lng = birthLng;
    }
    if (birthTz !== null) {
      updateData.tz = birthTz;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("user_id", userId);

    if (updateError) {
      setError(updateError.message);
      setSavingBirth(false);
      return;
    }

    setSuccess("Birth details updated.");
    setEditingBirth(false);
    setSavingBirth(false);
    await loadProfile();
  }

  async function saveAvatar() {
    if (!userId) return;

    setSavingAvatar(true);
    setError(null);
    setSuccess(null);
    setAvatarError(false);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        avatar_url: avatarUrl.trim() || null,
      })
      .eq("user_id", userId);

    if (updateError) {
      setError(updateError.message);
      setSavingAvatar(false);
      return;
    }

    setSuccess("Avatar updated.");
    setEditingAvatar(false);
    setSavingAvatar(false);
    await loadProfile();
  }

  function cancelEdit(section: "account" | "birth" | "avatar") {
    if (section === "account") {
      setDisplayName(profile?.display_name || "");
      setEmail(profile?.email || "");
      setEditingAccount(false);
    } else if (section === "birth") {
      setBirthDate(profile?.birth_date || "");
      setBirthTime(profile?.birth_time || "");
      setBirthPlace(profile?.birth_place || "");
      setBirthLat((profile as any)?.lat || null);
      setBirthLng((profile as any)?.lng || null);
      setBirthTz((profile as any)?.tz || null);
      setStyleIntent((profile?.style_intent as Intent) || "everyday");
      setEditingBirth(false);
    } else if (section === "avatar") {
      setAvatarUrl(profile?.avatar_url || "");
      setEditingAvatar(false);
    }
    setError(null);
    setSuccess(null);
  }

  async function generateBig4() {
    setGenLoading(true);
    setGenStatus(null);
    setError(null);
    setSuccess(null);

    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      window.location.href = "/login";
      return;
    }

    const res = await fetch("/api/chart/big4", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id }),
    });

    const json = await res.json();
    if (!res.ok) {
      setGenStatus(json.error ?? "Could not generate chart.");
      setGenLoading(false);
      return;
    }

    setGenStatus("Chart regenerated successfully.");
    setGenLoading(false);
    // Reload profile data
    await loadProfile();
  }

  async function deleteMyData() {
    if (!userId) return;

    // Require typing DELETE (case-insensitive)
    if (deleteText.trim().toUpperCase() !== "DELETE") {
      setDeleteStatus("Please type DELETE to confirm.");
      return;
    }

    setDeleting(true);
    setDeleteStatus(null);
    setError(null);
    setSuccess(null);

    try {
      // Delete boards and board items if checkbox is checked
      if (wipeBoards) {
        // Delete board_items first (foreign key constraint)
        const { error: itemsError } = await supabase
          .from("board_items")
          .delete()
          .eq("user_id", userId);

        if (itemsError) {
          console.error(itemsError);
          setDeleteStatus("Error deleting board items.");
          setDeleting(false);
          return;
        }

        // Delete boards
        const { error: boardsError } = await supabase
          .from("boards")
          .delete()
          .eq("user_id", userId);

        if (boardsError) {
          console.error(boardsError);
          setDeleteStatus("Error deleting boards.");
          setDeleting(false);
          return;
        }
      }

      // Clear birth details and placements in profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          birth_date: null,
          birth_time: null,
          birth_place: null,
          lat: null,
          lng: null,
          tz: null,
          style_intent: null,
          sun_sign: null,
          moon_sign: null,
          rising_sign: null,
          mc_sign: null,
        })
        .eq("user_id", userId);

      if (profileError) {
        console.error(profileError);
        setDeleteStatus("Error clearing profile data.");
        setDeleting(false);
        return;
      }

      setDeleteStatus("Data deleted.");
      setDeleteText("");
      setWipeBoards(false);
      setDeleting(false);
      // Reload profile to show empty state
      await loadProfile();
    } catch (err) {
      console.error(err);
      setDeleteStatus("An error occurred while deleting data.");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-400">Loading…</p>
        </div>
      </div>
    );
  }

  // Empty state - no profile yet
  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-50">Profile</h1>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-neutral-800">
            <svg
              className="h-8 w-8 text-neutral-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-xl font-semibold text-neutral-50">Complete your profile</h2>
          <p className="mt-2 text-sm text-neutral-400">
            Set up your profile to get personalized styling guidance from NEFELI.
          </p>
          <Link
            href="/onboarding"
            className="mt-6 inline-block rounded-lg bg-neutral-50 px-6 py-2.5 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100"
          >
            Complete setup
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-50">Profile</h1>
          <Link
            href="/capsule"
            className="rounded-lg bg-neutral-50 px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100"
          >
            Build a capsule
          </Link>
        </div>
      </div>

      {/* Success/Error messages */}
      {success && (
        <div className="mb-6 rounded-lg border border-green-800/50 bg-green-950/20 p-3 text-sm text-green-200">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-6 rounded-lg border border-red-800/50 bg-red-950/20 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Toast notifications */}
      {recalcToast && (
        <div className="fixed bottom-4 right-4 rounded-lg bg-neutral-900 border border-neutral-800 px-4 py-3 text-sm text-neutral-50 shadow-lg z-50">
          {recalcToast}
        </div>
      )}
      {intentToast && (
        <div className="fixed bottom-4 right-4 rounded-lg bg-neutral-900 border border-neutral-800 px-4 py-3 text-sm text-neutral-50 shadow-lg z-50">
          {intentToast}
        </div>
      )}

      {/* Avatar Block */}
      <div className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8">
        <div className="flex items-center gap-6">
          <div className="relative">
            {avatarUrl && !avatarError ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="h-20 w-20 rounded-full object-cover"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-neutral-800 flex items-center justify-center">
                <svg
                  className="h-10 w-10 text-neutral-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  />
                </svg>
              </div>
            )}
          </div>
          <div className="flex-1">
            {!editingAvatar ? (
              <div>
                <button
                  type="button"
                  onClick={() => setEditingAvatar(true)}
                  className="text-sm font-medium text-neutral-300 underline-offset-4 hover:text-neutral-50 hover:underline"
                >
                  Upload photo
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="url"
                  placeholder="Enter image URL"
                  className="block w-full rounded-lg border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
                  value={avatarUrl}
                  onChange={(e) => {
                    setAvatarUrl(e.target.value);
                    setAvatarError(false);
                  }}
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => cancelEdit("avatar")}
                    className="rounded-lg border border-neutral-800 bg-transparent px-4 py-2 text-sm font-medium text-neutral-50 transition-colors hover:border-neutral-700 hover:bg-neutral-900/50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveAvatar}
                    disabled={savingAvatar}
                    className="rounded-lg bg-neutral-50 px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingAvatar ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Account Section */}
      <div className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-50">Account</h2>
          {!editingAccount && (
            <button
              type="button"
              onClick={() => setEditingAccount(true)}
              className="text-sm font-medium text-neutral-300 underline-offset-4 hover:text-neutral-50 hover:underline"
            >
              Edit
            </button>
          )}
        </div>

        {!editingAccount ? (
          <div className="space-y-4">
            <div>
              <span className="text-xs font-medium text-neutral-500">Display name</span>
              <p className="mt-1 text-sm text-neutral-50">
                {profile.display_name || "Not set"}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-neutral-500">Email</span>
              <p className="mt-1 text-sm text-neutral-50">{profile.email || "Not set"}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-neutral-500">Style intent</span>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-sm text-neutral-50 capitalize">
                  {profile.style_intent === "work" ? "Work" :
                   profile.style_intent === "date" ? "Dates" :
                   profile.style_intent === "everyday" ? "Everyday" :
                   profile.style_intent === "staples" ? "Staples" :
                   "Everyday"}
                </p>
                <button
                  type="button"
                  onClick={() => setEditingBirth(true)}
                  className="text-xs font-medium text-neutral-400 underline-offset-4 hover:text-neutral-300 hover:underline"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-500">Display name</label>
              <input
                type="text"
                className="mt-2 block w-full rounded-lg border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500">Email</label>
              <input
                type="email"
                className="mt-2 block w-full rounded-lg border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => cancelEdit("account")}
                className="rounded-lg border border-neutral-800 bg-transparent px-4 py-2 text-sm font-medium text-neutral-50 transition-colors hover:border-neutral-700 hover:bg-neutral-900/50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveAccount}
                disabled={savingAccount}
                className="rounded-lg bg-neutral-50 px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingAccount ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Birth Details Section */}
      <div className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-50">Birth details</h2>
          {!editingBirth && (
            <button
              type="button"
              onClick={() => setEditingBirth(true)}
              className="text-sm font-medium text-neutral-300 underline-offset-4 hover:text-neutral-50 hover:underline"
            >
              Edit
            </button>
          )}
        </div>

        {!editingBirth ? (
          <div className="space-y-4">
            <div>
              <span className="text-xs font-medium text-neutral-500">Birth date</span>
              <p className="mt-1 text-sm text-neutral-50">
                {profile.birth_date || "Not set"}
              </p>
            </div>
            {profile.birth_time && (
              <div>
                <span className="text-xs font-medium text-neutral-500">Birth time</span>
                <p className="mt-1 text-sm text-neutral-50">{profile.birth_time}</p>
              </div>
            )}
            {profile.birth_place && (
              <div>
                <span className="text-xs font-medium text-neutral-500">Birth location</span>
                <p className="mt-1 text-sm text-neutral-50">{profile.birth_place}</p>
              </div>
            )}
            <div>
              <span className="text-xs font-medium text-neutral-500">Style intent</span>
              <p className="mt-1 text-sm text-neutral-50 capitalize">
                {profile.style_intent || "Not set"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-500">Birth date</label>
              <input
                type="date"
                className="mt-2 block w-full rounded-lg border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-sm text-neutral-50 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500">
                Birth time (optional)
              </label>
              <input
                type="time"
                className="mt-2 block w-full rounded-lg border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-sm text-neutral-50 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
                value={birthTime}
                onChange={(e) => setBirthTime(e.target.value)}
              />
            </div>
            <div>
              <LocationAutocomplete
                label="Birth location (optional)"
                value={birthPlace}
                onChangeValue={(v, origin) => {
                  setBirthPlace(v);
                  if (origin === "typing") {
                    setBirthLat(null);
                    setBirthLng(null);
                    setBirthTz(null);
                  }
                }}
                onSelect={handleLocationSelect}
                placeholder="City, State / Country"
              />
              {birthTz && (
                <p className="mt-2 text-xs text-neutral-400">
                  Timezone: {birthTz}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500">Style intent</label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {([
                  ["work", "Work / business"],
                  ["date", "Dates / romance"],
                  ["everyday", "Everyday"],
                  ["staples", "Closet staples"],
                ] as Array<[Intent, string]>).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStyleIntent(key)}
                    className={`rounded-lg border px-4 py-2 text-left text-sm font-medium transition-colors ${
                      styleIntent === key
                        ? "border-neutral-50 bg-neutral-50 text-neutral-950"
                        : "border-neutral-800 bg-transparent text-neutral-100 hover:border-neutral-700 hover:bg-neutral-900/50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => cancelEdit("birth")}
                className="rounded-lg border border-neutral-800 bg-transparent px-4 py-2 text-sm font-medium text-neutral-50 transition-colors hover:border-neutral-700 hover:bg-neutral-900/50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveBirth}
                disabled={savingBirth}
                className="rounded-lg bg-neutral-50 px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingBirth ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Chart Section */}
      <div className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-50">Chart</h2>
          {profile.sun_sign || profile.moon_sign || profile.rising_sign || profile.mc_sign ? (
            <button
              type="button"
              onClick={generateBig4}
              disabled={genLoading}
              className="text-sm font-medium text-neutral-300 underline-offset-4 hover:text-neutral-50 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {genLoading ? "Regenerating…" : "Regenerate chart"}
            </button>
          ) : null}
        </div>

        {!profile.sun_sign &&
        !profile.moon_sign &&
        !profile.rising_sign &&
        !profile.mc_sign ? (
          <div className="text-center">
            <p className="text-sm text-neutral-400">
              Once we generate your chart, you'll see your key placements here (Sun, Moon, Rising,
              and Midheaven).
            </p>
            <p className="mt-3 text-xs text-neutral-500">
              Birth time improves accuracy for Rising + houses.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={generateBig4}
                disabled={genLoading}
                className="rounded-xl bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-100 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {genLoading ? "Generating…" : "Generate chart"}
              </button>
              {genStatus && (
                <p className={`mt-2 text-sm ${genStatus.includes("error") || genStatus.includes("Could not") ? "text-red-300" : "text-green-300"}`}>
                  {genStatus}
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Recalculate Callout */}
            {needsRecalc(profile, chartInputs) ? (
              <div className="mb-6 rounded-xl border border-yellow-800/50 bg-yellow-950/20 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-yellow-200 mb-1">
                      Your birth details changed
                    </h3>
                    <p className="text-xs text-yellow-200/80 mb-3">
                      Recalculate to update Rising/MC, houses, and placements.
                    </p>
                    {(!profile.birth_date || !profile.lat || !profile.lng) ? (
                      <p className="text-xs text-yellow-300/70">
                        Add birth date + birth location to recalculate.
                      </p>
                    ) : !profile.birth_time ? (
                      <p className="text-xs text-yellow-300/70">
                        Add birth time to unlock Rising/MC + houses.
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRecalculate}
                        disabled={recalcLoading || !profile.birth_date || !profile.lat || !profile.lng || !profile.birth_time}
                        className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {recalcLoading ? "Recalculating…" : "Recalculate chart"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mb-6 text-xs text-neutral-500">Chart is up to date.</p>
            )}

            {/* Intent Preview */}
            <div className="mb-6 rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-neutral-50 mb-1">Intent preview</h3>
                <p className="text-xs text-neutral-400">See how guidance changes for different situations.</p>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {([
                  ["work", "Work"],
                  ["date", "Dates"],
                  ["everyday", "Everyday"],
                  ["staples", "Staples"],
                ] as Array<[Intent, string]>).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPreviewIntent(key)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      previewIntent === key
                        ? "bg-neutral-50 text-neutral-950"
                        : "border border-neutral-800 bg-transparent text-neutral-200 hover:border-neutral-700 hover:bg-neutral-900/50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-500">
                  Current default:{" "}
                  <span className="text-neutral-400 capitalize">
                    {profile.style_intent === "work" ? "Work" :
                     profile.style_intent === "date" ? "Dates" :
                     profile.style_intent === "everyday" ? "Everyday" :
                     profile.style_intent === "staples" ? "Staples" :
                     "Everyday"}
                  </span>
                </p>
                {previewIntent !== ((profile.style_intent as Intent) || "everyday") && (
                  <button
                    type="button"
                    onClick={handleSaveIntent}
                    disabled={savingIntent}
                    className="rounded-lg bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-950 transition-colors hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingIntent ? "Saving…" : "Save as my default"}
                  </button>
                )}
              </div>
            </div>

            {/* Big 4 Grid */}
            <div className="grid gap-4 sm:grid-cols-2 mb-6">
              {/* Sun */}
              <div className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-4">
                <h3 className="text-sm font-semibold text-neutral-50">Sun</h3>
                <p className="mt-1 text-base font-medium text-neutral-50 capitalize">
                  {profile.sun_sign || "—"}
                </p>
                {profile.sun_sign && (() => {
                  const insight = getPlacementInsight("Sun", profile.sun_sign, previewIntent);
                  return insight ? (
                    <div className="mt-4">
                      <h4 className="text-xs font-medium text-neutral-400 mb-1.5">Style note</h4>
                      <p className="text-xs text-neutral-300 leading-relaxed">{insight.body}</p>
                      {insight.chips && insight.chips.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {insight.chips.slice(0, 3).map((chip, i) => (
                            <span
                              key={i}
                              className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium text-neutral-400 bg-neutral-900/50"
                            >
                              {chip}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Moon */}
              <div className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-4">
                <h3 className="text-sm font-semibold text-neutral-50">Moon</h3>
                <p className="mt-1 text-base font-medium text-neutral-50 capitalize">
                  {profile.moon_sign || "—"}
                </p>
                {profile.moon_sign && (() => {
                  const insight = getPlacementInsight("Moon", profile.moon_sign, previewIntent);
                  return insight ? (
                    <div className="mt-4">
                      <h4 className="text-xs font-medium text-neutral-400 mb-1.5">Style note</h4>
                      <p className="text-xs text-neutral-300 leading-relaxed">{insight.body}</p>
                      {insight.chips && insight.chips.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {insight.chips.slice(0, 3).map((chip, i) => (
                            <span
                              key={i}
                              className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium text-neutral-400 bg-neutral-900/50"
                            >
                              {chip}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Rising */}
              <div className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-4">
                <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-50">Rising</h3>
                  {!profile.birth_time && (
                    <span className="text-[10px] font-medium text-neutral-500 bg-neutral-900/50 rounded px-1.5 py-0.5">
                      Needs birth time
                    </span>
                  )}
                </div>
                <p className="mt-1 text-base font-medium text-neutral-50 capitalize">
                  {profile.rising_sign || "—"}
                </p>
                {profile.rising_sign ? (
                  !profile.birth_time ? (
                    <div className="mt-4">
                      <h4 className="text-xs font-medium text-neutral-400 mb-1.5">Style note</h4>
                      <p className="text-xs text-neutral-300 leading-relaxed">
                        Add birth time to unlock Rising + MC insights.
                      </p>
                    </div>
                  ) : (() => {
                    const insight = getPlacementInsight("Rising", profile.rising_sign, previewIntent);
                    return insight ? (
                      <div className="mt-4">
                        <h4 className="text-xs font-medium text-neutral-400 mb-1.5">Style note</h4>
                        <p className="text-xs text-neutral-300 leading-relaxed">{insight.body}</p>
                        {insight.chips && insight.chips.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {insight.chips.slice(0, 3).map((chip, i) => (
                              <span
                                key={i}
                                className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium text-neutral-400 bg-neutral-900/50"
                              >
                                {chip}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null;
                  })()
                ) : null}
              </div>

              {/* Midheaven */}
              <div className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-4">
                <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-50">Midheaven</h3>
                  {!profile.birth_time && (
                    <span className="text-[10px] font-medium text-neutral-500 bg-neutral-900/50 rounded px-1.5 py-0.5">
                      Needs birth time
                    </span>
                  )}
                </div>
                <p className="mt-1 text-base font-medium text-neutral-50 capitalize">
                  {profile.mc_sign || "—"}
                </p>
                {profile.mc_sign ? (
                  !profile.birth_time ? (
                    <div className="mt-4">
                      <h4 className="text-xs font-medium text-neutral-400 mb-1.5">Style note</h4>
                      <p className="text-xs text-neutral-300 leading-relaxed">
                        Add birth time to unlock Rising + MC insights.
                      </p>
                    </div>
                  ) : (() => {
                    const insight = getPlacementInsight("MC", profile.mc_sign, previewIntent);
                    return insight ? (
                      <div className="mt-4">
                        <h4 className="text-xs font-medium text-neutral-400 mb-1.5">Style note</h4>
                        <p className="text-xs text-neutral-300 leading-relaxed">{insight.body}</p>
                        {insight.chips && insight.chips.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {insight.chips.slice(0, 3).map((chip, i) => (
                              <span
                                key={i}
                                className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium text-neutral-400 bg-neutral-900/50"
                              >
                                {chip}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null;
                  })()
                ) : null}
              </div>
            </div>

            {/* What this means */}
            <div className="mb-6 space-y-2 text-sm text-neutral-400">
              <p>
                <span className="font-medium text-neutral-300">Sun:</span> Core identity + how you recharge.
              </p>
              <p>
                <span className="font-medium text-neutral-300">Moon:</span> Comfort needs + emotional baseline.
              </p>
              <p>
                <span className="font-medium text-neutral-300">Rising:</span> First impression + style vibe.
              </p>
              <p>
                <span className="font-medium text-neutral-300">Midheaven:</span> Public image + career-facing style.
              </p>
            </div>

            {/* Regenerate status */}
            {genStatus && (
              <div className={`mb-6 rounded-lg border p-3 text-sm ${
                genStatus.includes("error") || genStatus.includes("Could not")
                  ? "border-red-800/50 bg-red-950/20 text-red-200"
                  : "border-green-800/50 bg-green-950/20 text-green-200"
              }`}>
                {genStatus}
              </div>
            )}
          </>
        )}
      </div>

      {/* Why We Ask Section */}
      <div className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8">
        <button
          type="button"
          onClick={() => setShowWhyWeAsk(!showWhyWeAsk)}
          className="flex w-full items-center justify-between text-left"
        >
          <h2 className="text-lg font-semibold text-neutral-50">Why NEFELI asks for birth details</h2>
          <svg
            className={`h-5 w-5 text-neutral-400 transition-transform ${showWhyWeAsk ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showWhyWeAsk && (
          <div className="mt-4 space-y-2 text-sm text-neutral-400">
            <p>• Used to generate your placements</p>
            <p>• Used to personalize style guidance</p>
            <p>• You can edit or remove this anytime</p>
          </div>
        )}
      </div>

      {/* Accuracy & Privacy Card */}
      <div className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8">
        <h2 className="mb-4 text-lg font-semibold text-neutral-50">Accuracy & privacy</h2>

        {(!profile.birth_time || !profile.birth_place) && (
          <div className="mb-4 rounded-lg border border-yellow-800/50 bg-yellow-950/20 p-4">
            <p className="text-sm text-yellow-200 mb-3">
              Birth time + location improve accuracy for Rising + Midheaven.
            </p>
            <Link
              href="/onboarding"
              className="inline-block rounded-lg bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-100"
            >
              Edit birth details
            </Link>
          </div>
        )}

        <p className="text-sm text-neutral-400">
          Your birth details stay in your account. You can edit or delete them anytime.
        </p>
      </div>

      {/* Danger Zone - Delete My Data */}
      <div className="mb-6 rounded-2xl border border-red-900/50 bg-red-950/10 p-8">
        <h2 className="mb-4 text-lg font-semibold text-red-200">Danger zone</h2>
        <p className="mb-4 text-sm text-neutral-400">
          Permanently delete your birth details and chart data. This cannot be undone.
        </p>

        <div className="mb-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={wipeBoards}
              onChange={(e) => setWipeBoards(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-red-500 focus:ring-2 focus:ring-red-500 focus:ring-offset-0"
            />
            <span className="text-sm text-neutral-300">
              Also delete my boards and saved items
            </span>
          </label>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-red-200 mb-2">
            Type DELETE to confirm.
          </label>
          <input
            type="text"
            value={deleteText}
            onChange={(e) => {
              setDeleteText(e.target.value);
              setDeleteStatus(null);
            }}
            placeholder="DELETE"
            className="block w-full rounded-lg border border-red-900/50 bg-neutral-950/50 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-red-800 focus:outline-none focus:ring-1 focus:ring-red-800"
          />
        </div>

        {deleteStatus && (
          <div className={`mb-4 text-sm ${
            deleteStatus === "Data deleted."
              ? "text-green-300"
              : "text-red-300"
          }`}>
            {deleteStatus}
          </div>
        )}

        <button
          type="button"
          onClick={deleteMyData}
          disabled={deleting || deleteText.trim().toUpperCase() !== "DELETE"}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deleting ? "Deleting…" : "Delete my NEFELI data"}
        </button>
      </div>
    </div>
  );
}

