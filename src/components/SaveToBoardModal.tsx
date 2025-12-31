"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import type { StyleRulesItemJson, OutfitItemJson, BoardItemType } from "@/types/boardItems";
import { isOutfitItem } from "@/types/boardItems";

type Board = {
  id: string;
  name: string;
  updated_at?: string;
};

type SavePayload = {
  title: string;
  bullets?: string[];
  why?: string;
  one_liner?: string;
  rules?: string[];
  color_story?: string[];
  avoid?: string[];
  item_type?: BoardItemType;
  item_json?: StyleRulesItemJson | OutfitItemJson;
  intent: string;
  occasion?: string | null;
  anchors: {
    sun: string | null;
    moon: string | null;
    rising: string | null;
    mc: string | null;
  };
};

type SaveToBoardModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  savePayload: SavePayload | null;
  onSuccess?: (boardName: string) => void;
};

export default function SaveToBoardModal({
  isOpen,
  onClose,
  userId,
  savePayload,
  onSuccess,
}: SaveToBoardModalProps) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [newBoardName, setNewBoardName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      loadBoards();
    }
  }, [isOpen, userId]);

  async function loadBoards() {
    if (!userId) return;

    const { data: boardsData } = await supabase
      .from("boards")
      .select("id, name, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (boardsData) {
      setBoards(boardsData);
      
      // Auto-select first board if available
      if (boardsData.length > 0 && !selectedBoardId) {
        setSelectedBoardId(boardsData[0].id);
      }
    }
  }

  async function ensureMyCapsuleExists(): Promise<string | null> {
    if (!userId) return null;

    // Check if "My Capsule" exists
    const { data: existing } = await supabase
      .from("boards")
      .select("id")
      .eq("user_id", userId)
      .eq("name", "My Capsule")
      .maybeSingle();

    if (existing) {
      return existing.id;
    }

    // Create "My Capsule"
    const { data: newBoard, error } = await supabase
      .from("boards")
      .insert({
        user_id: userId,
        name: "My Capsule",
        description: null,
      })
      .select("id, name, updated_at")
      .single();

    if (error || !newBoard) {
      console.error("Failed to create My Capsule:", error);
      return null;
    }

    // Refresh boards list and auto-select the new board
    await loadBoards();
    setSelectedBoardId(newBoard.id);
    return newBoard.id;
  }

  async function createBoard() {
    if (!userId || !newBoardName.trim() || creating) return;

    setCreating(true);
    setSaveStatus(null);

    const { data, error } = await supabase
      .from("boards")
      .insert({
        user_id: userId,
        name: newBoardName.trim(),
        description: null,
      })
      .select("id, name, updated_at")
      .single();

    if (error) {
      setSaveStatus(`Error: ${error.message}`);
      setCreating(false);
      return;
    }

    // Refresh boards and auto-select new board
    await loadBoards();
    setSelectedBoardId(data.id);
    setNewBoardName("");
    setCreating(false);
  }

  async function handleSave() {
    if (!savePayload || !userId || saving) return;

    setSaving(true);
    setSaveStatus(null);

    // If no board selected and no boards exist, auto-create "My Capsule"
    let targetBoardId = selectedBoardId;
    if (!targetBoardId && boards.length === 0) {
      const capsuleId = await ensureMyCapsuleExists();
      if (!capsuleId) {
        setSaveStatus("Failed to create board. Please try again.");
        setSaving(false);
        return;
      }
      targetBoardId = capsuleId;
      setSelectedBoardId(capsuleId);
    }

    if (!targetBoardId) {
      setSaveStatus("Please select a board");
      setSaving(false);
      return;
    }

    try {
      // Use provided item_type and item_json if available (from ask page)
      let itemType: BoardItemType = savePayload.item_type || "style_rules";
      let itemJson: StyleRulesItemJson | OutfitItemJson;

      // Determine source from payload
      let source: "today" | "ask" | "manual" = "manual";
      if (savePayload.item_json) {
        // Check if it's from ask page (has created_from="ask")
        if (isOutfitItem("outfit", savePayload.item_json) && savePayload.item_json.created_from === "ask") {
          source = "ask";
        }
      }

      if (savePayload.item_json) {
        // Use provided item_json (from ask page)
        itemJson = savePayload.item_json;
      } else if (savePayload.item_type === "outfit" && savePayload.item_json) {
        // Outfit type
        itemType = "outfit";
        itemJson = savePayload.item_json as OutfitItemJson;
      } else {
        // Determine item_type based on payload structure
        // If it has one_liner, rules, color_story, avoid -> style_rules
        // Otherwise, default to style_rules for backward compatibility
        itemType = "style_rules";
        itemJson = {
          title: savePayload.title,
          one_liner: savePayload.one_liner || savePayload.why || "",
          rules: savePayload.rules || savePayload.bullets?.slice(0, 3) || [],
          color_story: savePayload.color_story || savePayload.bullets?.slice(3, 6) || [],
          avoid: savePayload.avoid || savePayload.bullets?.slice(6, 8) || [],
          occasion: savePayload.occasion || null,
        } as StyleRulesItemJson;
      }

      // Extract occasion from item_json or use intent
      const occasion = (itemJson as any).occasion || savePayload.intent || null;

      // Try to insert with metadata columns, fallback to item_json if columns don't exist
      const insertData: any = {
        board_id: targetBoardId,
        user_id: userId,
        intent: savePayload.intent,
        title: savePayload.title, // Keep title for backward compatibility
        item_type: itemType,
        item_json: itemJson,
        anchors: savePayload.anchors,
        source: source,
        occasion: occasion,
      };

      const { error, data: boardData } = await supabase.from("board_items").insert(insertData);

      if (error) {
        throw new Error(error.message);
      }

      // Get board name for success callback
      const { data: board } = await supabase
        .from("boards")
        .select("name")
        .eq("id", targetBoardId)
        .single();

      if (board && onSuccess) {
        onSuccess(board.name);
      }

      // Close modal on success
      onClose();
      setSelectedBoardId(null);
      setNewBoardName("");
    } catch (error: any) {
      setSaveStatus(error.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => {
          if (!saving && !creating) {
            onClose();
            setSelectedBoardId(null);
            setNewBoardName("");
            setSaveStatus(null);
          }
        }}
      />

      {/* Modal Panel */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-neutral-50">Save to board</h2>

        {/* Board List */}
        {boards.length > 0 && (
          <div className="mb-4 space-y-2">
            {boards.map((board) => (
              <button
                key={board.id}
                type="button"
                onClick={() => setSelectedBoardId(board.id)}
                className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                  selectedBoardId === board.id
                    ? "border-neutral-50 bg-neutral-900 text-neutral-50"
                    : "border-neutral-800 bg-neutral-900/50 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900"
                }`}
              >
                {board.name}
              </button>
            ))}
          </div>
        )}

        {/* Divider */}
        {boards.length > 0 && <div className="my-4 border-t border-neutral-800" />}

        {/* Create New Board */}
        <div className="mb-4 space-y-2">
          <label className="block text-sm font-medium text-neutral-200">
            Create new board
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              placeholder="Board name"
              className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-700 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !creating) {
                  e.preventDefault();
                  createBoard();
                }
              }}
              disabled={creating}
            />
            <button
              type="button"
              onClick={createBoard}
              disabled={!newBoardName.trim() || creating}
              className="rounded-lg border border-neutral-700 bg-transparent px-4 py-2 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </div>

        {/* Error Status */}
        {saveStatus && (
          <div className="mb-4 rounded-lg border border-red-900/50 bg-red-950/20 p-3">
            <p className="text-sm text-red-200">{saveStatus}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              setSelectedBoardId(null);
              setNewBoardName("");
              setSaveStatus(null);
            }}
            disabled={saving || creating}
            className="flex-1 rounded-lg border border-neutral-800 bg-transparent px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-900 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!selectedBoardId || !savePayload || saving || creating}
            className="flex-1 rounded-lg bg-neutral-50 px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

