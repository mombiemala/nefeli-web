"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

type OutfitOption = {
  name: string;
  items: string[];
  palette: string[];
  notes: string;
};

type ChatResponse = {
  headline: string;
  outfit_options: OutfitOption[];
  accessories: string[];
  beauty: string[];
  why: string;
  safety: {
    constraints: string[];
  };
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  data?: ChatResponse;
};

export default function AskPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingToBoard, setSavingToBoard] = useState<string | null>(null);
  const [boards, setBoards] = useState<Array<{ id: string; name: string }>>([]);
  const [showBoardSelect, setShowBoardSelect] = useState(false);

  useEffect(() => {
    loadUserAndBoards();
  }, []);

  async function loadUserAndBoards() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    setUserId(user.id);

    // Load boards
    const { data: boardsData } = await supabase
      .from("boards")
      .select("id, name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (boardsData) {
      setBoards(boardsData);
    }
  }


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !userId || isLoading) return;

    // Clear error
    setError(null);

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/nefeli/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          message: text,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to get response");
      }

      const responseText = await res.text();
      let responseData: ChatResponse;

      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        // Try to parse as { ok: true, content, data } format
        const altResponse = JSON.parse(responseText);
        if (altResponse.ok && altResponse.data) {
          responseData = altResponse.data;
        } else {
          throw new Error("Invalid response format");
        }
      }

      // Generate summary text for content
      const summary = `${responseData.headline}. ${responseData.why}`;

      // Add assistant message
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: summary,
        data: responseData,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setError(err.message || "Failed to get response");
      // Add error message
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Error: ${err.message || "Failed to get response"}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  async function saveToBoard(boardId: string) {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage?.data || !userId) return;

    const responseData = lastMessage.data;
    setSavingToBoard(boardId);

    const { error } = await supabase.from("board_items").insert({
      board_id: boardId,
      user_id: userId,
      intent: "custom",
      title: responseData.headline,
      bullets: [
        ...responseData.outfit_options.flatMap((opt) => [
          `${opt.name}: ${opt.items.join(", ")}`,
          `Palette: ${opt.palette.join(", ")}`,
          opt.notes,
        ]),
        `Accessories: ${responseData.accessories.join(", ")}`,
        `Beauty: ${responseData.beauty.join(", ")}`,
        responseData.why,
      ],
      why: responseData.why,
      anchors: null,
    });

    if (error) {
      console.error(error);
      setSavingToBoard(null);
      return;
    }

    setSavingToBoard(null);
    setShowBoardSelect(false);
    alert("Saved to board!");
  }


  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-50">Ask NEFELI</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Get personalized style guidance based on your chart and goals.
        </p>
      </div>

      {/* Chat Messages */}
      <div className="mb-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 ${
              message.role === "user" ? "ml-auto max-w-[80%]" : ""
            }`}
          >
            {message.role === "user" ? (
              <p className="text-sm text-neutral-200">{message.content}</p>
            ) : (
              <div className="space-y-4">
                {message.data ? (
                  <>
                    <h3 className="text-lg font-semibold text-neutral-50">
                      {message.data.headline}
                    </h3>

                    {/* Outfit Options */}
                    <div className="space-y-4">
                      {message.data.outfit_options.map((outfit, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-4"
                        >
                          <h4 className="text-base font-semibold text-neutral-50 mb-2">
                            {outfit.name}
                          </h4>
                          <ul className="space-y-1 mb-2">
                            {outfit.items.map((item, j) => (
                              <li key={j} className="text-sm text-neutral-300">
                                • {item}
                              </li>
                            ))}
                          </ul>
                          <p className="text-xs text-neutral-400 mb-2">
                            <span className="font-medium">Palette:</span> {outfit.palette.join(", ")}
                          </p>
                          {outfit.notes && (
                            <p className="text-xs text-neutral-400 italic">{outfit.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Accessories */}
                    {message.data.accessories.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-50 mb-2">Accessories</h4>
                        <ul className="space-y-1">
                          {message.data.accessories.map((acc, i) => (
                            <li key={i} className="text-sm text-neutral-300">
                              • {acc}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Beauty */}
                    {message.data.beauty.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-50 mb-2">
                          Beauty & finishing touches
                        </h4>
                        <ul className="space-y-1">
                          {message.data.beauty.map((item, i) => (
                            <li key={i} className="text-sm text-neutral-300">
                              • {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Why */}
                    <div className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-4">
                      <p className="text-xs text-neutral-400 italic">{message.data.why}</p>
                    </div>

                    {/* Save to Board */}
                    {boards.length > 0 && message.id === messages[messages.length - 1]?.id && (
                      <div>
                        {showBoardSelect ? (
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-neutral-200">
                              Select board
                            </label>
                            <select
                              className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-50"
                              onChange={(e) => {
                                if (e.target.value) {
                                  saveToBoard(e.target.value);
                                }
                              }}
                              disabled={savingToBoard !== null}
                            >
                              <option value="">Choose a board...</option>
                              {boards.map((board) => (
                                <option key={board.id} value={board.id}>
                                  {board.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => setShowBoardSelect(false)}
                              className="text-sm text-neutral-400 hover:text-neutral-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowBoardSelect(true)}
                            className="rounded-xl border border-neutral-700 bg-transparent px-4 py-2 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-900 hover:border-neutral-600"
                          >
                            Save to board
                          </button>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-neutral-300">{message.content}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-900/50 bg-red-950/20 p-4">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask NEFELI for style guidance..."
            className="flex-1 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-neutral-700 focus:outline-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim() || !userId}
            className="rounded-xl bg-neutral-50 px-6 py-3 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Sending..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}

