"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Spinner } from "@/components/ui/primitives";
import { basePlacementDescription, formatDegree, houseTheme, signProfile, ordinal } from "@/lib/chart-utils";
import { fetchJSON } from "@/lib/client";
import type { PlanetPosition } from "@/lib/types";

export function PlanetDetail({
  planet,
  onClose,
}: {
  planet: PlanetPosition | null;
  onClose: () => void;
}) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setInsight(null);
    if (!planet || planet.name === "Ascendant" || planet.name === "Midheaven") return;
    let active = true;
    setLoading(true);
    fetchJSON<{ insight: string | null }>("/api/ai/placement", {
      method: "POST",
      body: JSON.stringify({ planet: planet.name, sign: planet.sign, house: planet.house }),
    })
      .then((d) => active && setInsight(d.insight))
      .catch(() => active && setInsight(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [planet]);

  const open = Boolean(planet);
  const profile = planet ? signProfile(planet.sign) : null;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-gold/20 bg-night-800 p-6 shadow-glass focus:outline-none data-[state=open]:animate-fade-up">
          {planet && (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-4xl text-gold">{planet.glyph}</span>
                    <div>
                      <Dialog.Title className="heading text-2xl">{planet.name}</Dialog.Title>
                      <p className="subtle text-sm">{formatDegree(planet)}</p>
                    </div>
                  </div>
                </div>
                <Dialog.Close className="rounded-full p-1.5 text-cream-muted hover:bg-white/5">
                  <X className="h-5 w-5" />
                </Dialog.Close>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="chip">{ordinal(planet.house)} house</span>
                {profile && <span className="chip">{profile.element}</span>}
                {profile && <span className="chip">{profile.modality}</span>}
                {planet.retrograde && <span className="chip border-red-400/30 text-red-300">Retrograde ℞</span>}
              </div>

              <p className="mt-4 text-sm leading-relaxed text-cream/90">
                {basePlacementDescription(planet)}
              </p>
              <p className="mt-2 text-xs text-cream-dim">
                House theme: {houseTheme(planet.house)}.
              </p>

              <div className="mt-5 rounded-xl border border-gold/15 bg-gold/[0.04] p-4">
                <p className="mb-2 text-xs uppercase tracking-wider text-gold">
                  ✶ For you specifically
                </p>
                {loading && (
                  <div className="flex items-center gap-2 text-sm text-cream-dim">
                    <Spinner className="h-4 w-4" /> Luminary is reflecting…
                  </div>
                )}
                {!loading && insight && (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-cream/90">{insight}</p>
                )}
                {!loading && !insight && (
                  <p className="text-sm text-cream-dim">
                    Add some life context to unlock a personalised reading of this placement.
                  </p>
                )}
              </div>

              <Link
                href={`/chat?prompt=${encodeURIComponent(
                  `Help me understand my ${planet.name} in ${planet.sign} in the ${planet.house}th house.`,
                )}&type=CHART_READING`}
                className="btn-primary mt-5 w-full"
              >
                Ask Luminary about this placement
              </Link>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
