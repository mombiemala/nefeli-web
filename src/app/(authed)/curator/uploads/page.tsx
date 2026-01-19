"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

type CuratorImage = {
  id: string;
  storage_path: string;
  title: string | null;
  tags: string[];
  published_at: string | null;
  created_at: string;
  collection_id: string | null;
  intent: string;
  occasion: string | null;
  caption: string | null;
  keywords: string[];
};

type Collection = {
  id: string;
  title: string;
};

export default function CuratorUploadsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isCurator, setIsCurator] = useState(false);
  const [images, setImages] = useState<CuratorImage[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    tags: [] as string[],
    collection_id: "",
    intent: "everyday",
    occasion: "",
    caption: "",
    keywords: [] as string[],
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
    "accessories",
  ];

  const intentOptions = ["everyday", "work", "date", "staples"];
  const occasionOptions = [
    "Job interview",
    "Work meeting",
    "Networking",
    "Date night",
    "Errands",
    "Weekend brunch",
    "Travel",
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
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role !== "curator" && profile?.role !== "admin") {
      router.push("/curator/apply");
      return;
    }

    setIsCurator(true);
    await Promise.all([loadImages(), loadCollections()]);
    setLoading(false);
  }

  async function loadCollections() {
    if (!userId) return;

    const { data } = await supabase
      .from("curator_collections")
      .select("id, title")
      .eq("curator_user_id", userId)
      .order("created_at", { ascending: false });

    if (data) {
      setCollections(data as Collection[]);
    }
  }

  async function loadImages() {
    if (!userId) return;

    const { data } = await supabase
      .from("curator_images")
      .select("id, storage_path, title, tags, published_at, created_at, collection_id, intent, occasion, caption, keywords")
      .eq("curator_user_id", userId)
      .order("created_at", { ascending: false });

    if (data) {
      setImages(data as CuratorImage[]);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function toggleTag(tag: string) {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile || !userId) return;

    setUploading(true);

    try {
      // Upload to storage
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      const filePath = `curator-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("curator-images")
        .upload(filePath, selectedFile);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        alert("Failed to upload image");
        setUploading(false);
        return;
      }

      // Create database record
      const { error: dbError } = await supabase
        .from("curator_images")
        .insert({
          curator_user_id: userId,
          storage_path: fileName,
          title: formData.title || null,
          tags: formData.tags,
          collection_id: formData.collection_id || null,
          intent: formData.intent,
          occasion: formData.occasion || null,
          caption: formData.caption || null,
          keywords: formData.keywords,
          published_at: formData.publish ? new Date().toISOString() : null,
        });

      if (dbError) {
        console.error("Database error:", dbError);
        alert("Failed to save image record");
        setUploading(false);
        return;
      }

      // Reset form
      setSelectedFile(null);
      setPreview(null);
      setFormData({ title: "", tags: [], collection_id: "", intent: "everyday", occasion: "", caption: "", keywords: [], publish: false });
      await loadImages();
      setUploading(false);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed");
      setUploading(false);
    }
  }

  async function togglePublish(imageId: string, currentlyPublished: boolean) {
    const { error } = await supabase
      .from("curator_images")
      .update({
        published_at: currentlyPublished ? null : new Date().toISOString(),
      })
      .eq("id", imageId);

    if (error) {
      console.error("Error toggling publish:", error);
    } else {
      await loadImages();
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-50">Upload images</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Share your style inspiration with the community.
        </p>
      </div>

      <div className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
        <h2 className="text-lg font-semibold text-neutral-50 mb-4">Upload new image</h2>
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-200 mb-2">
              Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-50"
            />
            {preview && (
              <img
                src={preview}
                alt="Preview"
                className="mt-4 max-w-xs rounded-lg border border-neutral-800"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-200 mb-2">
              Title <span className="text-neutral-500">(optional)</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Image title"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-200 mb-2">
              Collection <span className="text-neutral-500">(optional)</span>
            </label>
            <select
              value={formData.collection_id}
              onChange={(e) => setFormData((prev) => ({ ...prev, collection_id: e.target.value }))}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-50 focus:border-neutral-600 focus:outline-none"
            >
              <option value="">No collection</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-200 mb-2">
              Intent
            </label>
            <select
              value={formData.intent}
              onChange={(e) => setFormData((prev) => ({ ...prev, intent: e.target.value }))}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-50 focus:border-neutral-600 focus:outline-none"
            >
              {intentOptions.map((intent) => (
                <option key={intent} value={intent}>
                  {intent.charAt(0).toUpperCase() + intent.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-200 mb-2">
              Occasion <span className="text-neutral-500">(optional)</span>
            </label>
            <select
              value={formData.occasion}
              onChange={(e) => setFormData((prev) => ({ ...prev, occasion: e.target.value }))}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-50 focus:border-neutral-600 focus:outline-none"
            >
              <option value="">No occasion</option>
              {occasionOptions.map((occasion) => (
                <option key={occasion} value={occasion}>
                  {occasion}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-200 mb-2">
              Caption <span className="text-neutral-500">(optional)</span>
            </label>
            <textarea
              value={formData.caption}
              onChange={(e) => setFormData((prev) => ({ ...prev, caption: e.target.value }))}
              rows={2}
              placeholder="Why this works..."
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

          <div>
            <label className="block text-sm font-medium text-neutral-200 mb-2">
              Keywords <span className="text-neutral-500">(optional, comma-separated)</span>
            </label>
            <input
              type="text"
              value={formData.keywords.join(", ")}
              onChange={(e) => {
                const keywords = e.target.value.split(",").map((k) => k.trim()).filter(Boolean);
                setFormData((prev) => ({ ...prev, keywords }));
              }}
              placeholder="keyword1, keyword2, keyword3"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
            />
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

          <button
            type="submit"
            disabled={!selectedFile || uploading}
            className="rounded-xl bg-neutral-50 px-6 py-2.5 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-100 disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-neutral-50 mb-4">Your images</h2>
        {images.length === 0 ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-12 text-center">
            <p className="text-sm text-neutral-400">No images uploaded yet.</p>
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
                  alt={image.title || "Image"}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => togglePublish(image.id, !!image.published_at)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium ${
                      image.published_at
                        ? "bg-red-600 text-white"
                        : "bg-green-600 text-white"
                    }`}
                  >
                    {image.published_at ? "Unpublish" : "Publish"}
                  </button>
                </div>
                {image.published_at && (
                  <div className="absolute top-2 right-2 rounded-full bg-green-600 w-3 h-3" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

