"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

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
};

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
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

  // Delete data states
  const [wipeBoards, setWipeBoards] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    setUserId(user.id);

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
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

    setProfile(profileData as Profile);
    setDisplayName(profileData.display_name || "");
    setEmail(profileData.email || user.email || "");
    setBirthDate(profileData.birth_date || "");
    setBirthTime(profileData.birth_time || "");
    setBirthPlace(profileData.birth_place || "");
    setStyleIntent((profileData.style_intent as Intent) || "everyday");
    setAvatarUrl(profileData.avatar_url || "");
    setAvatarError(false);
    setLoading(false);
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
        <h1 className="text-3xl font-bold tracking-tight text-neutral-50">Profile</h1>
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
              <label className="block text-xs font-medium text-neutral-500">
                Birth location (optional)
              </label>
              <input
                type="text"
                className="mt-2 block w-full rounded-lg border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
                placeholder="City, State / Country"
                value={birthPlace}
                onChange={(e) => setBirthPlace(e.target.value)}
              />
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
            {/* Big 4 Grid */}
            <div className="grid gap-4 sm:grid-cols-2 mb-6">
              <div className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-4">
                <h3 className="text-sm font-semibold text-neutral-50">Sun</h3>
                <p className="mt-1 text-base font-medium text-neutral-50 capitalize">
                  {profile.sun_sign || "—"}
                </p>
              </div>

              <div className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-4">
                <h3 className="text-sm font-semibold text-neutral-50">Moon</h3>
                <p className="mt-1 text-base font-medium text-neutral-50 capitalize">
                  {profile.moon_sign || "—"}
                </p>
              </div>

              <div className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-4">
                <h3 className="text-sm font-semibold text-neutral-50">Rising</h3>
                <p className="mt-1 text-base font-medium text-neutral-50 capitalize">
                  {profile.rising_sign || "—"}
                </p>
              </div>

              <div className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-4">
                <h3 className="text-sm font-semibold text-neutral-50">Midheaven</h3>
                <p className="mt-1 text-base font-medium text-neutral-50 capitalize">
                  {profile.mc_sign || "—"}
                </p>
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

