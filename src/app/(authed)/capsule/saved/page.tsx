"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Intent = "work" | "date" | "everyday" | "staples" | "all";

type Capsule = {
  id: string;
  title: string;
  intent: string;
  board_id: string | null;
  created_at: string;
};

type Board = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export default function SavedCapsulesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedIntent, setSelectedIntent] = useState<Intent>("all");
  const [userId, setUserId] = useState<string | null>(null);
  const [boardsLoadError, setBoardsLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setUserId(user.id);

    // Load capsules and boards in parallel
    const [capsulesResult, boardsResult] = await Promise.all([
      supabase
        .from("capsules")
        .select("id, title, intent, board_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("boards")
        .select("id,name,description,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    if (capsulesResult.error) {
      console.error("Error loading capsules:", capsulesResult.error);
      setLoading(false);
      return;
    }

    if (boardsResult.error) {
      setBoardsLoadError(boardsResult.error.message);
      // Continue even if boards fail - capsules will still render
    }

    setCapsules((capsulesResult.data as Capsule[]) || []);
    setBoards((boardsResult.data as Board[]) || []);
    setLoading(false);
  }

  const filteredCapsules =
    selectedIntent === "all"
      ? capsules
      : capsules.filter((c) => c.intent === selectedIntent);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-50">Saved capsules</h1>
        </div>
        <p className="text-sm text-neutral-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-50">Saved capsules</h1>
      </div>

      {/* Boards load error warning */}
      {boardsLoadError && (
        <div className="mb-6 rounded-lg border border-neutral-800 bg-neutral-900/50 p-3 text-sm text-neutral-400">
          Boards couldn't be loaded. Capsules will still display, but board labels may be missing.
        </div>
      )}

      {/* Filter chips */}
      <div className="mb-6 flex flex-wrap gap-2">
        {([
          ["all", "All"],
          ["work", "Work"],
          ["date", "Dates"],
          ["everyday", "Everyday"],
          ["staples", "Staples"],
        ] as Array<[Intent, string]>).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSelectedIntent(key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              selectedIntent === key
                ? "bg-neutral-50 text-neutral-950"
                : "border border-neutral-800 bg-transparent text-neutral-200 hover:border-neutral-700 hover:bg-neutral-900/50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filteredCapsules.length === 0 ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-12 text-center">
          <p className="text-sm text-neutral-400">No capsules yet.</p>
          <p className="mt-1 text-xs text-neutral-500">Build one and save it for later.</p>
          <Link
            href="/capsule"
            className="mt-6 inline-block rounded-xl bg-neutral-50 px-6 py-2.5 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100"
          >
            Build a capsule
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCapsules.map((capsule) => {
            const board = boards.find((b) => b.id === capsule.board_id);
            return (
              <div
                key={capsule.id}
                className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6"
              >
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-neutral-50 mb-3">{capsule.title}</h2>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="inline-block rounded px-2 py-0.5 text-xs font-medium text-neutral-300 bg-neutral-800/50">
                      {capsule.intent === "work" ? "Work" :
                       capsule.intent === "date" ? "Dates" :
                       capsule.intent === "everyday" ? "Everyday" :
                       capsule.intent === "staples" ? "Staples" :
                       capsule.intent}
                    </span>
                    {board && (
                      <span className="inline-block rounded px-2 py-0.5 text-xs font-medium text-neutral-300 bg-neutral-800/50">
                        {board.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500">
                    {new Date(capsule.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link
                    href={`/capsule/${capsule.id}`}
                    className="rounded-xl bg-neutral-50 px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100"
                  >
                    Open
                  </Link>
                  <Link
                    href="/capsule"
                    className="rounded-xl border border-neutral-800 bg-transparent px-4 py-2 text-sm font-medium text-neutral-200 transition-colors hover:border-neutral-700 hover:bg-neutral-900/50"
                  >
                    Build another
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

