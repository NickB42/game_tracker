import type { PublicCard } from "@/components/online/types";

type LegalMove =
  | { type: "play"; cardIds: readonly string[] }
  | { type: "pickup" }
  | { type: "blind_play" };

export function playKey(cardIds: readonly string[]): string {
  return cardIds.slice().sort().join("|");
}

export function getLegalPlayKeySet(legalMoves: readonly LegalMove[] | undefined): Set<string> {
  const keys = new Set<string>();

  if (!legalMoves) {
    return keys;
  }

  for (const move of legalMoves) {
    if (move.type === "play") {
      keys.add(playKey(move.cardIds));
    }
  }

  return keys;
}

export function getPlayableCardIds(legalMoves: readonly LegalMove[] | undefined): Set<string> {
  const ids = new Set<string>();

  if (!legalMoves) {
    return ids;
  }

  for (const move of legalMoves) {
    if (move.type === "play") {
      for (const cardId of move.cardIds) {
        ids.add(cardId);
      }
    }
  }

  return ids;
}

export function buildCardIndex(cards: PublicCard[]): Map<string, PublicCard> {
  return new Map(cards.map((card) => [card.id, card]));
}

export function toggleSameRankSelection(input: {
  selectedCardIds: string[];
  clickedCardId: string;
  cardsById: Map<string, PublicCard>;
}): string[] {
  const { selectedCardIds, clickedCardId, cardsById } = input;
  const clicked = cardsById.get(clickedCardId);

  if (!clicked) {
    return selectedCardIds;
  }

  if (selectedCardIds.length === 0) {
    return [clickedCardId];
  }

  const isSelected = selectedCardIds.includes(clickedCardId);

  if (isSelected) {
    return selectedCardIds.filter((id) => id !== clickedCardId);
  }

  const firstSelected = cardsById.get(selectedCardIds[0]);

  if (!firstSelected) {
    return [clickedCardId];
  }

  if (firstSelected.rank !== clicked.rank) {
    return [clickedCardId];
  }

  return [...selectedCardIds, clickedCardId];
}

export function getSelectedPlayMove(selectedCardIds: string[], legalPlayKeys: Set<string>) {
  if (selectedCardIds.length === 0) {
    return null;
  }

  const key = playKey(selectedCardIds);

  if (!legalPlayKeys.has(key)) {
    return null;
  }

  return {
    type: "play" as const,
    cardIds: selectedCardIds,
  };
}

export function canDragCard(input: {
  cardId: string;
  canPlayNow: boolean;
  isSubmitting: boolean;
  selectedCardIds: string[];
  legalPlayKeys: Set<string>;
  playableCardIds: Set<string>;
}): boolean {
  const { cardId, canPlayNow, isSubmitting, selectedCardIds, legalPlayKeys, playableCardIds } = input;

  if (!canPlayNow || isSubmitting) {
    return false;
  }

  if (!playableCardIds.has(cardId)) {
    return false;
  }

  if (selectedCardIds.length > 0 && selectedCardIds.includes(cardId)) {
    return legalPlayKeys.has(playKey(selectedCardIds));
  }

  return legalPlayKeys.has(playKey([cardId]));
}

export function dropIntentAccepted(input: {
  intent: unknown;
  legalPlayKeys: Set<string>;
}): boolean {
  const { intent, legalPlayKeys } = input;

  if (!intent || typeof intent !== "object") {
    return false;
  }

  const candidate = intent as { type?: unknown; cardIds?: unknown };

  if (candidate.type !== "play" || !Array.isArray(candidate.cardIds)) {
    return false;
  }

  if (!candidate.cardIds.every((cardId) => typeof cardId === "string")) {
    return false;
  }

  return legalPlayKeys.has(playKey(candidate.cardIds));
}

export function shouldShowHandCards(playerUserId: string, viewerUserId: string): boolean {
  return playerUserId === viewerUserId;
}
