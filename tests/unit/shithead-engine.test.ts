import assert from "node:assert/strict";
import test from "node:test";

import {
  applyMove,
  chooseStartingPlayerSeatIndexAfterSwap,
  createInitialGameState,
  getEffectivePileState,
  getLegalMoves,
  type Card,
  type GameState,
  type PlayerGameState,
} from "@/lib/online/shithead-engine";

function card(id: string, rank: Card["rank"]): Card {
  return {
    id,
    rank,
    suit: "C",
  };
}

function player(userId: string, seatIndex: number, hand: Card[], faceUp: Card[] = [], faceDown: Card[] = []): PlayerGameState {
  return {
    userId,
    seatIndex,
    hand,
    tableFaceUp: faceUp,
    tableFaceDown: faceDown,
    isOut: false,
    isLoser: false,
    placement: null,
    finishedAtTurn: null,
  };
}

function state(input: Partial<GameState> & { players: PlayerGameState[] }): GameState {
  return {
    players: input.players,
    drawPile: input.drawPile ?? [],
    discardPile: input.discardPile ?? [],
    burnedCards: input.burnedCards ?? [],
    burnedPileHistory: input.burnedPileHistory ?? [],
    currentPlayerSeatIndex: input.currentPlayerSeatIndex ?? 0,
    turnNumber: input.turnNumber ?? 1,
    phase: input.phase ?? "active",
    eliminationOrder: input.eliminationOrder ?? [],
    loserUserId: input.loserUserId ?? null,
  };
}

test("starting player picks lowest hand rank and resolves ties by seat order", () => {
  const game = state({
    phase: "swap",
    players: [
      player("u1", 0, [card("A1", "4"), card("A2", "9"), card("A3", "K")]),
      player("u2", 1, [card("B1", "3"), card("B2", "A"), card("B3", "2")]),
      player("u3", 2, [card("C1", "3"), card("C2", "7"), card("C3", "8")]),
    ],
  });

  assert.equal(chooseStartingPlayerSeatIndexAfterSwap(game), 1);
});

test("debug short deck keeps 3/3/3 setup but trims draw pile", () => {
  const full = createInitialGameState(["u1", "u2"]);
  const short = createInitialGameState(["u1", "u2"], undefined, { debugShortDeck: true });

  assert.equal(short.players[0].hand.length, 3);
  assert.equal(short.players[0].tableFaceUp.length, 3);
  assert.equal(short.players[0].tableFaceDown.length, 3);
  assert.equal(short.players[1].hand.length, 3);
  assert.equal(short.players[1].tableFaceUp.length, 3);
  assert.equal(short.players[1].tableFaceDown.length, 3);
  assert.equal(short.drawPile.length <= 10, true);
  assert.equal(short.drawPile.length < full.drawPile.length, true);
});

test("2 resets effective restriction", () => {
  const effective = getEffectivePileState([card("x1", "9"), card("x2", "2")]);
  assert.equal(effective.rankRestriction, null);
  assert.equal(effective.resetByTwo, true);
});

test("10 burns pile and same player keeps turn", () => {
  const game = state({
    players: [player("u1", 0, [card("h10", "10")]), player("u2", 1, [card("o1", "9")])],
    discardPile: [card("d1", "6")],
    currentPlayerSeatIndex: 0,
  });

  const result = applyMove(game, "u1", { type: "play", cardIds: ["h10"] });

  assert.equal(result.burned, true);
  assert.equal(result.state.discardPile.length, 0);
  assert.equal(result.state.currentPlayerSeatIndex, 0);
  assert.deepEqual(
    result.burnedPileCards?.map((entry) => entry.id),
    ["d1", "h10"],
  );
});

test("7 enforces seven-or-lower, preserved through transparent 3", () => {
  const game = state({
    players: [player("u1", 0, [card("h3", "3"), card("h4", "4")]), player("u2", 1, [card("h9", "9"), card("h7", "7")])],
    discardPile: [card("d7", "7")],
    currentPlayerSeatIndex: 0,
  });

  const afterThree = applyMove(game, "u1", { type: "play", cardIds: ["h3"] }).state;
  const legal = getLegalMoves(afterThree);

  assert.equal(legal.some((move) => move.type === "play" && move.cardIds.includes("h9")), false);
  assert.equal(legal.some((move) => move.type === "play" && move.cardIds.includes("h7")), true);
});

test("8 skips next player", () => {
  const game = state({
    players: [
      player("u1", 0, [card("h8", "8")]),
      player("u2", 1, [card("x1", "5")]),
      player("u3", 2, [card("x2", "6")]),
    ],
    currentPlayerSeatIndex: 0,
  });

  const result = applyMove(game, "u1", { type: "play", cardIds: ["h8"] });
  assert.equal(result.state.currentPlayerSeatIndex, 2);
});

