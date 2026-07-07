"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type Profile = {
  id: string;
  name: string;
  birth_date: string;
  birth_time: string | null;
  time_unknown: boolean;
  birth_city: string;
  timezone: string;
};

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      const { data } = await supabase
        .from("birth_profiles").select("*")
        .eq("user_id", user.id).order("is_default", { ascending: false }).limit(1).maybeSingle();
      if (!data) { window.location.href = "/onboarding"; return; }
      setProfile(data as Profile);
      setName(data.name);
      setLoading(false);
    })();
  }, []);

  async function saveName() {
    if (!profile || !name.trim() || saving) return;
    setSaving(true);
    setSaved(false);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("birth_profiles").update({ name: name.trim() }).eq("id", profile.id);
    if (user) await supabase.from("profiles").upsert({ user_id: user.id, display_name: name.trim() }, { onConflict: "user_id" });
    setSaving(false);
    setSaved(true);
  }

  if (loading) return <div className="mx-auto max-w-2xl text-sm text-neutral-400">Loading…</div>;
  if (!profile) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-neutral-50">Profile</h1>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
        <label className="block text-sm font-medium text-neutral-200">Name</label>
        <div className="mt-2 flex gap-2">
          <input value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }}
            className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-sm text-neutral-50 focus:border-neutral-700 focus:outline-none" />
          <button type="button" onClick={saveName} disabled={saving || !name.trim()}
            className="rounded-lg bg-neutral-50 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-neutral-100 disabled:opacity-50">
            {saving ? "…" : saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 text-sm text-neutral-300">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Birth details</p>
        <dl className="mt-3 space-y-2">
          <div className="flex justify-between"><dt className="text-neutral-500">Date</dt><dd>{profile.birth_date}</dd></div>
          <div className="flex justify-between"><dt className="text-neutral-500">Time</dt><dd>{profile.time_unknown || !profile.birth_time ? "Unknown" : profile.birth_time}</dd></div>
          <div className="flex justify-between"><dt className="text-neutral-500">Place</dt><dd>{profile.birth_city}</dd></div>
        </dl>
        <p className="mt-4 text-xs text-neutral-500">
          To change your birth details,{" "}
          <Link href="/onboarding" className="text-neutral-300 underline-offset-4 hover:underline">redo onboarding</Link>
          {" "}— it recalculates your chart.
        </p>
      </div>
    </div>
  );
}
