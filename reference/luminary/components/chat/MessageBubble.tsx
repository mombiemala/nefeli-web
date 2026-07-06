"use client";

import { cn } from "@/lib/utils";

/** Render a chat message with light markdown-ish formatting for *italics*. */
export function MessageBubble({
  role,
  content,
}: {
  role: "USER" | "ASSISTANT" | "user" | "assistant";
  content: string;
}) {
  const isUser = role === "USER" || role === "user";
  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-[15px] leading-relaxed md:max-w-[75%]",
          isUser
            ? "bg-gold/15 text-cream"
            : "border border-white/10 bg-night-800/60 text-cream/95",
        )}
      >
        {!isUser && <span className="mr-1 text-gold">✶</span>}
        {renderInline(content)}
      </div>
    </div>
  );
}

function renderInline(text: string) {
  // Minimal *italic* + **bold** rendering.
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={i} className="text-gold-soft">{p.slice(2, -2)}</strong>;
    }
    if (p.startsWith("*") && p.endsWith("*")) {
      return <em key={i} className="text-cream-muted">{p.slice(1, -1)}</em>;
    }
    return <span key={i}>{p}</span>;
  });
}
