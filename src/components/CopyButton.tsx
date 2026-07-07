"use client";

import { useState } from "react";

// Lightweight share/export: copy a reading to the clipboard.
export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="text-xs text-neutral-500 underline-offset-4 hover:text-neutral-300 hover:underline"
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
