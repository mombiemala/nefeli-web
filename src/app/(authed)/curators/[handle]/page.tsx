"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

type CuratorProfile = {
  user_id: string;
  display_name: string | null;
  curator_bio: string | null;
  curator_specialties: string[];
  public_handle: string | null;
  curator_tier: string;
  curator_links: {
    website?: string;
    instagram?: string;
    tiktok?: string;
  };
};

type Collection = {
  id: string;
  title: string;
  description: string | null;
  cover_image_path: string | null;
  tags: string[];
  published_at: string;
};

type CuratorImage = {
  id: string;
  storage_path: string;
  title: string | null;
  tags: string[];
  published_at: string;
  created_at: string;
};

export default function CuratorProfilePage() {
  const params = useParams();
  const handle = params.handle as string;
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<CuratorProfile | null>(null);
  const [images, setImages] = useState<CuratorImage[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [submittingFeedback, setSubmittingFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
    loadProfile();
  }, [handle]);

  async function loadUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
    }
  }

  async function loadProfile() {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("user_id, display_name, curator_bio, curator_specialties, public_handle, curator_tier, curator_links")
      .eq("public_handle", handle)
      .eq("role", "curator")
      .single();

    if (!profileData) {
      setLoading(false);
      return;
    }

    setProfile({
      ...profileData,
      curator_links: (profileData.curator_links as any) || {},
    } as CuratorProfile);

    const [imagesResult, collectionsResult] = await Promise.all([
      supabase
        .from("curator_images")
        .select("id, storage_path, title, tags, published_at, created_at")
        .eq("curator_user_id", profileData.user_id)
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(12),
      supabase
        .from("curator_collections")
        .select("id, title, description, cover_image_path, tags, published_at")
        .eq("curator_user_id", profileData.user_id)
        .not("published_at", "is", null)
        .order("published_at", { ascending: false }),
    ]);

    if (imagesResult.data) {
      setImages(imagesResult.data as CuratorImage[]);
    }

    if (collectionsResult.data) {
      setCollections(collectionsResult.data as Collection[]);
    }

    setLoading(false);
  }

  function getTierBadge(tier: string) {
    const badges: Record<string, { label: string; className: string }> = {
      contributor: { label: "Contributor", className: "bg-neutral-800 text-neutral-300" },
      editor: { label: "Editor", className: "bg-neutral-700 text-neutral-200" },
      verified_stylist: { label: "Verified Stylist", className: "bg-blue-950 text-blue-300" },
      verified_astrologer: { label: "Verified Astrologer", className: "bg-purple-950 text-purple-300" },
    };
    return badges[tier] || badges.contributor;
  }

  async function handleImageFeedback(imageId: string, feedbackType: string) {
    if (!userId) return;

    setSubmittingFeedback(imageId);

    try {
      const res = await fetch("/api/feedback/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          imageId,
          feedbackType,
          metadata: {},
        }),
      });

      if (res.ok) {
        // Show success feedback
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setSubmittingFeedback(null);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <p className="text-neutral-400">Loading...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Link
            href="/app"
            className="text-sm text-neutral-400 underline-offset-4 hover:text-neutral-300 hover:underline"
          >
            ← Back
          </Link>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-12 text-center">
          <h2 className="text-xl font-semibold text-neutral-50">Curator not found</h2>
          <p className="mt-2 text-sm text-neutral-400">
            This curator profile doesn't exist or isn't public.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <Link
          href="/app"
          className="text-sm text-neutral-400 underline-offset-4 hover:text-neutral-300 hover:underline"
        >
          ← Back
        </Link>
      </div>

      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight text-neutral-50">
                {profile.display_name || `@${handle}`}
              </h1>
              {profile.curator_tier && (
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${getTierBadge(profile.curator_tier).className}`}>
                  {getTierBadge(profile.curator_tier).label}
                </span>
              )}
            </div>
            {profile.curator_bio && (
              <p className="text-sm text-neutral-300 mb-4">{profile.curator_bio}</p>
            )}
            {profile.curator_specialties && profile.curator_specialties.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {profile.curator_specialties.map((specialty) => (
                  <span
                    key={specialty}
                    className="inline-block rounded px-2 py-0.5 text-xs font-medium text-neutral-300 bg-neutral-800/50"
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            )}
            {(profile.curator_links.website || profile.curator_links.instagram || profile.curator_links.tiktok) && (
              <div className="flex gap-3">
                {profile.curator_links.website && (
                  <a
                    href={profile.curator_links.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-neutral-400 hover:text-neutral-300 underline-offset-4 hover:underline"
                  >
                    Website
                  </a>
                )}
                {profile.curator_links.instagram && (
                  <a
                    href={`https://instagram.com/${profile.curator_links.instagram.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-neutral-400 hover:text-neutral-300 underline-offset-4 hover:underline"
                  >
                    Instagram
                  </a>
                )}
                {profile.curator_links.tiktok && (
                  <a
                    href={`https://tiktok.com/@${profile.curator_links.tiktok.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-neutral-400 hover:text-neutral-300 underline-offset-4 hover:underline"
                  >
                    TikTok
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Collections */}
      {collections.length > 0 && (
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-neutral-50 mb-4">Collections</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map((collection) => (
              <Link
                key={collection.id}
                href={`/collections/${collection.id}`}
                className="group rounded-xl border border-neutral-800 bg-neutral-900/50 overflow-hidden hover:border-neutral-700 transition-colors"
              >
                {collection.cover_image_path && (
                  <div className="aspect-video bg-neutral-800 relative overflow-hidden">
                    <img
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/curator-images/${collection.cover_image_path}`}
                      alt={collection.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="text-base font-semibold text-neutral-50 mb-1">{collection.title}</h3>
                  {collection.description && (
                    <p className="text-xs text-neutral-400 line-clamp-2">{collection.description}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Latest Images */}
      <div>
        <h2 className="text-xl font-semibold text-neutral-50 mb-4">Latest Images</h2>

        {images.length === 0 ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-12 text-center">
            <p className="text-sm text-neutral-400">No published images yet.</p>
          </div>
        ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative aspect-square rounded-lg border border-neutral-800 bg-neutral-900/50 overflow-hidden group"
            >
              <img
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/curator-images/${image.storage_path}`}
                alt={image.title || "Curator image"}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                {image.title && (
                  <p className="text-xs text-white font-medium">{image.title}</p>
                )}
                {userId && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleImageFeedback(image.id, "save")}
                      disabled={submittingFeedback === image.id}
                      className="flex-1 rounded-lg bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-950 transition-colors hover:bg-neutral-100 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => handleImageFeedback(image.id, "matches_advice")}
                      disabled={submittingFeedback === image.id}
                      className="flex-1 rounded-lg border border-neutral-700 bg-transparent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-900 disabled:opacity-50"
                    >
                      Matches today
                    </button>
                    <button
                      type="button"
                      onClick={() => handleImageFeedback(image.id, "report")}
                      disabled={submittingFeedback === image.id}
                      className="rounded-lg border border-red-700 bg-transparent px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-950/20 disabled:opacity-50"
                    >
                      Report
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}

