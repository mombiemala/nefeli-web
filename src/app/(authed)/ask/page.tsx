"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { authedFetch } from "@/lib/api";

type Msg = { id: string; role: "user" | "assistant"; content: string; remembered?: boolean };

export default function AskPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) window.location.href = "/login";
    })();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setError(null);
    setInput("");

    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: text };
    const assistantId = crypto.randomUUID();
    setMessages((m) => [...m, userMsg, { id: assistantId, role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const res = await authedFetch("/api/companion/chat", {
        method: "POST",
        body: JSON.stringify({ conversationId, message: text }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong.");
      }

      const convId = res.headers.get("X-Conversation-Id");
      if (convId) setConversationId(convId);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((m) =>
          m.map((msg) => (msg.id === assistantId ? { ...msg, content: msg.content + chunk } : msg)),
        );
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong.";
      setError(message);
      setMessages((m) => m.filter((msg) => msg.content !== "" || msg.role !== "assistant"));
    } finally {
      setStreaming(false);
    }
  }

  async function remember(msg: Msg) {
    try {
      const res = await authedFetch("/api/companion/insights", {
        method: "POST",
        body: JSON.stringify({ content: msg.content, sourceConversationId: conversationId }),
      });
      if (res.ok) {
        setMessages((m) => m.map((x) => (x.id === msg.id ? { ...x, remembered: true } : x)));
      }
    } catch {
      /* non-fatal */
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-50">Talk with NEFELI</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Anything that’s alive for you — I read it through your chart and remember what you share.
        </p>
      </div>

      <div className="flex-1 space-y-5">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-neutral-500">Start anywhere.</p>
            <div className="flex flex-wrap gap-2">
              {[
                "What is this heaviness I’m carrying?",
                "What’s the sky asking of me today?",
                "Help me understand a pattern I keep repeating.",
              ].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setInput(s)}
                  className="rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs text-neutral-300 transition-colors hover:border-accent/40 hover:text-neutral-100"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => {
          const isStreamingMsg =
            streaming && msg.role === "assistant" && i === messages.length - 1;
          return (
          <div key={msg.id} className={`animate-fade-up ${msg.role === "user" ? "text-right" : ""}`}>
            <div
              className={[
                "inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-[15px] leading-7",
                msg.role === "user"
                  ? "bg-neutral-50 text-neutral-950"
                  : "card-glow border border-white/5 text-neutral-200",
                isStreamingMsg ? "streaming-caret" : "",
              ].join(" ")}
            >
              {msg.content}
            </div>
            {msg.role === "assistant" && msg.content && !streaming && (
              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => remember(msg)}
                  disabled={msg.remembered}
                  className="text-xs text-neutral-500 underline-offset-4 hover:text-neutral-300 hover:underline disabled:no-underline disabled:text-neutral-600"
                >
                  {msg.remembered ? "✓ Remembered" : "Remember this"}
                </button>
              </div>
            )}
          </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="sticky bottom-0 mt-4 bg-[#08080b]/85 py-3 backdrop-blur">
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder="Tell me what’s here…"
            className="flex-1 resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/40"
          />
          <button
            type="button"
            onClick={send}
            disabled={streaming || !input.trim()}
            className="rounded-xl bg-neutral-50 px-5 py-3 text-sm font-semibold text-neutral-950 transition-colors hover:bg-white disabled:opacity-50"
          >
            {streaming ? "…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
