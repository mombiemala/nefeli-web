"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

type Board = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export default function BoardsPage() {
  const [loading, setLoading] = useState(true);
  const [boards, setBoards] = useState<Board[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBoards();
  }, []);

  async function loadBoards() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("boards")
      .select("id,name,description,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error(fetchError);
      setLoading(false);
      return;
    }

    setBoards((data as Board[]) || []);
    setLoading(false);
  }

  async function createBoard(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    setCreating(true);
    setError(null);

    const { data, error: createError } = await supabase
      .from("boards")
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
      })
      .select()
      .single();

    if (createError) {
      setError(createError.message);
      setCreating(false);
      return;
    }

    // Add new board to the list
    setBoards((prev) => [data as Board, ...prev]);
    setName("");
    setDescription("");
    setShowForm(false);
    setCreating(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <div className="text-center">
          <p className="text-neutral-400">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-50">Boards</h1>
            <p className="mt-2 text-sm text-neutral-400">
              Boards keep your saved guidance organized by vibe or goal.
            </p>
          </div>
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded-xl bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-100"
            >
              New board
            </button>
          )}
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-8 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-50">Create board</h2>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setName("");
                setDescription("");
                setError(null);
              }}
              className="text-sm text-neutral-400 hover:text-neutral-300"
            >
              Cancel
            </button>
          </div>
          <form onSubmit={createBoard}>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-neutral-200 mb-2">
                  Name <span className="text-neutral-500">(required)</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Work essentials, Date night vibes"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-neutral-700 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-neutral-200 mb-2"
                >
                  Description <span className="text-neutral-500">(optional)</span>
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this board for?"
                  rows={3}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-neutral-700 focus:outline-none resize-none"
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-neutral-50 px-4 py-2.5 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? "Creating..." : "Create board"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setName("");
                    setDescription("");
                    setError(null);
                  }}
                  className="rounded-xl border border-neutral-800 bg-transparent px-4 py-2.5 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-900 hover:border-neutral-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Empty state */}
      {boards.length === 0 && !showForm && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-12 text-center">
          <h2 className="text-xl font-semibold text-neutral-50">Create your first board</h2>
          <p className="mt-2 text-sm text-neutral-400">
            Create your first board to collect looks and guidance.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="mt-6 inline-block rounded-xl bg-neutral-50 px-6 py-2.5 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-100"
          >
            Create board
          </button>
        </div>
      )}

      {/* Boards list */}
      {boards.length > 0 && (
        <div className="space-y-4">
          {boards.map((board) => (
            <Link
              key={board.id}
              href={`/boards/${board.id}`}
              className="block rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 transition-colors hover:border-neutral-700 hover:bg-neutral-900"
            >
              <h3 className="text-base font-semibold text-neutral-50 mb-2">{board.name}</h3>
              {board.description && (
                <p className="text-sm text-neutral-400 mb-3">{board.description}</p>
              )}
              <p className="text-xs text-neutral-600">
                Created {new Date(board.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