test("in two-player game, 8 gives same player another turn", () => {
  const game = state({
    players: [player("u1", 0, [card("h8", "8")]), player("u2", 1, [card("x1", "5")])],
    currentPlayerSeatIndex: 0,
  });

  const result = applyMove(game, "u1", { type: "play", cardIds: ["h8"] });
  assert.equal(result.state.currentPlayerSeatIndex, 0);
});

test("8 then 3 still causes skip", () => {
  const game = state({
    players: [
      player("u1", 0, [card("h3", "3")]),
      player("u2", 1, [card("x1", "5")]),
      player("u3", 2, [card("x2", "6")]),
    ],
    discardPile: [card("d8", "8")],
    currentPlayerSeatIndex: 0,
  });

  const result = applyMove(game, "u1", { type: "play", cardIds: ["h3"] });
  assert.equal(result.state.currentPlayerSeatIndex, 2);
});

test("four of a kind burns including four 3s", () => {
  const game = state({
    players: [player("u1", 0, [card("h3", "3")]), player("u2", 1, [card("x1", "9")])],
    discardPile: [card("d1", "3"), card("d2", "3"), card("d3", "3")],
    currentPlayerSeatIndex: 0,
  });

  const result = applyMove(game, "u1", { type: "play", cardIds: ["h3"] });
  assert.equal(result.burned, true);
  assert.equal(result.state.discardPile.length, 0);
});

test("direct 4-of-a-kind can burn regardless of discard restriction", () => {
  const game = state({
    players: [
      player("u1", 0, [card("h4a", "4"), card("h4b", "4"), card("h4c", "4"), card("h4d", "4")]),
      player("u2", 1, [card("x1", "9")]),
    ],
    discardPile: [card("topK", "K")],
    currentPlayerSeatIndex: 0,
  });

  const legal = getLegalMoves(game);
  assert.equal(
    legal.some(
      (move) =>
        move.type === "play" &&
        move.cardIds.length === 4 &&
        move.cardIds.includes("h4a") &&
        move.cardIds.includes("h4b") &&
        move.cardIds.includes("h4c") &&
        move.cardIds.includes("h4d"),
    ),
    true,
  );

  const result = applyMove(game, "u1", { type: "play", cardIds: ["h4a", "h4b", "h4c", "h4d"] });

  assert.equal(result.burned, true);
  assert.equal(result.state.currentPlayerSeatIndex, 0);
  assert.deepEqual(result.state.discardPile.map((entry) => entry.id), ["topK"]);
  assert.deepEqual(result.burnedPileCards?.map((entry) => entry.id), ["h4a", "h4b", "h4c", "h4d"]);
  assert.deepEqual(result.state.burnedPileHistory.at(-1)?.map((entry) => entry.id), ["h4a", "h4b", "h4c", "h4d"]);
});

test("off-turn throw-in can complete four and burns pile, skipping turn order", () => {
  const game = state({
    players: [
      player("u1", 0, [card("a1", "9")]),
      player("u2", 1, [card("b1", "6")]),
      player("u3", 2, [card("c5a", "5"), card("c5b", "5")]),
    ],
    drawPile: [],
    discardPile: [card("d5a", "5"), card("d5b", "5")],
    currentPlayerSeatIndex: 1,
  });

  const legalForU3 = getLegalMoves(game, "u3");
  assert.equal(
    legalForU3.some((move) => move.type === "play" && move.cardIds.length === 2 && move.cardIds.includes("c5a") && move.cardIds.includes("c5b")),
    true,
  );

  const result = applyMove(game, "u3", { type: "play", cardIds: ["c5a", "c5b"] });

  assert.equal(result.burned, true);
  assert.equal(result.state.currentPlayerSeatIndex, 2);
  assert.equal(result.state.discardPile.length, 0);
  assert.deepEqual(result.burnedPileCards?.map((entry) => entry.id), ["d5a", "d5b", "c5a", "c5b"]);
});

test("off-turn throw-in allows transparent 3 between matching top cards", () => {
  const game = state({
    players: [
      player("u1", 0, [card("a1", "9")]),
      player("u2", 1, [card("b1", "6")]),
      player("u3", 2, [card("c5a", "5"), card("c5b", "5")]),
    ],
    drawPile: [],
    discardPile: [card("d5a", "5"), card("d3", "3"), card("d5b", "5")],
    currentPlayerSeatIndex: 1,
  });

  const legalForU3 = getLegalMoves(game, "u3");
  assert.equal(
    legalForU3.some((move) => move.type === "play" && move.cardIds.length === 2 && move.cardIds.includes("c5a") && move.cardIds.includes("c5b")),
    true,
  );
});

test("pickup takes entire pile and same player starts new pile", () => {
  const game = state({
    players: [player("u1", 0, [card("h9", "9")]), player("u2", 1, [card("x1", "4")])],
    discardPile: [card("d1", "K"), card("d2", "A")],
    currentPlayerSeatIndex: 0,
  });

  const result = applyMove(game, "u1", { type: "pickup" });
  assert.equal(result.state.discardPile.length, 0);
  assert.equal(result.state.players[0].hand.length, 3);
  assert.equal(result.state.currentPlayerSeatIndex, 0);
});

