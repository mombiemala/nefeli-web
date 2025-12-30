"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams } from "next/navigation";

type Board = {
  id: string;
  name: string;
  description: string | null;
};

type BoardItem = {
  id: string;
  intent: string;
  title: string;
  bullets: string[];
  why: string | null;
  anchors: {
    sun: string | null;
    moon: string | null;
    rising: string | null;
    mc: string | null;
  } | null;
  created_at: string;
};

export default function BoardDetailPage() {
  const params = useParams();
  const boardId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<Board | null>(null);
  const [items, setItems] = useState<BoardItem[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (boardId) {
      loadBoard();
    }
  }, [boardId]);

  async function loadBoard() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    // Fetch board and verify it belongs to the user
    const { data: boardData, error: boardError } = await supabase
      .from("boards")
      .select("id,name,description")
      .eq("id", boardId)
      .eq("user_id", user.id)
      .single();

    if (boardError || !boardData) {
      setError("Board not found");
      setLoading(false);
      return;
    }

    setBoard(boardData as Board);

    // Fetch board items
    const { data: itemsData, error: itemsError } = await supabase
      .from("board_items")
      .select("id,intent,title,bullets,why,anchors,created_at")
      .eq("board_id", boardId)
      .order("created_at", { ascending: false });

    if (itemsError) {
      console.error(itemsError);
      setLoading(false);
      return;
    }

    setItems((itemsData as BoardItem[]) || []);
    setLoading(false);
  }

  async function deleteItem(id: string) {
    if (!window.confirm("Remove this item from the board?")) {
      return;
    }

    setDeletingId(id);

    const { error: deleteError } = await supabase
      .from("board_items")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error(deleteError);
      setDeletingId(null);
      return;
    }

    // Optimistically remove from UI
    setItems((prev) => prev.filter((item) => item.id !== id));
    setDeletingId(null);
  }

  function formatTimestamp(createdAt: string) {
    const date = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }

  function formatIntent(intent: string) {
    return intent.charAt(0).toUpperCase() + intent.slice(1);
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

  if (error || !board) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <Link
            href="/boards"
            className="text-sm text-neutral-400 underline-offset-4 hover:text-neutral-300 hover:underline"
          >
            ← Back to boards
          </Link>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-12 text-center">
          <h2 className="text-xl font-semibold text-neutral-50">Board not found</h2>
          <p className="mt-2 text-sm text-neutral-400">
            This board doesn't exist or you don't have access to it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/boards"
          className="text-sm text-neutral-400 underline-offset-4 hover:text-neutral-300 hover:underline"
        >
          ← Back to boards
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-50">{board.name}</h1>
        {board.description && (
          <p className="mt-2 text-sm text-neutral-400">{board.description}</p>
        )}
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-12 text-center">
          <h2 className="text-xl font-semibold text-neutral-50">No items yet</h2>
          <p className="mt-2 text-sm text-neutral-400">
            Save guidance from Today into this board.
          </p>
          <Link
            href="/today"
            className="mt-6 inline-block rounded-xl bg-neutral-50 px-6 py-2.5 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-100"
          >
            Go to Today
          </Link>
        </div>
      )}

      {/* Items list */}
      {items.length > 0 && (
        <div className="space-y-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="relative rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6"
            >
              {/* Delete button */}
              <button
                type="button"
                onClick={() => deleteItem(item.id)}
                disabled={deletingId === item.id}
                className="absolute top-6 right-6 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs font-medium text-neutral-200 transition-colors hover:bg-neutral-900 hover:border-neutral-600 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingId === item.id ? "Removing..." : "Remove"}
              </button>

              {/* Intent pill */}
              <div className="mb-3 pr-20">
                <span className="inline-block rounded-lg bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300">
                  {formatIntent(item.intent)}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-base font-semibold text-neutral-50 mb-3 pr-20">
                {item.title}
              </h3>

              {/* Bullets */}
              <ul className="space-y-2 mb-4">
                {item.bullets.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-50" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>

              {/* Why */}
              {item.why && (
                <p className="text-xs text-neutral-500 italic mb-4">{item.why}</p>
              )}

              {/* Anchors */}
              {item.anchors && (
                <div className="mb-4">
                  <p className="text-xs text-neutral-500">
                    <span className="font-medium text-neutral-400">Anchors:</span>{" "}
                    {[
                      item.anchors.sun &&
                        `Sun: ${item.anchors.sun.charAt(0).toUpperCase() + item.anchors.sun.slice(1)}`,
                      item.anchors.moon &&
                        `Moon: ${item.anchors.moon.charAt(0).toUpperCase() + item.anchors.moon.slice(1)}`,
                      item.anchors.rising &&
                        `Rising: ${item.anchors.rising.charAt(0).toUpperCase() + item.anchors.rising.slice(1)}`,
                      item.anchors.mc &&
                        `MC: ${item.anchors.mc.charAt(0).toUpperCase() + item.anchors.mc.slice(1)}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              )}

              {/* Timestamp */}
              <p className="text-xs text-neutral-600">{formatTimestamp(item.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

