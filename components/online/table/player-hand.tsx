"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import type { PublicCard } from "@/components/online/types";

type PlayerHandProps = {
  cards: PublicCard[];
  renderCard: (card: PublicCard) => ReactNode;
  sourceLabel?: string;
};

export function PlayerHand({ cards, renderCard, sourceLabel = "Your cards" }: PlayerHandProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="min-w-0 rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{sourceLabel}</p>
      <div className="mt-4 flex max-w-full snap-x items-end gap-2 overflow-x-auto overscroll-x-contain px-1 pb-2 pt-4 [scrollbar-width:thin]">
        {cards.length > 0 ? (
          cards.map((card, index) => {
            const center = (cards.length - 1) / 2;
            const delta = index - center;

            return (
              <motion.div
                key={card.id}
                className="shrink-0 snap-start"
                layout
                initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
                animate={
                  reduceMotion
                    ? undefined
                    : {
                        opacity: 1,
                        y: Math.abs(delta) > 1 ? 3 : 0,
                        rotate: delta * 1.5,
                      }
                }
                transition={{ type: "spring", stiffness: 280, damping: 24 }}
                style={{ transformOrigin: "center bottom" }}
              >
                {renderCard(card)}
              </motion.div>
            );
          })
        ) : (
          <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">No playable cards in hand.</p>
        )}
      </div>
    </div>
  );
}
