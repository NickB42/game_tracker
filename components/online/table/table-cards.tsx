"use client";

import { CardView } from "@/components/online/table/card-view";
import type { PublicCard } from "@/components/online/types";

type TableCardsProps = {
  faceUpCards: PublicCard[];
  faceDownCount: number;
};

export function TableCards({ faceUpCards, faceDownCount }: TableCardsProps) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-xs uppercase tracking-wide text-zinc-500">Face-up table cards</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {faceUpCards.length > 0 ? (
            faceUpCards.map((card) => <CardView key={card.id} rank={card.rank} suit={card.suit} size="sm" isDisabled />)
          ) : (
            <span className="text-xs text-zinc-400">none</span>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-zinc-500">Face-down</p>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {faceDownCount > 0 ? Array.from({ length: faceDownCount }).map((_, index) => <CardView key={`fd-${index}`} isFaceDown size="sm" isDisabled />) : <span className="text-xs text-zinc-400">none</span>}
        </div>
      </div>
    </div>
  );
}
