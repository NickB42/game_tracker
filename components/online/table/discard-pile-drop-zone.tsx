"use client";

import { useDroppable } from "@dnd-kit/core";

import { CardStack } from "@/components/online/table/card-stack";

type DiscardPileDropZoneProps = {
  count: number;
  topRank?: string;
  topSuit?: string;
  enabled: boolean;
  isLegalDragOver?: boolean;
  isPulseActive?: boolean;
};

export const DISCARD_DROP_ZONE_ID = "discard-pile-dropzone";

export function DiscardPileDropZone({ count, topRank, topSuit, enabled, isLegalDragOver = false, isPulseActive = false }: DiscardPileDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: DISCARD_DROP_ZONE_ID,
    disabled: !enabled,
  });

  const dropActive = enabled && (isOver || isLegalDragOver);

  return (
    <div ref={setNodeRef}>
      <CardStack
        count={count}
        label="Discard pile"
        topRank={topRank}
        topSuit={topSuit}
        faceDown={false}
        isDropActive={dropActive}
        isPulseActive={isPulseActive}
      />
    </div>
  );
}
