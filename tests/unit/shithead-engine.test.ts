import assert from "node:assert/strict";
import test from "node:test";

import {
  applyMove,
  chooseStartingPlayerSeatIndexAfterSwap,
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
  assert.equal(legal.some((move) => move.type === "face_up_pickup"), true);
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
