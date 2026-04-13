"use client";

import { AnimatePresence, motion } from "motion/react";

import { CardView } from "@/components/online/table/card-view";

type BlindPlayOverlayProps = {
  visible: boolean;
  phase: "launch" | "reveal" | "resolve";
  outcome: "success" | "pickup" | null;
  message: string | null;
  revealedCard: { rank: string; suit: string } | null;
  reduceMotion: boolean;
};

function extractRankFromMessage(message: string | null): string | null {
  if (!message) {
    return null;
  }

  const match = message.match(/flipped(?: and played)?\s(3|4|5|6|7|8|9|10|J|Q|K|A|2)/i);
  return match?.[1]?.toUpperCase() ?? null;
}

export function BlindPlayOverlay({ visible, phase, outcome, message, revealedCard, reduceMotion }: BlindPlayOverlayProps) {
  const fallbackRank = extractRankFromMessage(message);
  const cardTransition = reduceMotion
    ? ({ duration: 0.15 } as const)
    : phase === "launch"
      ? ({ duration: 0.45, ease: "easeOut" } as const)
      : phase === "reveal"
        ? ({ duration: 0.62, ease: "easeInOut" } as const)
        : ({ duration: 0.35, ease: "easeOut" } as const);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="blind-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-zinc-950/20 px-4"
        >
          <motion.div
            initial={reduceMotion ? { opacity: 0.9 } : { opacity: 0, scale: 0.95, y: 12 }}
            animate={
              reduceMotion
                ? { opacity: 1 }
                : {
                    opacity: 1,
                    scale: 1,
                    y: 0,
                  }
            }
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            transition={reduceMotion ? { duration: 0.1 } : { duration: 0.22, ease: "easeOut" }}
            className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white/95 p-4 shadow-2xl backdrop-blur"
          >
            <p className="text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">Blind play</p>

            <div className="mt-3 flex items-center justify-center">
              <motion.div
                animate={
                  reduceMotion
                    ? undefined
                    : phase === "launch"
                      ? { y: -10, rotate: -4 }
                      : phase === "reveal"
                        ? { y: 0, rotateY: 180 }
                        : { y: 0, rotate: 0, scale: 1.02 }
                }
                transition={cardTransition}
                style={{ transformStyle: "preserve-3d" }}
              >
                {phase === "launch" ? (
                  <CardView isFaceDown size="lg" isDisabled />
                ) : revealedCard ? (
                  <CardView rank={revealedCard.rank} suit={revealedCard.suit} size="lg" isDisabled />
                ) : (
                  <div className="flex aspect-[5/7] w-24 flex-col items-center justify-center rounded-xl border border-zinc-300 bg-white shadow">
                    <span className="text-3xl font-black text-zinc-800">{fallbackRank ?? "?"}</span>
                    <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Unknown suit</span>
                  </div>
                )}
              </motion.div>
            </div>

            <p
              className={[
                "mt-3 text-center text-sm",
                outcome === "pickup" ? "text-amber-800" : outcome === "success" ? "text-emerald-800" : "text-zinc-700",
              ].join(" ")}
            >
              {message ?? "Revealing card..."}
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
