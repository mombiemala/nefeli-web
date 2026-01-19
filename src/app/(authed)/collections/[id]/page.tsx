"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import Link from "next/link";

type Collection = {
  id: string;
  title: string;
  description: string | null;
  cover_image_path: string | null;
  tags: string[];
  published_at: string;
  curator_user_id: string;
  curator_name: string | null;
  curator_handle: string | null;
  curator_tier: string;
};

type CollectionImage = {
  id: string;
  storage_path: string;
  title: string | null;
  caption: string | null;
  intent: string;
  occasion: string | null;
  keywords: string[];
};

export default function CollectionDetailPage() {
  const params = useParams();
  const collectionId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [images, setImages] = useState<CollectionImage[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [submittingFeedback, setSubmittingFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
    loadCollection();
  }, [collectionId]);

  async function loadUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
    }
  }

  async function loadCollection() {
    const { data: collectionData } = await supabase
      .from("curator_collections")
      .select(`
        id,
        title,
        description,
        cover_image_path,
        tags,
        published_at,
        curator_user_id,
        profiles!curator_collections_curator_user_id_fkey(display_name, public_handle, curator_tier)
      `)
      .eq("id", collectionId)
      .not("published_at", "is", null)
      .single();

    if (!collectionData) {
      setLoading(false);
      return;
    }

    setCollection({
      id: collectionData.id,
      title: collectionData.title,
      description: collectionData.description,
      cover_image_path: collectionData.cover_image_path,
      tags: collectionData.tags || [],
      published_at: collectionData.published_at,
      curator_user_id: collectionData.curator_user_id,
      curator_name: (collectionData.profiles as any)?.display_name || null,
      curator_handle: (collectionData.profiles as any)?.public_handle || null,
      curator_tier: (collectionData.profiles as any)?.curator_tier || "contributor",
    });

    const { data: imagesData } = await supabase
      .from("curator_images")
      .select("id, storage_path, title, caption, intent, occasion, keywords")
      .eq("collection_id", collectionId)
      .not("published_at", "is", null)
      .order("created_at", { ascending: false });

    if (imagesData) {
      setImages(imagesData as CollectionImage[]);
    }

    setLoading(false);
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

  function getTierBadge(tier: string) {
    const badges: Record<string, { label: string; className: string }> = {
      contributor: { label: "Contributor", className: "bg-neutral-800 text-neutral-300" },
      editor: { label: "Editor", className: "bg-neutral-700 text-neutral-200" },
      verified_stylist: { label: "Verified Stylist", className: "bg-blue-950 text-blue-300" },
      verified_astrologer: { label: "Verified Astrologer", className: "bg-purple-950 text-purple-300" },
    };
    return badges[tier] || badges.contributor;
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">
        <p className="text-neutral-400">Loading...</p>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <Link
            href="/explore"
            className="text-sm text-neutral-400 underline-offset-4 hover:text-neutral-300 hover:underline"
          >
            ← Back to explore
          </Link>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-12 text-center">
          <h2 className="text-xl font-semibold text-neutral-50">Collection not found</h2>
          <p className="mt-2 text-sm text-neutral-400">
            This collection doesn't exist or isn't public.
          </p>
        </div>
      </div>
    );
  }

  const badge = getTierBadge(collection.curator_tier);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <Link
          href="/explore"
          className="text-sm text-neutral-400 underline-offset-4 hover:text-neutral-300 hover:underline"
        >
          ← Back to explore
        </Link>
      </div>

      {/* Collection Header */}
      <div className="mb-8">
        {collection.cover_image_path && (
          <div className="aspect-video bg-neutral-800 rounded-xl overflow-hidden mb-6">
            <img
              src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/curator-images/${collection.cover_image_path}`}
              alt={collection.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-50 mb-2">
              {collection.title}
            </h1>
            {collection.description && (
              <p className="text-sm text-neutral-300 mb-4">{collection.description}</p>
            )}
            {collection.curator_handle && (
              <div className="flex items-center gap-3">
                <Link
                  href={`/curators/${collection.curator_handle}`}
                  className="text-sm text-neutral-400 hover:text-neutral-300"
                >
                  by @{collection.curator_handle}
                </Link>
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                  {badge.label}
                </span>
              </div>
            )}
          </div>
        </div>
        {collection.tags && collection.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {collection.tags.map((tag) => (
              <span
                key={tag}
                className="inline-block rounded px-2 py-0.5 text-xs font-medium text-neutral-300 bg-neutral-800/50"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Images Grid */}
      {images.length === 0 ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-12 text-center">
          <p className="text-sm text-neutral-400">No images in this collection yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative aspect-square rounded-lg border border-neutral-800 bg-neutral-900/50 overflow-hidden group"
            >
              <img
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/curator-images/${image.storage_path}`}
                alt={image.title || "Image"}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                {image.caption && (
                  <p className="text-xs text-white mb-2">{image.caption}</p>
                )}
                {userId && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleImageFeedback(image.id, "save")}
                      disabled={submittingFeedback === image.id}
                      className="flex-1 rounded-lg bg-neutral-50 px-2 py-1.5 text-xs font-medium text-neutral-950 transition-colors hover:bg-neutral-100 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => handleImageFeedback(image.id, "matches_advice")}
                      disabled={submittingFeedback === image.id}
                      className="flex-1 rounded-lg border border-neutral-700 bg-transparent px-2 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-900 disabled:opacity-50"
                    >
                      Matches today
                    </button>
                    <button
                      type="button"
                      onClick={() => handleImageFeedback(image.id, "more_like_this")}
                      disabled={submittingFeedback === image.id}
                      className="flex-1 rounded-lg border border-neutral-700 bg-transparent px-2 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-900 disabled:opacity-50"
                    >
                      More like this
                    </button>
                    <button
                      type="button"
                      onClick={() => handleImageFeedback(image.id, "report")}
                      disabled={submittingFeedback === image.id}
                      className="rounded-lg border border-red-700 bg-transparent px-2 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-950/20 disabled:opacity-50"
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
  );
}

