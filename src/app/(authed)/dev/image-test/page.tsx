"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function ImageTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    setError(null);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user || !file) return;

    const ext = file.name.split(".").pop() || "jpg";
    const path = `users/${user.id}/${crypto.randomUUID()}.${ext}`;

    // 1️⃣ Upload to storage
    const { error: uploadErr } = await supabase.storage
      .from("nefeli-images")
      .upload(path, file);

    if (uploadErr) {
      setError(uploadErr.message);
      return;
    }

    // 2️⃣ Insert DB row
    const { data: imageRow, error: insertErr } = await supabase
      .from("images")
      .insert({
        created_by: user.id,
        bucket: "nefeli-images",
        storage_path: path,
        source_type: "user_upload",
        visibility: "private",
        status: "approved",
      })
      .select()
      .single();

    if (insertErr) {
      setError(insertErr.message);
      return;
    }

    // 3️⃣ Create signed URL
    const { data: signed, error: signErr } = await supabase.storage
      .from("nefeli-images")
      .createSignedUrl(imageRow.storage_path, 60);

    if (signErr) {
      setError(signErr.message);
      return;
    }

    setUrl(signed.signedUrl);
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Image Upload Test</h1>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

      <button
        onClick={handleUpload}
        className="rounded bg-white px-4 py-2 text-black"
      >
        Upload
      </button>

      {error && <p className="text-red-400">{error}</p>}

      {url && (
        <img
          src={url}
          alt="Uploaded test"
          className="max-w-xs rounded border"
        />
      )}
    </div>
  );
}