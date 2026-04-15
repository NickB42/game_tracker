import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCardIndex,
  canDragCard,
  dropIntentAccepted,
  getLegalPlayKeySet,
  getPlayableCardIds,
  getSelectedPlayMove,
  playKey,
  shouldShowHandCards,
  toggleSameRankSelection,
} from "@/lib/online/ui-model";

const cards = [
  { id: "c1", rank: "7", suit: "H" },
  { id: "c2", rank: "7", suit: "S" },
  { id: "c3", rank: "K", suit: "D" },
];

test("selection allows equal-rank grouping", () => {
  const index = buildCardIndex(cards);

  const first = toggleSameRankSelection({
    selectedCardIds: [],
    clickedCardId: "c1",
    cardsById: index,
  });

  const second = toggleSameRankSelection({
    selectedCardIds: first,
    clickedCardId: "c2",
    cardsById: index,
  });

  assert.deepEqual(second, ["c1", "c2"]);
});

test("selection replaces when mixed-rank card is clicked", () => {
  const index = buildCardIndex(cards);

  const selected = toggleSameRankSelection({
    selectedCardIds: ["c1"],
    clickedCardId: "c3",
    cardsById: index,
  });

  assert.deepEqual(selected, ["c3"]);
});

test("legal move selection must match server legal play key", () => {
  const legalPlayKeys = getLegalPlayKeySet([
    { type: "play", cardIds: ["c1"] },
    { type: "play", cardIds: ["c1", "c2"] },
    { type: "pickup" },
  ]);

  assert.equal(getSelectedPlayMove(["c1", "c2"], legalPlayKeys)?.type, "play");
  assert.equal(getSelectedPlayMove(["c1", "c3"], legalPlayKeys), null);
});

test("only legal cards can be dragged and only on active turn", () => {
  const legalMoves = [{ type: "play", cardIds: ["c1"] }, { type: "play", cardIds: ["c1", "c2"] }] as const;
  const legalPlayKeys = getLegalPlayKeySet(legalMoves);
  const playableCardIds = getPlayableCardIds(legalMoves);

  assert.equal(
    canDragCard({
      cardId: "c1",
      canPlayNow: true,
      isSubmitting: false,
      selectedCardIds: ["c1", "c2"],
      legalPlayKeys,
      playableCardIds,
    }),
    true,
  );

  assert.equal(
    canDragCard({
      cardId: "c3",
      canPlayNow: true,
      isSubmitting: false,
      selectedCardIds: [],
      legalPlayKeys,
      playableCardIds,
    }),
    false,
  );

  assert.equal(
    canDragCard({
      cardId: "c1",
      canPlayNow: false,
      isSubmitting: false,
      selectedCardIds: [],
      legalPlayKeys,
      playableCardIds,
    }),
    false,
  );
});

test("drop zone only accepts valid play intents", () => {
  const legalPlayKeys = new Set([playKey(["c1"])]);

  assert.equal(dropIntentAccepted({ intent: { type: "play", cardIds: ["c1"] }, legalPlayKeys }), true);
  assert.equal(dropIntentAccepted({ intent: { type: "play", cardIds: ["c2"] }, legalPlayKeys }), false);
  assert.equal(dropIntentAccepted({ intent: { type: "pickup" }, legalPlayKeys }), false);
});

test("hidden hand rendering rule only reveals own hand", () => {
  assert.equal(shouldShowHandCards("me", "me"), true);
  assert.equal(shouldShowHandCards("other", "me"), false);
});
