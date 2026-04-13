"use client";

import { CardStack } from "@/components/online/table/card-stack";

type DrawPileProps = {
  count: number;
};

export function DrawPile({ count }: DrawPileProps) {
  return <CardStack count={count} label="Draw pile" faceDown />;
}
