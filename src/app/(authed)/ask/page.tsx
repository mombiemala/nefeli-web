"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import SaveToBoardModal from "@/components/SaveToBoardModal";
import type { OutfitItemJson } from "@/types/boardItems";

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
  intent: "work" | "date" | "everyday" | "staples";
  occasion: string | null;
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
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [savingMessageId, setSavingMessageId] = useState<string | null>(null);
  const [savedBoardName, setSavedBoardName] = useState<string | null>(null);
  const [profile, setProfile] = useState<{
    sun_sign: string | null;
    moon_sign: string | null;
    rising_sign: string | null;
    mc_sign: string | null;
  } | null>(null);

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

    // Load boards will be done when modal opens

    // Load profile for anchors
    const { data: profileData } = await supabase
      .from("profiles")
      .select("sun_sign, moon_sign, rising_sign, mc_sign")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileData) {
      setProfile(profileData);
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

      const responseJson = await res.json();
      
      if (!responseJson.ok || !responseJson.data) {
        throw new Error(responseJson.error || "Invalid response format");
      }

      const responseData: ChatResponse = responseJson.data;

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

  async function openSaveModal(messageId: string) {
    if (!userId) {
      window.location.href = "/login";
      return;
    }

    setSavingMessageId(messageId);
    setShowSaveModal(true);
  }

  function getSavePayloadForMessage(messageId: string) {
    const message = messages.find((m) => m.id === messageId);
    if (!message?.data) return null;

    const responseData = message.data;

    // Title: use headline or fallback
    const title = responseData.headline || "Outfit direction";

    // Build items array from all outfit options
    const items: string[] = [];
    responseData.outfit_options.forEach((opt) => {
      items.push(...opt.items);
    });
    // Add accessories and beauty items
    items.push(...responseData.accessories);
    items.push(...responseData.beauty);

    // Anchors from profile
    const anchors = profile
      ? {
          sun: profile.sun_sign,
          moon: profile.moon_sign,
          rising: profile.rising_sign,
          mc: profile.mc_sign,
        }
      : {
          sun: null,
          moon: null,
          rising: null,
          mc: null,
        };

    // Return as outfit type payload
    return {
      title,
      item_type: "outfit" as const,
      item_json: {
        title,
        why: responseData.why,
        items,
        occasion: responseData.occasion || null,
        created_from: "ask" as const,
      } as OutfitItemJson,
      intent: responseData.intent || "everyday",
      anchors,
    };
  }

  function handleSaveSuccess(boardName: string) {
    setSavedBoardName(boardName);
    setTimeout(() => {
      setSavedBoardName(null);
    }, 3000);
    setSavingMessageId(null);
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
                    <h2 className="text-xl font-semibold text-neutral-50">
                      {message.data.headline}
                    </h2>

                    {/* Outfit Options */}
                    <div className="space-y-3">
                      {message.data.outfit_options.map((outfit, i) => (
                        <div
                          key={i}
                          className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-5"
                        >
                          <h4 className="text-base font-semibold text-neutral-50 mb-3">
                            {outfit.name}
                          </h4>
                          <ul className="space-y-1.5 mb-3">
                            {outfit.items.map((item, j) => (
                              <li key={j} className="text-sm text-neutral-300">
                                • {item}
                              </li>
                            ))}
                          </ul>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {outfit.palette.map((color, j) => (
                              <span
                                key={j}
                                className="px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-900 border border-neutral-800 text-neutral-300"
                              >
                                {color}
                              </span>
                            ))}
                          </div>
                          {outfit.notes && (
                            <p className="text-xs text-neutral-400 italic">{outfit.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Accessories */}
                    {message.data.accessories.length > 0 && (
                      <div className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-4">
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
                      <div className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-4">
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
                    <div className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-4">
                      <p className="text-sm text-neutral-400">{message.data.why}</p>
                    </div>

                    {/* Save to Board - only show for latest structured output */}
                    {(() => {
                      const structuredMessages = messages.filter((m) => m.role === "assistant" && m.data);
                      const latestStructured = structuredMessages[structuredMessages.length - 1];
                      return message.id === latestStructured?.id;
                    })() && (
                      <div>
                        <button
                          type="button"
                          onClick={() => openSaveModal(message.id)}
                          className="rounded-xl border border-neutral-700 bg-transparent px-4 py-2 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-900 hover:border-neutral-600"
                        >
                          Save to board
                        </button>
                        {savedBoardName && savingMessageId === message.id && (
                          <p className="mt-2 text-xs text-neutral-400">
                            Saved to {savedBoardName}
                          </p>
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

      {/* Quick Prompt Chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        {["Work meeting", "Job interview", "First date", "Everyday errands", "Closet staples"].map(
          (prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setInput(prompt)}
              className="rounded-full border border-neutral-800 bg-neutral-950/50 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-900 hover:border-neutral-700"
            >
              {prompt}
            </button>
          )
        )}
      </div>

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

      {/* Save Modal */}
      <SaveToBoardModal
        isOpen={showSaveModal}
        onClose={() => {
          setShowSaveModal(false);
          setSavingMessageId(null);
        }}
        userId={userId}
        savePayload={savingMessageId ? getSavePayloadForMessage(savingMessageId) : null}
        onSuccess={handleSaveSuccess}
      />
    </div>
  );
}

