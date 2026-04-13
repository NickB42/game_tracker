"use client";

import { useDroppable } from "@dnd-kit/core";
import { motion } from "motion/react";
import { useState } from "react";

import { CardView } from "@/components/online/table/card-view";
import { DISCARD_DROP_ZONE_ID } from "@/components/online/table/discard-pile-drop-zone";

type DiscardCard = {
  id: string;
  rank: string;
  suit: string;
};

type CenterPilesPanelProps = {
  drawCount: number;
  discardPile: DiscardCard[];
  enabled: boolean;
  isLegalDragOver: boolean;
  isPulseActive: boolean;
  burnedPileHistory: Array<Array<{ id: string; rank: string; suit: string }>>;
};

export function CenterPilesPanel({ drawCount, discardPile, enabled, isLegalDragOver, isPulseActive, burnedPileHistory }: CenterPilesPanelProps) {
  const [showExtendedHistory, setShowExtendedHistory] = useState(false);
  const { setNodeRef, isOver } = useDroppable({
    id: DISCARD_DROP_ZONE_ID,
    disabled: !enabled,
  });

  const topDiscard = discardPile[discardPile.length - 1];
  const recentHistory = discardPile.slice(-8);
  const dropActive = enabled && (isOver || isLegalDragOver);
  const burnedPileRows = burnedPileHistory.slice(-10).reverse();

  return (
    <motion.div
      animate={{
        boxShadow: isPulseActive
          ? "0 0 0 3px rgba(16,185,129,0.18), 0 14px 30px -18px rgba(16,185,129,0.85)"
          : "0 8px 24px -20px rgba(24,24,27,0.45)",
      }}
      className="rounded-2xl border border-zinc-200 bg-white/95 p-3"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Table piles</p>
        <p className="text-xs text-zinc-500">Draw: {drawCount} | Discard: {discardPile.length}</p>
      </div>

      <div className="mt-3 flex items-center justify-center gap-6 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3">
        <div className="flex flex-col items-center gap-1">
          {drawCount > 0 ? <CardView isFaceDown size="sm" isDisabled /> : <div className="h-20 w-14 rounded-lg border border-dashed border-zinc-300" />}
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Draw</p>
        </div>

        <div
          ref={setNodeRef}
          className={[
            "flex flex-col items-center gap-1 rounded-lg p-1.5 transition",
            dropActive ? "bg-emerald-100/70 ring-2 ring-emerald-400" : "",
          ].join(" ")}
        >
          {topDiscard ? <CardView rank={topDiscard.rank} suit={topDiscard.suit} size="sm" isDisabled /> : <div className="h-20 w-14 rounded-lg border border-dashed border-zinc-300" />}
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Discard</p>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50/50 p-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Discard history</p>
          <button
            type="button"
            onClick={() => setShowExtendedHistory((current) => !current)}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100"
          >
            {showExtendedHistory ? "Hide extended" : "Show extended"}
          </button>
        </div>
        <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
          {recentHistory.length > 0 ? (
            recentHistory.map((card, index) => (
              <div key={card.id} className={index === recentHistory.length - 1 ? "rounded-md ring-2 ring-emerald-300" : ""}>
                <CardView rank={card.rank} suit={card.suit} size="sm" isDisabled />
              </div>
            ))
          ) : (
            <span className="text-xs text-zinc-400">No cards in discard yet.</span>
          )}
        </div>

        {showExtendedHistory ? (
          <div className="mt-2 space-y-1 rounded-lg border border-zinc-200 bg-white p-2">
            {burnedPileRows.length > 0 ? (
              burnedPileRows.map((pile, pileIndex) => (
                <div key={`burned-pile-${pileIndex}`} className="flex flex-wrap items-center gap-1.5">
                    {pile.map((card, index) => (
                      <CardView key={`burned-card-${pileIndex}-${card.id}-${index}`} rank={card.rank} suit={card.suit} size="sm" isDisabled />
                    ))}
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-500">No piles burned in this round.</p>
            )}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
