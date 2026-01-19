"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
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
};

type CuratorImage = {
  id: string;
  storage_path: string;
  title: string | null;
  caption: string | null;
  intent: string;
  occasion: string | null;
  keywords: string[];
  collection_id: string | null;
  curator_user_id: string;
  curator_name: string | null;
  curator_handle: string | null;
  curator_tier: string;
};

export default function ExplorePage() {
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [todayImages, setTodayImages] = useState<CuratorImage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIntent, setSelectedIntent] = useState<string>("all");
  const [userId, setUserId] = useState<string | null>(null);
  const [submittingFeedback, setSubmittingFeedback] = useState<string | null>(null);

  const intents = ["all", "work", "date", "everyday", "staples"];

  useEffect(() => {
    loadUser();
    loadData();
  }, []);

  useEffect(() => {
    if (selectedIntent !== "all") {
      loadTodayImages(selectedIntent);
    } else {
      loadTodayImages();
    }
  }, [selectedIntent]);

  async function loadUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
    }
  }

  async function loadData() {
    await Promise.all([loadCollections(), loadTodayImages()]);
    setLoading(false);
  }

  async function loadCollections() {
    const { data } = await supabase
      .from("curator_collections")
      .select(`
        id,
        title,
        description,
        cover_image_path,
        tags,
        published_at,
        curator_user_id,
        profiles!curator_collections_curator_user_id_fkey(display_name, public_handle)
      `)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(20);

    if (data) {
      const formatted = data.map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        cover_image_path: item.cover_image_path,
        tags: item.tags || [],
        published_at: item.published_at,
        curator_user_id: item.curator_user_id,
        curator_name: item.profiles?.display_name || null,
        curator_handle: item.profiles?.public_handle || null,
      }));
      setCollections(formatted as Collection[]);
    }
  }

  async function loadTodayImages(intentFilter?: string) {
    let query = supabase
      .from("curator_images")
      .select(`
        id,
        storage_path,
        title,
        caption,
        intent,
        occasion,
        keywords,
        collection_id,
        curator_user_id,
        profiles!curator_images_curator_user_id_fkey(display_name, public_handle, curator_tier)
      `)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(30);

    if (intentFilter && intentFilter !== "all") {
      query = query.eq("intent", intentFilter);
    }

    const { data } = await query;

    if (data) {
      const formatted = data.map((item: any) => ({
        id: item.id,
        storage_path: item.storage_path,
        title: item.title,
        caption: item.caption,
        intent: item.intent,
        occasion: item.occasion,
        keywords: item.keywords || [],
        collection_id: item.collection_id,
        curator_user_id: item.curator_user_id,
        curator_name: item.profiles?.display_name || null,
        curator_handle: item.profiles?.public_handle || null,
        curator_tier: item.profiles?.curator_tier || "contributor",
      }));
      setTodayImages(formatted as CuratorImage[]);
    }
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

  const filteredCollections = collections.filter((collection) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      collection.title.toLowerCase().includes(query) ||
      collection.description?.toLowerCase().includes(query) ||
      collection.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  const filteredTodayImages = todayImages.filter((image) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      image.title?.toLowerCase().includes(query) ||
      image.caption?.toLowerCase().includes(query) ||
      image.keywords.some((keyword) => keyword.toLowerCase().includes(query))
    );
  });

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">
        <p className="text-neutral-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-50">Explore</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Discover curated style inspiration from our community.
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by tag, keyword, or collection..."
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
        />
      </div>

      {/* Featured Collections */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold text-neutral-50 mb-4">Featured Collections</h2>
        {filteredCollections.length === 0 ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-12 text-center">
            <p className="text-sm text-neutral-400">No collections found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCollections.map((collection) => (
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
                    <p className="text-xs text-neutral-400 mb-2 line-clamp-2">{collection.description}</p>
                  )}
                  {collection.curator_handle && (
                    <p className="text-xs text-neutral-500">by @{collection.curator_handle}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* For Today */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-neutral-50">For Today</h2>
          <div className="flex gap-2">
            {intents.map((intent) => (
              <button
                key={intent}
                type="button"
                onClick={() => setSelectedIntent(intent)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selectedIntent === intent
                    ? "bg-neutral-50 text-neutral-950"
                    : "border border-neutral-700 bg-transparent text-neutral-300 hover:bg-neutral-900"
                }`}
              >
                {intent === "all" ? "All" : intent.charAt(0).toUpperCase() + intent.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {filteredTodayImages.length === 0 ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-12 text-center">
            <p className="text-sm text-neutral-400">No images found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredTodayImages.map((image) => {
              const badge = getTierBadge(image.curator_tier);
              return (
                <div
                  key={image.id}
                  className="relative aspect-square rounded-lg border border-neutral-800 bg-neutral-900/50 overflow-hidden group"
                >
                  <img
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/curator-images/${image.storage_path}`}
                    alt={image.title || "Image"}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