test("after hand play, refill to three while draw remains", () => {
  const game = state({
    players: [player("u1", 0, [card("h5", "5"), card("h6", "6"), card("h7", "7")]), player("u2", 1, [card("x1", "4")])],
    drawPile: [card("d1", "A"), card("d2", "2")],
    currentPlayerSeatIndex: 0,
  });

  const result = applyMove(game, "u1", { type: "play", cardIds: ["h5"] });
  assert.equal(result.state.players[0].hand.length, 3);
  assert.equal(result.state.drawPile.length, 1);
});

test("turn source transitions to face-up when hand empty and stock empty", () => {
  const game = state({
    players: [player("u1", 0, [], [card("fu1", "6"), card("fu2", "8")]), player("u2", 1, [card("x1", "4")])],
    drawPile: [],
    currentPlayerSeatIndex: 0,
  });

  const legal = getLegalMoves(game);
  assert.equal(legal.some((move) => move.type === "play"), true);
  assert.equal(legal.some((move) => move.type === "pickup"), false);
});

test("face-up player with no legal play can pickup pile without consuming face-up card", () => {
  const game = state({
    players: [player("u1", 0, [], [card("fu1", "4"), card("fu2", "5")]), player("u2", 1, [card("x1", "9")])],
    drawPile: [],
    discardPile: [card("d1", "K")],
    currentPlayerSeatIndex: 0,
  });

  const legal = getLegalMoves(game);
  assert.equal(legal.some((move) => move.type === "play"), false);
  assert.equal(legal.some((move) => move.type === "pickup"), true);

  const result = applyMove(game, "u1", { type: "pickup" });
  const current = result.state.players.find((entry) => entry.userId === "u1");

  assert.equal(result.pickedUp, true);
  assert.equal(result.state.discardPile.length, 0);
  assert.equal(current?.tableFaceUp.length, 2);
  assert.equal(current?.hand.some((entry) => entry.id === "d1"), true);
});

test("duplicate same-rank hand cards allow either single card play", () => {
  const game = state({
    players: [
      player("u1", 0, [card("h7a", "7"), card("h7b", "7")]),
      player("u2", 1, [card("x1", "4")]),
    ],
    currentPlayerSeatIndex: 0,
  });

  const legal = getLegalMoves(game);

  assert.equal(legal.some((move) => move.type === "play" && move.cardIds.length === 1 && move.cardIds[0] === "h7a"), true);
  assert.equal(legal.some((move) => move.type === "play" && move.cardIds.length === 1 && move.cardIds[0] === "h7b"), true);
});

test("when stock is empty and hand is single-rank, play can combine hand and matching face-up cards", () => {
  const game = state({
    players: [
      player("u1", 0, [card("h3a", "3"), card("h3b", "3")], [card("f3", "3"), card("f9", "9")]),
      player("u2", 1, [card("x1", "4")]),
    ],
    drawPile: [],
    currentPlayerSeatIndex: 0,
  });

  const legal = getLegalMoves(game);
  assert.equal(legal.some((move) => move.type === "play" && move.cardIds.length === 3 && move.cardIds.includes("h3a") && move.cardIds.includes("h3b") && move.cardIds.includes("f3")), true);

  const result = applyMove(game, "u1", { type: "play", cardIds: ["h3a", "h3b", "f3"] });
  const current = result.state.players.find((entry) => entry.userId === "u1");

  assert.equal(current?.hand.length, 0);
  assert.equal(current?.tableFaceUp.some((entry) => entry.id === "f3"), false);
  assert.equal(current?.tableFaceUp.some((entry) => entry.id === "f9"), true);
});

test("blind face-down illegal card forces pickup including flipped card", () => {
  const game = state({
    players: [player("u1", 0, [], [], [card("fd1", "4")]), player("u2", 1, [card("x1", "9")])],
    drawPile: [],
    discardPile: [card("top", "K")],
    currentPlayerSeatIndex: 0,
  });

  const result = applyMove(game, "u1", { type: "blind_play" }, () => 0);
  assert.equal(result.pickedUp, true);
  assert.equal(result.revealedBlindCard?.id, "fd1");
  assert.equal(result.state.players[0].hand.some((entry) => entry.id === "fd1"), true);
  assert.equal(result.state.currentPlayerSeatIndex, 0);
});

test("player elimination and last player loses", () => {
  const game = state({
    players: [
      player("u1", 0, [card("win", "5")]),
      player("u2", 1, [card("lose", "4")]),
    ],
    drawPile: [],
    currentPlayerSeatIndex: 0,
  });

  const afterFirst = applyMove(game, "u1", { type: "play", cardIds: ["win"] }).state;

  assert.equal(afterFirst.phase, "finished");
  assert.equal(afterFirst.loserUserId, "u2");
  assert.equal(afterFirst.players.find((entry) => entry.userId === "u1")?.isOut, true);
});
