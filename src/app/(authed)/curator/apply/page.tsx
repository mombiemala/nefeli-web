"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CuratorApplyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    curator_bio: "",
    curator_specialties: [] as string[],
    public_handle: "",
    curator_links: {
      website: "",
      instagram: "",
      tiktok: "",
    },
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const specialtyOptions = [
    "Street style",
    "Minimalist",
    "Vintage",
    "High fashion",
    "Sustainable fashion",
    "Plus size",
    "Menswear",
    "Womenswear",
    "Accessories",
    "Beauty",
  ];

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setUserId(user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("curator_status, curator_bio, curator_specialties, public_handle, curator_links")
      .eq("user_id", user.id)
      .single();

    if (profile) {
      setCurrentStatus(profile.curator_status);
      const links = (profile.curator_links as any) || {};
      setFormData({
        curator_bio: profile.curator_bio || "",
        curator_specialties: (profile.curator_specialties as string[]) || [],
        public_handle: profile.public_handle || "",
        curator_links: {
          website: links.website || "",
          instagram: links.instagram || "",
          tiktok: links.tiktok || "",
        },
      });
    }

    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;

    setSubmitting(true);
    setError(null);

    // Validate handle uniqueness
    if (formData.public_handle) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("public_handle", formData.public_handle)
        .neq("user_id", userId)
        .maybeSingle();

      if (existing) {
        setError("This handle is already taken. Please choose another.");
        setSubmitting(false);
        return;
      }
    }

    const links: any = {};
    if (formData.curator_links.website) links.website = formData.curator_links.website;
    if (formData.curator_links.instagram) links.instagram = formData.curator_links.instagram;
    if (formData.curator_links.tiktok) links.tiktok = formData.curator_links.tiktok;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        curator_status: "applied",
        curator_bio: formData.curator_bio || null,
        curator_specialties: formData.curator_specialties,
        public_handle: formData.public_handle || null,
        curator_links: links,
      })
      .eq("user_id", userId);

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    setCurrentStatus("applied");
    setSubmitting(false);
  }

  function toggleSpecialty(specialty: string) {
    setFormData((prev) => ({
      ...prev,
      curator_specialties: prev.curator_specialties.includes(specialty)
        ? prev.curator_specialties.filter((s) => s !== specialty)
        : [...prev.curator_specialties, specialty],
    }));
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-neutral-400">Loading...</p>
      </div>
    );
  }

  if (currentStatus === "approved") {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-50">Curator Application</h1>
        </div>
        <div className="rounded-2xl border border-green-800/50 bg-green-950/20 p-8 text-center">
          <h2 className="text-xl font-semibold text-green-400 mb-2">You're already approved!</h2>
          <p className="text-sm text-neutral-400 mb-6">You can start uploading images.</p>
          <Link
            href="/curator/uploads"
            className="inline-block rounded-xl bg-neutral-50 px-6 py-2.5 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-100"
          >
            Go to uploads
          </Link>
        </div>
      </div>
    );
  }

  if (currentStatus === "applied") {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-50">Curator Application</h1>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8 text-center">
          <h2 className="text-xl font-semibold text-neutral-50 mb-2">Application submitted</h2>
          <p className="text-sm text-neutral-400">
            Your application is under review. We'll notify you once a decision has been made.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-50">Apply to be a curator</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Share your style inspiration with the community.
        </p>
      </div>

      {success && (
        <div className="mb-6 rounded-lg border border-green-800/50 bg-green-950/20 p-4 text-sm text-green-400">
          Application submitted successfully!
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-800/50 bg-red-950/20 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-neutral-200 mb-2">
            Public handle <span className="text-neutral-500">(optional)</span>
          </label>
          <input
            type="text"
            value={formData.public_handle}
            onChange={(e) => setFormData((prev) => ({ ...prev, public_handle: e.target.value }))}
            placeholder="your-handle"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
            pattern="[a-z0-9-]+"
            title="Lowercase letters, numbers, and hyphens only"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Your public profile URL will be /curators/{formData.public_handle || "your-handle"}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-200 mb-2">
            Bio
          </label>
          <textarea
            value={formData.curator_bio}
            onChange={(e) => setFormData((prev) => ({ ...prev, curator_bio: e.target.value }))}
            rows={4}
            placeholder="Tell us about your style perspective..."
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-200 mb-2">
            Specialties
          </label>
          <div className="flex flex-wrap gap-2">
            {specialtyOptions.map((specialty) => (
              <button
                key={specialty}
                type="button"
                onClick={() => toggleSpecialty(specialty)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  formData.curator_specialties.includes(specialty)
                    ? "bg-neutral-50 text-neutral-950"
                    : "border border-neutral-700 bg-transparent text-neutral-300 hover:bg-neutral-900"
                }`}
              >
                {specialty}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-200 mb-2">
            Links <span className="text-neutral-500">(optional)</span>
          </label>
          <div className="space-y-3">
            <input
              type="url"
              value={formData.curator_links.website}
              onChange={(e) => setFormData((prev) => ({ ...prev, curator_links: { ...prev.curator_links, website: e.target.value } }))}
              placeholder="Website URL"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
            />
            <input
              type="text"
              value={formData.curator_links.instagram}
              onChange={(e) => setFormData((prev) => ({ ...prev, curator_links: { ...prev.curator_links, instagram: e.target.value } }))}
              placeholder="Instagram handle (e.g., @username)"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
            />
            <input
              type="text"
              value={formData.curator_links.tiktok}
              onChange={(e) => setFormData((prev) => ({ ...prev, curator_links: { ...prev.curator_links, tiktok: e.target.value } }))}
              placeholder="TikTok handle (e.g., @username)"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-neutral-50 px-6 py-2.5 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-100 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit application"}
          </button>
          <Link
            href="/app"
            className="rounded-xl border border-neutral-700 bg-transparent px-6 py-2.5 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-900"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

