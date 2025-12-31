"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  isStyleRulesItem,
  isOutfitItem,
  isNoteItem,
  type StyleRulesItemJson,
  type OutfitItemJson,
  type NoteItemJson,
} from "@/types/boardItems";

type Board = {
  id: string;
  name: string;
  description: string | null;
};

type BoardItem = {
  id: string;
  intent: string;
  title: string;
  bullets?: string[] | null; // Legacy field
  why?: string | null; // Legacy field
  item_type?: string | null;
  item_json?: StyleRulesItemJson | OutfitItemJson | NoteItemJson | null;
  anchors: {
    sun: string | null;
    moon: string | null;
    rising: string | null;
    mc: string | null;
  } | null;
  board_id?: string;
  user_id?: string;
  created_at: string;
  // Metadata fields (stored in columns if they exist, otherwise in item_json)
  occasion?: string | null;
  source?: "today" | "ask" | "manual" | null;
  day_key?: string | null;
};

export default function BoardDetailPage() {
  const params = useParams();
  const boardId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<Board | null>(null);
  const [items, setItems] = useState<BoardItem[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [undoItem, setUndoItem] = useState<{ item: BoardItem; originalIndex: number; timeoutId: NodeJS.Timeout } | null>(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedMoveBoardId, setSelectedMoveBoardId] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  
  // Filter state
  const [selectedOccasion, setSelectedOccasion] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");

  useEffect(() => {
    if (boardId) {
      loadBoard();
    }
  }, [boardId]);

  async function loadBoard() {
    // Clear any previous error
    setError(null);

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

    // Fetch board items (try to get metadata columns, they may not exist yet)
    const { data: itemsData, error: itemsError } = await supabase
      .from("board_items")
      .select("id,intent,title,bullets,why,item_type,item_json,anchors,created_at,board_id,user_id,occasion,source,day_key")
      .eq("board_id", boardId)
      .order("created_at", { ascending: false });

    if (itemsError) {
      // Structured error logging
      console.error("Failed to load board items:", {
        message: itemsError.message,
        code: itemsError.code,
        details: itemsError.details,
        hint: itemsError.hint,
      });
      
      // Set user-facing error but don't early return - show board with empty state
      setError("Couldn't load items for this board. Please refresh.");
      setItems([]);
      setLoading(false);
      return;
    }

    // Process items to extract metadata from item_json if columns don't exist
    const processedItems = ((itemsData as BoardItem[]) || []).map((item) => {
      // If metadata columns don't exist, try to extract from item_json
      if (!item.occasion && item.item_json) {
        if (isStyleRulesItem(item.item_type, item.item_json)) {
          item.occasion = item.item_json.occasion || item.intent || null;
          item.day_key = item.item_json.day_key || null;
        } else if (isOutfitItem(item.item_type, item.item_json)) {
          item.occasion = item.item_json.occasion || item.intent || null;
          if (item.item_json.created_from === "ask") {
            item.source = "ask";
          }
        }
      }
      // If source is not set, try to infer from item_json or day_key
      if (!item.source) {
        if (item.item_json && isOutfitItem(item.item_type, item.item_json) && item.item_json.created_from === "ask") {
          item.source = "ask";
        } else if (item.day_key || (item.item_json && isStyleRulesItem(item.item_type, item.item_json) && item.item_json.day_key)) {
          // If day_key exists, it's from "today"
          item.source = "today";
        } else {
          // Default to manual if no source detected
          item.source = "manual";
        }
      }
      // Ensure day_key is extracted from item_json if not in column
      if (!item.day_key && item.item_json && isStyleRulesItem(item.item_type, item.item_json)) {
        item.day_key = item.item_json.day_key || null;
      }
      return item;
    });

    setItems(processedItems);
    setLoading(false);
  }

  async function loadBoards() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: boardsData } = await supabase
      .from("boards")
      .select("id, name")
      .eq("user_id", user.id)
      .neq("id", boardId) // Exclude current board
      .order("name", { ascending: true });

    if (boardsData) {
      setBoards(boardsData);
      
      // Load last selected board from localStorage
      const lastSelected = localStorage.getItem("lastSelectedMoveBoard");
      if (lastSelected && boardsData.some((b) => b.id === lastSelected)) {
        setSelectedMoveBoardId(lastSelected);
      } else if (boardsData.length > 0) {
        setSelectedMoveBoardId(boardsData[0].id);
      }
    }
  }

  async function deleteItem(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    const originalIndex = items.findIndex((i) => i.id === id);

    // Clear any existing undo toast
    setUndoItem((prev) => {
      if (prev) {
        clearTimeout(prev.timeoutId);
      }
      return null;
    });

    // Optimistically remove from UI
    setItems((prev) => prev.filter((item) => item.id !== id));
    setDeletingId(id);

    // Auto-hide undo toast after 5 seconds
    const undoTimeout = setTimeout(() => {
      setUndoItem(null);
    }, 5000);

    // Cache item for undo (with timeout reference)
    const undoData = { item: { ...item }, originalIndex, timeoutId: undoTimeout };
    setUndoItem(undoData);

    try {
      const { error: deleteError } = await supabase
        .from("board_items")
        .delete()
        .eq("id", id);

      if (deleteError) {
        console.error(deleteError);
        // Restore item on error
        setItems((prev) => {
          const newItems = [...prev];
          newItems.splice(originalIndex, 0, item);
          return newItems;
        });
        clearTimeout(undoTimeout);
        setUndoItem(null);
        setError("Failed to remove item");
        return;
      }

      // Clear undo after successful delete (user can still undo within timeout)
    } catch (error) {
      console.error("Delete error:", error);
      // Restore item on error
      setItems((prev) => {
        const newItems = [...prev];
        newItems.splice(originalIndex, 0, item);
        return newItems;
      });
      clearTimeout(undoTimeout);
      setUndoItem(null);
      setError("Failed to remove item");
    } finally {
      setDeletingId(null);
    }
  }

  async function undoDelete() {
    if (!undoItem) return;

    const { item, originalIndex, timeoutId } = undoItem;

    // Clear timeout
    clearTimeout(timeoutId);

    // Optimistically restore item
    setItems((prev) => {
      const newItems = [...prev];
      newItems.splice(originalIndex, 0, item);
      return newItems;
    });

    setUndoItem(null);
    setError(null); // Clear any previous errors

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const insertData: any = {
        board_id: boardId,
        user_id: user.id,
        intent: item.intent,
        title: item.title,
        item_type: item.item_type || null,
        item_json: item.item_json || null,
        anchors: item.anchors || null,
      };

      // Add legacy fields if present
      if (item.bullets) insertData.bullets = item.bullets;
      if (item.why) insertData.why = item.why;

      // Try to restore with same id first (if id is available)
      if (item.id) {
        insertData.id = item.id;
        const { error: insertError } = await supabase
          .from("board_items")
          .insert(insertData);

        if (insertError) {
          // If insert with same id fails, try without id (let DB generate new one)
          const { id, ...dataWithoutId } = insertData;
          const { error: retryError } = await supabase
            .from("board_items")
            .insert(dataWithoutId);

          if (retryError) {
            console.error("Failed to restore item:", retryError);
            // Remove from UI if restore fails
            setItems((prev) => prev.filter((i) => i.id !== item.id));
            setError("Failed to restore item");
          } else {
            // Reload to get new id
            await loadBoard();
          }
        } else {
          // Successfully restored with same id
          setDeletingId(null);
        }
      } else {
        // No id available, insert without id
        const { error: insertError } = await supabase
          .from("board_items")
          .insert(insertData);

        if (insertError) {
          console.error("Failed to restore item:", insertError);
          setItems((prev) => prev.filter((i) => i.id !== item.id));
          setError("Failed to restore item");
        } else {
          // Reload to get new id
          await loadBoard();
        }
      }
    } catch (error) {
      console.error("Undo error:", error);
      // Remove from UI if restore fails
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setError("Failed to restore item");
    }
  }

  function openMoveModal(itemId: string) {
    setMovingId(itemId);
    setShowMoveModal(true);
    loadBoards();
  }

  async function moveItem() {
    if (!movingId || !selectedMoveBoardId || moving) return;

    const item = items.find((i) => i.id === movingId);
    if (!item) return;

    // Remember selected board in localStorage
    localStorage.setItem("lastSelectedMoveBoard", selectedMoveBoardId);

    // Optimistically remove from current board
    setItems((prev) => prev.filter((i) => i.id !== movingId));
    setMoving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error: updateError } = await supabase
        .from("board_items")
        .update({ board_id: selectedMoveBoardId })
        .eq("id", movingId);

      if (updateError) {
        console.error(updateError);
        // Restore item on error
        const originalIndex = items.findIndex((i) => i.id === movingId);
        setItems((prev) => {
          const newItems = [...prev];
          newItems.splice(originalIndex, 0, item);
          return newItems;
        });
        setError("Failed to move item");
        return;
      }

      // Success - close modal
      setShowMoveModal(false);
      setMovingId(null);
      setSelectedMoveBoardId(null);
    } catch (error) {
      console.error("Move error:", error);
      // Restore item on error
      const originalIndex = items.findIndex((i) => i.id === movingId);
      setItems((prev) => {
        const newItems = [...prev];
        newItems.splice(originalIndex, 0, item);
        return newItems;
      });
      setError("Failed to move item");
    } finally {
      setMoving(false);
    }
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

  // Only show "Board not found" error page if board doesn't exist
  // If board exists but items failed, show board header with error banner
  if ((error === "Board not found" || !board) && !loading) {
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

  // If board doesn't exist yet, don't render (still loading or error)
  if (!board) {
    return null;
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

      {/* Error banner */}
      {error && error !== "Board not found" && (
        <div className="mb-6 rounded-lg border border-red-800/50 bg-red-950/20 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Filter chips */}
      {items.length > 0 && (
        <div className="mb-6 space-y-4">
          {/* Occasion filter */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-2">Occasion</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedOccasion("all")}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedOccasion === "all"
                    ? "bg-neutral-50 text-neutral-950"
                    : "border border-neutral-800 bg-transparent text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900/50"
                }`}
              >
                All
              </button>
              {Array.from(new Set(items.map((i) => i.occasion || i.intent).filter(Boolean))).map((occ) => (
                <button
                  key={occ}
                  type="button"
                  onClick={() => setSelectedOccasion(occ || "all")}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedOccasion === occ
                      ? "bg-neutral-50 text-neutral-950"
                      : "border border-neutral-800 bg-transparent text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900/50"
                  }`}
                >
                  {formatIntent(occ || "")}
                </button>
              ))}
            </div>
          </div>

          {/* Source filter */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-2">Source</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedSource("all")}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedSource === "all"
                    ? "bg-neutral-50 text-neutral-950"
                    : "border border-neutral-800 bg-transparent text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900/50"
                }`}
              >
                All
              </button>
              {(["today", "ask", "manual"] as const).map((source) => {
                const hasItems = items.some((i) => i.source === source);
                if (!hasItems) return null;
                return (
                  <button
                    key={source}
                    type="button"
                    onClick={() => setSelectedSource(source)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors capitalize ${
                      selectedSource === source
                        ? "bg-neutral-50 text-neutral-950"
                        : "border border-neutral-800 bg-transparent text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900/50"
                    }`}
                  >
                    {source}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
      {items.length > 0 && (() => {
        // Filter items based on selected filters
        const filteredItems = items.filter((item) => {
          const occasion = item.occasion || item.intent || "";
          const source = item.source || "manual";
          
          const occasionMatch = selectedOccasion === "all" || occasion === selectedOccasion;
          const sourceMatch = selectedSource === "all" || source === selectedSource;
          
          return occasionMatch && sourceMatch;
        });

        if (filteredItems.length === 0) {
          return (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-12 text-center">
              <h2 className="text-xl font-semibold text-neutral-50">No items match filters</h2>
              <p className="mt-2 text-sm text-neutral-400">
                Try adjusting your filters to see more items.
              </p>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            {filteredItems.map((item) => (
            <div
              key={item.id}
              className="relative rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6"
            >
              {/* Action buttons */}
              <div className="absolute top-6 right-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => openMoveModal(item.id)}
                  disabled={movingId === item.id || deletingId === item.id}
                  className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs font-medium text-neutral-200 transition-colors hover:bg-neutral-900 hover:border-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Move
                </button>
                <button
                  type="button"
                  onClick={() => deleteItem(item.id)}
                  disabled={deletingId === item.id || movingId === item.id}
                  className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs font-medium text-neutral-200 transition-colors hover:bg-neutral-900 hover:border-neutral-600 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingId === item.id ? "Removing..." : "Remove"}
                </button>
              </div>

              {/* Intent pill */}
              <div className="mb-3 pr-32">
                <span className="inline-block rounded-lg bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300">
                  {formatIntent(item.intent)}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-base font-semibold text-neutral-50 mb-3 pr-32">
                {item.title || "Untitled"}
              </h3>

              {/* Render based on item_type */}
              {(() => {
                const itemType = item.item_type;
                const itemJson = item.item_json;

                // Style rules type
                if (isStyleRulesItem(itemType, itemJson)) {
                  const styleRules = itemJson as StyleRulesItemJson;
                  return (
                    <>
                      {styleRules.one_liner && (
                        <p className="text-sm text-neutral-300 mb-4">{styleRules.one_liner}</p>
                      )}
                      {styleRules.rules && styleRules.rules.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-xs font-medium text-neutral-400 mb-2">Rules</h4>
                          <ul className="space-y-2">
                            {styleRules.rules.map((rule, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-50" />
                                <span>{rule || "—"}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {styleRules.color_story && styleRules.color_story.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-xs font-medium text-neutral-400 mb-2">Color story</h4>
                          <ul className="space-y-2">
                            {styleRules.color_story.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-50" />
                                <span>{item || "—"}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {styleRules.avoid && styleRules.avoid.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-xs font-medium text-neutral-400 mb-2">Avoid</h4>
                          <ul className="space-y-2">
                            {styleRules.avoid.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-50" />
                                <span>{item || "—"}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {styleRules.occasion && (
                        <p className="text-xs text-neutral-500 mb-4">Occasion: {styleRules.occasion}</p>
                      )}
                    </>
                  );
                }

                // Outfit type
                if (isOutfitItem(itemType, itemJson)) {
                  const outfit = itemJson as OutfitItemJson;
                  return (
                    <>
                      {outfit.why && (
                        <p className="text-sm text-neutral-300 mb-4">{outfit.why}</p>
                      )}
                      {outfit.items && outfit.items.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-xs font-medium text-neutral-400 mb-2">Items</h4>
                          <ul className="space-y-2">
                            {outfit.items.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-50" />
                                <span>{item || "—"}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {outfit.occasion && (
                        <p className="text-xs text-neutral-500 mb-4">Occasion: {outfit.occasion}</p>
                      )}
                    </>
                  );
                }

                // Note type
                if (isNoteItem(itemType, itemJson)) {
                  const note = itemJson as NoteItemJson;
                  return (
                    <>
                      {note.body && (
                        <p className="text-sm text-neutral-300 mb-4 whitespace-pre-wrap">
                          {note.body}
                        </p>
                      )}
                    </>
                  );
                }

                // Fallback: Legacy format (bullets/why) or unknown type
                const bullets = item.bullets || [];
                const why = item.why;
                return (
                  <>
                    {bullets.length > 0 ? (
                      <ul className="space-y-2 mb-4">
                        {bullets.map((bullet, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-50" />
                            <span>{bullet || "—"}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-neutral-400 mb-4 italic">No content available</p>
                    )}
                    {why && (
                      <p className="text-xs text-neutral-500 italic mb-4">{why}</p>
                    )}
                  </>
                );
              })()}

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
        );
      })()}

      {/* Undo Toast */}
      {undoItem && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-200 shadow-lg flex items-center gap-3">
            <span>Item removed</span>
            <button
              type="button"
              onClick={undoDelete}
              className="rounded-lg bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-950 transition-colors hover:bg-neutral-100"
            >
              Undo
            </button>
          </div>
        </div>
      )}

      {/* Move Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              if (!moving) {
                setShowMoveModal(false);
                setMovingId(null);
              }
            }}
          />

          {/* Modal Panel */}
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold text-neutral-50">Move to board</h2>

            {boards.length === 0 ? (
              <p className="text-sm text-neutral-400 mb-4">
                No other boards available. Create a board first.
              </p>
            ) : (
              <div className="mb-4 space-y-2">
                {boards.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedMoveBoardId(b.id)}
                    className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                      selectedMoveBoardId === b.id
                        ? "border-neutral-50 bg-neutral-900 text-neutral-50"
                        : "border-neutral-800 bg-neutral-900/50 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900"
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowMoveModal(false);
                  setMovingId(null);
                }}
                disabled={moving}
                className="flex-1 rounded-lg border border-neutral-800 bg-transparent px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-900 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={moveItem}
                disabled={!selectedMoveBoardId || moving || boards.length === 0}
                className="flex-1 rounded-lg bg-neutral-50 px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {moving ? "Moving..." : "Move"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="rounded-lg border border-red-800/50 bg-red-950/90 px-4 py-3 text-sm text-red-200 shadow-lg">
            {error}
            <button
              type="button"
              onClick={() => setError(null)}
              className="ml-3 text-red-300 hover:text-red-100"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

