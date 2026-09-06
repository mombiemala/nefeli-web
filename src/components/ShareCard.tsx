"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";

type Props = {
  /** Analytics label for where this was shared from. */
  surface: string;
  /** Small label above the title (e.g. the moon phase). */
  eyebrow?: string;
  title: string;
  /** The reading text. Long readings are trimmed to fit the card. */
  body: string;
  /** Optional highlighted line (e.g. the day's gentle action). */
  highlight?: string | null;
};

const W = 1080;
const H = 1350;
const PAD = 90;
const MAXW = W - PAD * 2;

const COLORS = {
  bg0: "#1b1436",
  bg1: "#120e22",
  glow: "rgba(185,162,242,0.22)",
  rose: "rgba(240,171,199,0.10)",
  ink: "#F2ECFA",
  soft: "#cfc6e6",
  accent: "#c9b6ff",
  gold: "#ecd08a",
  faint: "#8b81a8",
};

function fontStack(varName: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v ? `${v}, ${fallback}` : fallback;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  for (const para of text.split(/\n+/)) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    lines.push(""); // paragraph gap
  }
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

function draw(canvas: HTMLCanvasElement, p: Props) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const serif = fontStack("--font-cormorant", "Georgia, 'Times New Roman', serif");
  const sans = fontStack("--font-dm-sans", "system-ui, -apple-system, sans-serif");
  const marc = fontStack("--font-marcellus", serif);

  canvas.width = W;
  canvas.height = H;

  // Ground
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, COLORS.bg0);
  g.addColorStop(1, COLORS.bg1);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Dawn glow, top
  const glow = ctx.createRadialGradient(W / 2, 120, 40, W / 2, 120, 720);
  glow.addColorStop(0, COLORS.glow);
  glow.addColorStop(0.55, COLORS.rose);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Stars
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const r = Math.random() * 1.8 + 0.4;
    ctx.globalAlpha = Math.random() * 0.5 + 0.15;
    ctx.fillStyle = Math.random() < 0.15 ? COLORS.gold : COLORS.accent;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 6.2832);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Wordmark
  ctx.textAlign = "left";
  ctx.fillStyle = COLORS.accent;
  ctx.font = `40px ${marc}`;
  ctx.fillText("✦", PAD, 150);
  ctx.fillStyle = COLORS.ink;
  ctx.font = `40px ${marc}`;
  ctx.save();
  // letter-spaced wordmark
  let wx = PAD + 60;
  for (const ch of "NEFELI") {
    ctx.fillText(ch, wx, 150);
    wx += ctx.measureText(ch).width + 12;
  }
  ctx.restore();

  // Eyebrow
  if (p.eyebrow) {
    ctx.fillStyle = COLORS.faint;
    ctx.font = `26px ${sans}`;
    ctx.fillText(p.eyebrow.toUpperCase(), PAD, 210);
  }

  // Title
  ctx.fillStyle = COLORS.ink;
  ctx.font = `italic 76px ${serif}`;
  ctx.fillText(p.title, PAD, 320);

  // Body
  const hasHi = Boolean(p.highlight && p.highlight.trim());
  ctx.font = `44px ${serif}`;
  ctx.fillStyle = COLORS.soft;
  const lineH = 62;
  const bodyTop = 420;
  const bodyBottom = hasHi ? 980 : 1180;
  const maxLines = Math.floor((bodyBottom - bodyTop) / lineH);
  let lines = wrap(ctx, p.body, MAXW);
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    let last = lines[maxLines - 1] || "";
    while (last && ctx.measureText(last + "…").width > MAXW) last = last.slice(0, -1);
    lines[maxLines - 1] = last.trimEnd() + "…";
  }
  let y = bodyTop;
  for (const line of lines) {
    if (line) ctx.fillText(line, PAD, y);
    y += line ? lineH : lineH * 0.5;
  }

  // Highlight (the gentle action)
  if (hasHi) {
    const boxTop = 1010;
    ctx.fillStyle = "rgba(185,162,242,0.10)";
    ctx.fillRect(PAD, boxTop, MAXW, 200);
    ctx.fillStyle = COLORS.accent;
    ctx.fillRect(PAD, boxTop, 5, 200);
    ctx.fillStyle = COLORS.accent;
    ctx.font = `24px ${marc}`;
    ctx.fillText("IF YOU LIKE", PAD + 36, boxTop + 52);
    ctx.fillStyle = COLORS.ink;
    ctx.font = `34px ${sans}`;
    const hiLines = wrap(ctx, p.highlight!.trim(), MAXW - 72).slice(0, 3);
    let hy = boxTop + 100;
    for (const line of hiLines) {
      ctx.fillText(line, PAD + 36, hy);
      hy += 46;
    }
  }

  // Footer
  ctx.fillStyle = COLORS.faint;
  ctx.font = `26px ${sans}`;
  ctx.fillText("nefeli.kamalacreated.com", PAD, H - 70);
  ctx.textAlign = "right";
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  ctx.fillText(today, W - PAD, H - 70);
  ctx.textAlign = "left";
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

export function ShareButton(props: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-neutral-500 underline-offset-4 hover:text-accent hover:underline"
      >
        Share as image
      </button>
      {open && <ShareModal {...props} onClose={() => setOpen(false)} />}
    </>
  );
}

function ShareModal(props: Props & { onClose: () => void }) {
  const { onClose } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (document.fonts?.ready) await document.fonts.ready;
      } catch { /* proceed with fallback fonts */ }
      if (!alive || !canvasRef.current) return;
      draw(canvasRef.current, props);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      setCanNativeShare(typeof navigator !== "undefined" && "canShare" in navigator);
    } catch { /* no-op */ }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const download = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy(true);
    try {
      const blob = await toBlob(canvas);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "nefeli-reading.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      track("reading_shared", { surface: props.surface, method: "download" });
    } finally {
      setBusy(false);
    }
  }, [props.surface]);

  const nativeShare = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy(true);
    try {
      const blob = await toBlob(canvas);
      if (!blob) return;
      const file = new File([blob], "nefeli-reading.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: "NEFELI", text: props.title });
        track("reading_shared", { surface: props.surface, method: "native" });
      } else {
        await download();
      }
    } catch {
      /* user cancelled or share failed — no-op */
    } finally {
      setBusy(false);
    }
  }, [props.surface, props.title, download]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#171226] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="font-marcellus text-xs uppercase tracking-[0.2em] text-accent">Share</p>
          <button type="button" onClick={onClose} aria-label="Close" className="text-neutral-500 hover:text-neutral-300">✕</button>
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
          <canvas ref={canvasRef} className="block h-auto w-full" style={{ aspectRatio: "1080 / 1350" }} />
        </div>
        <div className="mt-4 flex gap-2">
          {canNativeShare && (
            <button
              type="button"
              onClick={nativeShare}
              disabled={busy}
              className="flex-1 rounded-lg btn-brand px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              Share
            </button>
          )}
          <button
            type="button"
            onClick={download}
            disabled={busy}
            className={`${canNativeShare ? "" : "flex-1 btn-brand"} rounded-lg border border-white/12 px-4 py-2.5 text-sm font-semibold text-neutral-100 hover:border-accent/50 disabled:opacity-50`}
          >
            {busy ? "…" : "Download"}
          </button>
        </div>
      </div>
    </div>
  );
}
