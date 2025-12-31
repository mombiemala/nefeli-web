"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

type CapsulePiece = {
  category: string;
  item: string;
  notes?: string;
};

type OutfitFormula = {
  name: string;
  items: string[];
  notes?: string;
};

type CapsuleData = {
  title: string;
  pieces: CapsulePiece[];
  outfits: OutfitFormula[];
  why: string[];
};

type CapsuleRow = {
  id: string;
  title: string;
  intent: string;
  capsule_json: CapsuleData;
  params: {
    season?: string | null;
    colorVibe?: string | null;
    dressCode?: string | null;
    notes?: string | null;
  } | null;
  created_at: string;
  board_id: string | null;
};

type Board = {
  id: string;
  name: string;
};

export default function CapsuleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [capsule, setCapsule] = useState<CapsuleRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  
  // Remove modal state
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [savingRemove, setSavingRemove] = useState(false);
  
  // Create board modal state
  const [showCreateBoardModal, setShowCreateBoardModal] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [newBoardDescription, setNewBoardDescription] = useState("");
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [createBoardError, setCreateBoardError] = useState<string | null>(null);

  useEffect(() => {
    loadCapsule();
  }, [params.id]);

  async function loadCapsule() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setUserId(user.id);

    const capsuleId = params.id as string;
    if (!capsuleId) {
      setError("Capsule ID is required.");
      setLoading(false);
      return;
    }

    // Load capsule and boards in parallel
    const [capsuleResult, boardsResult] = await Promise.all([
      supabase
        .from("capsules")
        .select("id, title, intent, capsule_json, params, created_at, board_id")
        .eq("id", capsuleId)
        .maybeSingle(),
      supabase
        .from("boards")
        .select("id, name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    if (capsuleResult.error) {
      console.error("Error loading capsule:", capsuleResult.error);
      setError("Failed to load capsule.");
      setLoading(false);
      return;
    }

    if (!capsuleResult.data) {
      setError("Capsule not found.");
      setLoading(false);
      return;
    }

    if (boardsResult.error) {
      console.error("Error loading boards:", boardsResult.error);
      // Continue even if boards fail to load
    }

    setCapsule(capsuleResult.data);
    setBoards((boardsResult.data as Board[]) || []);
    // Initialize selectedBoardId: use empty string for null to match dropdown value
    setSelectedBoardId(capsuleResult.data.board_id || "");
    setLoading(false);
  }

  async function handleUpdateBoard() {
    if (!capsule || saving) return;

    setSaving(true);
    setError(null);

    try {
      // Convert empty string to null for database
      const boardIdToSet = selectedBoardId === "" || selectedBoardId === null ? null : selectedBoardId;

      const { error: updateError } = await supabase
        .from("capsules")
        .update({ board_id: boardIdToSet })
        .eq("id", capsule.id);

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }

      // Update local state
      setCapsule({ ...capsule, board_id: boardIdToSet });
      setToast("Updated");
      setTimeout(() => {
        setToast(null);
      }, 3000);
    } catch (error: any) {
      console.error("Update board error:", error);
      setError("Failed to update board.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveFromBoard() {
    if (!capsule || savingRemove || confirmText !== "DELETE") return;

    setSavingRemove(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from("capsules")
        .update({ board_id: null })
        .eq("id", capsule.id);

      if (updateError) {
        setError(updateError.message);
        setSavingRemove(false);
        return;
      }

      // Update local state
      setCapsule({ ...capsule, board_id: null });
      setSelectedBoardId(""); // Use empty string to match dropdown value
      setShowRemoveModal(false);
      setConfirmText("");
      setToast("Removed from board");
      setTimeout(() => {
        setToast(null);
      }, 3000);
    } catch (error: any) {
      console.error("Remove from board error:", error);
      setError("Failed to remove from board.");
    } finally {
      setSavingRemove(false);
    }
  }

  async function handleCreateBoard() {
    if (!userId || creatingBoard || newBoardTitle.trim().length < 2) return;

    setCreatingBoard(true);
    setCreateBoardError(null);
    setError(null);

    try {
      const { data, error: createError } = await supabase
        .from("boards")
        .insert({
          user_id: userId,
          name: newBoardTitle.trim(),
          description: newBoardDescription.trim() || null,
        })
        .select()
        .single();

      if (createError) {
        setCreateBoardError(createError.message);
        setCreatingBoard(false);
        return;
      }

      // Add new board to state
      const newBoard = { id: data.id, name: data.name };
      setBoards([newBoard, ...boards]);
      setSelectedBoardId(newBoard.id);
      setShowCreateBoardModal(false);
      setNewBoardTitle("");
      setNewBoardDescription("");
      setToast("Board created");
      setTimeout(() => {
        setToast(null);
      }, 3000);
    } catch (error: any) {
      console.error("Create board error:", error);
      setCreateBoardError("Failed to create board.");
    } finally {
      setCreatingBoard(false);
    }
  }

  function handleBoardSelectChange(value: string) {
    if (value === "__create__") {
      setShowCreateBoardModal(true);
      // Reset dropdown to current value
      setSelectedBoardId(capsule?.board_id || "");
    } else {
      // Convert empty string to null for consistency, but keep "" for dropdown value
      setSelectedBoardId(value === "" ? "" : value);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-50">Capsule</h1>
        </div>
        <p className="text-sm text-neutral-400">Loading...</p>
      </div>
    );
  }

  if (error || !capsule) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-50">Capsule</h1>
        </div>
        <div className="rounded-2xl border border-red-800/50 bg-red-950/20 p-8 text-center">
          <p className="text-sm text-red-200">{error || "Capsule not found."}</p>
          <Link
            href="/capsule"
            className="mt-4 inline-block text-sm font-medium text-neutral-300 underline-offset-4 hover:text-neutral-50 hover:underline"
          >
            Back to capsules
          </Link>
        </div>
      </div>
    );
  }

  const capsuleData = capsule.capsule_json;
  const backLink = capsule.board_id
    ? `/boards/${capsule.board_id}`
    : "/capsule";
  
  const currentBoard = boards.find((b) => b.id === capsule.board_id);
  // Compare: empty string or null should match null board_id
  const currentBoardIdForComparison = capsule.board_id || "";
  const selectedBoardIdForComparison = selectedBoardId || "";
  const hasChanged = selectedBoardIdForComparison !== currentBoardIdForComparison;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 rounded-lg bg-neutral-900 border border-neutral-800 px-4 py-3 text-sm text-neutral-50 shadow-lg z-50">
          {toast}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-800/50 bg-red-950/20 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-50">{capsule.title}</h1>
            <div className="mt-2 flex items-center gap-4">
              <span className="text-sm text-neutral-400 capitalize">
                Intent: {capsule.intent === "work" ? "Work" :
                         capsule.intent === "date" ? "Dates" :
                         capsule.intent === "everyday" ? "Everyday" :
                         capsule.intent === "staples" ? "Staples" :
                         capsule.intent}
              </span>
              <span className="text-xs text-neutral-500">
                {new Date(capsule.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <Link
            href={backLink}
            className="text-sm font-medium text-neutral-300 underline-offset-4 hover:text-neutral-50 hover:underline"
          >
            Back
          </Link>
        </div>
      </div>

      {/* Board section */}
      <div className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900/40 p-6">
        <h2 className="text-sm font-semibold text-neutral-50 mb-4">Board</h2>
        {capsule.board_id && currentBoard ? (
          <p className="text-sm text-neutral-400 mb-4">
            Currently in: <span className="text-neutral-300">{currentBoard.name}</span>
          </p>
        ) : (
          <p className="text-sm text-neutral-400 mb-4">Not saved to a board</p>
        )}

        {boards.length === 0 ? (
          <div className="text-sm text-neutral-500">
            No boards yet —{" "}
            <Link
              href="/boards"
              className="text-neutral-300 underline-offset-4 hover:text-neutral-50 hover:underline"
            >
              create one
            </Link>
            .
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="boardSelect" className="block text-sm font-medium text-neutral-200 mb-2">
                Move to board
              </label>
              <select
                id="boardSelect"
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950/50 px-3 py-2.5 text-sm text-neutral-50 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
                value={selectedBoardId || ""}
                onChange={(e) => handleBoardSelectChange(e.target.value)}
              >
                <option value="">No board</option>
                {boards.map((board) => (
                  <option key={board.id} value={board.id}>
                    {board.name}
                  </option>
                ))}
                <option value="__create__">+ Create new board</option>
              </select>
            </div>

            <div className="flex gap-3">
              {hasChanged && (
                <button
                  type="button"
                  onClick={handleUpdateBoard}
                  disabled={saving}
                  className="rounded-xl bg-neutral-50 px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? "Updating…" : "Update board"}
                </button>
              )}
              {capsule.board_id && (
                <button
                  type="button"
                  onClick={() => setShowRemoveModal(true)}
                  disabled={saving}
                  className="rounded-xl border border-neutral-800 bg-transparent px-4 py-2 text-sm font-medium text-neutral-200 transition-colors hover:border-neutral-700 hover:bg-neutral-900/50 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Remove from board
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Capsule pieces */}
      {capsuleData.pieces && capsuleData.pieces.length > 0 && (
        <div className="mb-8 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8">
          <h2 className="text-lg font-semibold text-neutral-50 mb-6">Capsule pieces</h2>
          <div className="space-y-6">
            {Object.entries(
              capsuleData.pieces.reduce((acc, piece) => {
                if (!acc[piece.category]) {
                  acc[piece.category] = [];
                }
                acc[piece.category].push(piece);
                return acc;
              }, {} as Record<string, CapsulePiece[]>)
            ).map(([category, pieces]) => (
              <div key={category}>
                <h3 className="text-sm font-medium text-neutral-300 mb-2">{category}</h3>
                <ul className="space-y-1">
                  {pieces.map((piece, itemIndex) => (
                    <li key={itemIndex} className="text-sm text-neutral-400">
                      • {piece.item}
                      {piece.notes && (
                        <span className="text-neutral-500 ml-2">({piece.notes})</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outfit formulas */}
      {capsuleData.outfits && capsuleData.outfits.length > 0 && (
        <div className="mb-8 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8">
          <h2 className="text-lg font-semibold text-neutral-50 mb-6">Outfit formulas</h2>
          <div className="space-y-6">
            {capsuleData.outfits.map((outfit, index) => (
              <div key={index}>
                <h3 className="text-sm font-medium text-neutral-300 mb-2">{outfit.name}</h3>
                <ul className="space-y-1">
                  {outfit.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="text-sm text-neutral-400">
                      • {item}
                    </li>
                  ))}
                </ul>
                {outfit.notes && (
                  <p className="mt-2 text-xs text-neutral-500">{outfit.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Why this fits you */}
      {capsuleData.why && capsuleData.why.length > 0 && (
        <div className="mb-8 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8">
          <h2 className="text-lg font-semibold text-neutral-50 mb-6">Why this fits you</h2>
          <ul className="space-y-3">
            {capsuleData.why.map((reason, index) => (
              <li key={index} className="text-sm text-neutral-300">
                • {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Remove confirmation modal */}
      {showRemoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h3 className="text-lg font-semibold text-neutral-50 mb-2">
              Remove capsule from this board?
            </h3>
            <p className="text-sm text-neutral-400 mb-6">
              This won't delete the capsule. It will just remove it from the board.
            </p>
            <div className="mb-6">
              <input
                type="text"
                placeholder="Type DELETE to confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950/50 px-3 py-2.5 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
                autoFocus
              />
            </div>
            {error && (
              <div className="mb-4 rounded-lg border border-red-800/50 bg-red-950/20 p-2 text-xs text-red-200">
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowRemoveModal(false);
                  setConfirmText("");
                  setError(null);
                }}
                disabled={savingRemove}
                className="flex-1 rounded-xl border border-neutral-800 bg-transparent px-4 py-2 text-sm font-medium text-neutral-200 transition-colors hover:border-neutral-700 hover:bg-neutral-900/50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveFromBoard}
                disabled={savingRemove || confirmText !== "DELETE"}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {savingRemove ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create board modal */}
      {showCreateBoardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h3 className="text-lg font-semibold text-neutral-50 mb-6">
              Create a board
            </h3>
            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor="boardName" className="block text-sm font-medium text-neutral-200 mb-2">
                  Board name
                </label>
                <input
                  id="boardName"
                  type="text"
                  placeholder="Enter board name"
                  value={newBoardTitle}
                  onChange={(e) => setNewBoardTitle(e.target.value)}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950/50 px-3 py-2.5 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="boardDescription" className="block text-sm font-medium text-neutral-200 mb-2">
                  Description <span className="text-neutral-500">(optional)</span>
                </label>
                <textarea
                  id="boardDescription"
                  rows={3}
                  placeholder="Enter description"
                  value={newBoardDescription}
                  onChange={(e) => setNewBoardDescription(e.target.value)}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950/50 px-3 py-2.5 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
                />
              </div>
            </div>
            {createBoardError && (
              <div className="mb-4 rounded-lg border border-red-800/50 bg-red-950/20 p-2 text-xs text-red-200">
                {createBoardError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCreateBoardModal(false);
                  setNewBoardTitle("");
                  setNewBoardDescription("");
                  setCreateBoardError(null);
                }}
                disabled={creatingBoard}
                className="flex-1 rounded-xl border border-neutral-800 bg-transparent px-4 py-2 text-sm font-medium text-neutral-200 transition-colors hover:border-neutral-700 hover:bg-neutral-900/50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateBoard}
                disabled={creatingBoard || newBoardTitle.trim().length < 2}
                className="flex-1 rounded-xl bg-neutral-50 px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {creatingBoard ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

