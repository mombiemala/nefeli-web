"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { ConversationStarters, type Starter } from "./ConversationStarters";
import { Spinner } from "@/components/ui/primitives";
import { fetchJSON } from "@/lib/client";
import type { ConversationType } from "@prisma/client";

interface UIMessage {
  role: "USER" | "ASSISTANT";
  content: string;
}

export function ChatInterface({
  conversationId: initialId,
  initialMessages = [],
  initialPrompt,
}: {
  conversationId?: string;
  initialMessages?: UIMessage[];
  initialPrompt?: string;
}) {
  const [messages, setMessages] = useState<UIMessage[]>(initialMessages);
  const [conversationId, setConversationId] = useState<string | undefined>(initialId);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [convType, setConvType] = useState<ConversationType>("OPEN_CHAT");
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  useEffect(() => {
    if (initialPrompt && !sentInitial.current) {
      sentInitial.current = true;
      void send(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  async function send(text: string, type: ConversationType = convType) {
    if (!text.trim() || streaming) return;
    setInput("");
    setMessages((m) => [...m, { role: "USER", content: text }, { role: "ASSISTANT", content: "" }]);
    setStreaming(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId, conversationType: type }),
      });
      if (!res.ok || !res.body) {
        throw new Error(await res.text());
      }
      const newId = res.headers.get("X-Conversation-Id");
      if (newId) setConversationId(newId);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "ASSISTANT", content: acc };
          return copy;
        });
      }
    } catch (e) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: "ASSISTANT",
          content: `I couldn't reach the stars just now (${(e as Error).message}). Please try again.`,
        };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  async function remember(content: string) {
    const title = content.split(/[.!?]/)[0].slice(0, 60);
    try {
      await fetchJSON("/api/user/insights", {
        method: "POST",
        body: JSON.stringify({ insightType: "THEME", title, content, sourceConversationId: conversationId }),
      });
      alert("Saved to your insights ✶");
    } catch {
      alert("Couldn't save that insight.");
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col md:h-[calc(100vh-8rem)]">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-1 py-2">
        {empty && (
          <div className="mx-auto mt-8 max-w-2xl text-center">
            <div className="mb-4 text-4xl">✶</div>
            <h2 className="heading mb-2 text-2xl text-gold">What's on your mind?</h2>
            <p className="subtle mb-6">
              I know your chart and your story. Ask me anything — or start here.
            </p>
            <ConversationStarters
              onPick={(s: Starter) => {
                setConvType(s.type);
                void send(s.prompt, s.type);
              }}
            />
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className="group">
            <MessageBubble role={m.role} content={m.content} />
            {m.role === "ASSISTANT" && m.content && !streaming && (
              <div className="mt-1 flex justify-start pl-6">
                <button
                  onClick={() => remember(m.content)}
                  className="text-[11px] text-cream-dim opacity-0 transition hover:text-gold group-hover:opacity-100"
                >
                  ✦ Remember this
                </button>
              </div>
            )}
          </div>
        ))}

        {streaming && messages.at(-1)?.content === "" && (
          <div className="flex items-center gap-2 pl-6 text-cream-dim">
            <Spinner className="h-4 w-4" /> Luminary is reading the sky…
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="mt-3 flex items-end gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          rows={1}
          placeholder="Share what's alive for you…"
          className="input max-h-40 min-h-[46px] flex-1 resize-none"
        />
        <button type="submit" disabled={streaming || !input.trim()} className="btn-primary h-[46px] px-4">
          {streaming ? <Spinner className="h-4 w-4 border-night/40 border-t-night" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
