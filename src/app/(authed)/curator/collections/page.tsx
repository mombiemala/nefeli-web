"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Collection = {
  id: string;
  title: string;
  description: string | null;
  cover_image_path: string | null;
  tags: string[];
  published_at: string | null;
  created_at: string;
};

export default function CuratorCollectionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isCurator, setIsCurator] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    tags: [] as string[],
    cover_image_path: "",
    publish: false,
  });

  const tagOptions = [
    "minimalist",
    "street style",
    "vintage",
    "high fashion",
    "casual",
    "formal",
    "sustainable",
    "workwear",
    "date night",
  ];

  useEffect(() => {
    checkCuratorAndLoad();
  }, []);

  async function checkCuratorAndLoad() {
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
      .select("role, curator_status")
      .eq("user_id", user.id)
      .single();

    if (profile?.role !== "curator" && profile?.role !== "admin") {
      router.push("/curator/apply");
      return;
    }

    if (profile?.curator_status !== "approved") {
      router.push("/curator/apply");
      return;
    }

    setIsCurator(true);
    await loadCollections();
    setLoading(false);
  }

  async function loadCollections() {
    if (!userId) return;

    const { data } = await supabase
      .from("curator_collections")
      .select("id, title, description, cover_image_path, tags, published_at, created_at")
      .eq("curator_user_id", userId)
      .order("created_at", { ascending: false });

    if (data) {
      setCollections(data as Collection[]);
    }
  }

  function toggleTag(tag: string) {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;

    const submitData: any = {
      curator_user_id: userId,
      title: formData.title,
      description: formData.description || null,
      tags: formData.tags,
      cover_image_path: formData.cover_image_path || null,
      published_at: formData.publish ? new Date().toISOString() : null,
    };

    if (editingId) {
      const { error } = await supabase
        .from("curator_collections")
        .update(submitData)
        .eq("id", editingId);

      if (error) {
        console.error("Error updating collection:", error);
        alert("Failed to update collection");
        return;
      }
    } else {
      const { error } = await supabase
        .from("curator_collections")
        .insert(submitData);

      if (error) {
        console.error("Error creating collection:", error);
        alert("Failed to create collection");
        return;
      }
    }

    setShowCreateModal(false);
    setEditingId(null);
    setFormData({ title: "", description: "", tags: [], cover_image_path: "", publish: false });
    await loadCollections();
  }

  function startEdit(collection: Collection) {
    setEditingId(collection.id);
    setFormData({
      title: collection.title,
      description: collection.description || "",
      tags: collection.tags || [],
      cover_image_path: collection.cover_image_path || "",
      publish: !!collection.published_at,
    });
    setShowCreateModal(true);
  }

  async function togglePublish(collectionId: string, currentlyPublished: boolean) {
    const { error } = await supabase
      .from("curator_collections")
      .update({
        published_at: currentlyPublished ? null : new Date().toISOString(),
      })
      .eq("id", collectionId);

    if (error) {
      console.error("Error toggling publish:", error);
    } else {
      await loadCollections();
    }
  }

  async function deleteCollection(collectionId: string) {
    if (!confirm("Are you sure you want to delete this collection?")) return;

    const { error } = await supabase
      .from("curator_collections")
      .delete()
      .eq("id", collectionId);

    if (error) {
      console.error("Error deleting collection:", error);
    } else {
      await loadCollections();
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <p className="text-neutral-400">Loading...</p>
      </div>
    );
  }

  if (!isCurator) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-50">Collections</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Create and manage your editorial collections.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setFormData({ title: "", description: "", tags: [], cover_image_path: "", publish: false });
            setShowCreateModal(true);
          }}
          className="rounded-xl bg-neutral-50 px-6 py-2.5 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-100"
        >
          Create collection
        </button>
      </div>

      {collections.length === 0 ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-12 text-center">
          <p className="text-sm text-neutral-400 mb-4">No collections yet.</p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="rounded-xl bg-neutral-50 px-6 py-2.5 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-100"
          >
            Create your first collection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((collection) => (
            <div
              key={collection.id}
              className="group rounded-xl border border-neutral-800 bg-neutral-900/50 overflow-hidden hover:border-neutral-700 transition-colors"
            >
              {collection.cover_image_path && (
                <div className="aspect-video bg-neutral-800 relative overflow-hidden">
                  <img
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/curator-images/${collection.cover_image_path}`}
                    alt={collection.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-4">
                <h3 className="text-base font-semibold text-neutral-50 mb-1">{collection.title}</h3>
                {collection.description && (
                  <p className="text-xs text-neutral-400 mb-2 line-clamp-2">{collection.description}</p>
                )}
                <div className="flex items-center justify-between mt-3">
                  <span className={`text-xs ${collection.published_at ? "text-green-400" : "text-neutral-500"}`}>
                    {collection.published_at ? "Published" : "Draft"}
                  </span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => startEdit(collection)}
                      className="rounded-lg border border-neutral-700 bg-transparent px-2 py-1 text-xs font-medium text-neutral-300 hover:bg-neutral-900"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePublish(collection.id, !!collection.published_at)}
                      className="rounded-lg border border-neutral-700 bg-transparent px-2 py-1 text-xs font-medium text-neutral-300 hover:bg-neutral-900"
                    >
                      {collection.published_at ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCollection(collection.id)}
                      className="rounded-lg border border-red-700 bg-transparent px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-950/20"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              setShowCreateModal(false);
              setEditingId(null);
            }}
          />
          <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-neutral-50 mb-4">
              {editingId ? "Edit collection" : "Create collection"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-200 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-200 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-200 mb-2">
                  Cover image path
                </label>
                <input
                  type="text"
                  value={formData.cover_image_path}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cover_image_path: e.target.value }))}
                  placeholder="path/to/image.jpg"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-200 mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {tagOptions.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        formData.tags.includes(tag)
                          ? "bg-neutral-50 text-neutral-950"
                          : "border border-neutral-700 bg-transparent text-neutral-300 hover:bg-neutral-900"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="publish"
                  checked={formData.publish}
                  onChange={(e) => setFormData((prev) => ({ ...prev, publish: e.target.checked }))}
                  className="rounded border-neutral-700 bg-neutral-900"
                />
                <label htmlFor="publish" className="text-sm text-neutral-200">
                  Publish immediately
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="rounded-xl bg-neutral-50 px-6 py-2.5 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-100"
                >
                  {editingId ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingId(null);
                  }}
                  className="rounded-xl border border-neutral-700 bg-transparent px-6 py-2.5 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-900"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

