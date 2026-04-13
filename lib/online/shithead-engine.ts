import { randomInt } from "node:crypto";

export const RANKS_ASC = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"] as const;
export const SUITS = ["C", "D", "H", "S"] as const;

export type CardRank = (typeof RANKS_ASC)[number];
export type CardSuit = (typeof SUITS)[number];

export type Card = {
  id: string;
  rank: CardRank;
  suit: CardSuit;
};

export type TurnSource = "hand" | "face_up" | "face_down_blind";

export type PlayerGameState = {
  userId: string;
  seatIndex: number;
  hand: Card[];
  tableFaceUp: Card[];
  tableFaceDown: Card[];
  isOut: boolean;
  isLoser: boolean;
  placement: number | null;
  finishedAtTurn: number | null;
};

export type EffectivePileState = {
  rankRestriction: CardRank | null;
  sevenRuleActive: boolean;
  resetByTwo: boolean;
  latestEffectiveRank: CardRank | null;
};

export type GameState = {
  players: PlayerGameState[];
  drawPile: Card[];
  discardPile: Card[];
  burnedCards: Card[];
  burnedPileHistory: Card[][];
  currentPlayerSeatIndex: number;
  turnNumber: number;
  phase: "swap" | "active" | "finished";
  eliminationOrder: string[];
  loserUserId: string | null;
};

export type PlayerMove =
  | { type: "play"; cardIds: string[] }
  | { type: "pickup" }
  | { type: "blind_play" };

export type LegalMove =
  | { type: "play"; cardIds: string[] }
  | { type: "pickup" }
  | { type: "blind_play" };

export type MoveResolution = {
  state: GameState;
  events: string[];
  burned: boolean;
  pickedUp: boolean;
  nextTurnSeatIndex: number;
  revealedBlindCard?: Card;
  playedCards?: Card[];
  burnedPileCards?: Card[];
};

const rankIndex = new Map<CardRank, number>(RANKS_ASC.map((rank, index) => [rank, index]));

function compareRankAsc(a: CardRank, b: CardRank): number {
  return (rankIndex.get(a) ?? 0) - (rankIndex.get(b) ?? 0);
}

function isAlwaysPlayable(rank: CardRank): boolean {
  return rank === "2" || rank === "3" || rank === "10";
}

function cloneCard(card: Card): Card {
  return { ...card };
}

function clonePlayer(player: PlayerGameState): PlayerGameState {
  return {
    ...player,
    hand: player.hand.map(cloneCard),
    tableFaceUp: player.tableFaceUp.map(cloneCard),
    tableFaceDown: player.tableFaceDown.map(cloneCard),
  };
}

export function cloneState(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map(clonePlayer),
    drawPile: state.drawPile.map(cloneCard),
    discardPile: state.discardPile.map(cloneCard),
    burnedCards: state.burnedCards.map(cloneCard),
    burnedPileHistory: state.burnedPileHistory.map((pile) => pile.map(cloneCard)),
    eliminationOrder: [...state.eliminationOrder],
  };
}

export function createDeck(): Card[] {
  const deck: Card[] = [];

  for (const rank of RANKS_ASC) {
    for (const suit of SUITS) {
      deck.push({ id: `${rank}${suit}`, rank, suit });
    }
  }

  return deck;
}

export function shuffleDeck(deck: Card[], randomFn: (maxExclusive: number) => number = (max) => randomInt(max)): Card[] {
  const shuffled = [...deck];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomFn(index + 1);
    const current = shuffled[index];
    shuffled[index] = shuffled[swapIndex];
    shuffled[swapIndex] = current;
  }

  return shuffled;
}

function assertPlayerCount(userIds: string[]) {
  if (userIds.length < 2 || userIds.length > 5) {
    throw new Error("Online Shithead supports 2 to 5 players.");
  }

  if (new Set(userIds).size !== userIds.length) {
    throw new Error("Duplicate users are not allowed in one game.");
  }
}

type CreateInitialGameStateOptions = {
  debugShortDeck?: boolean;
};

export function createInitialGameState(
  userIdsInSeatOrder: string[],
  randomFn?: (maxExclusive: number) => number,
  options?: CreateInitialGameStateOptions,
): GameState {
  assertPlayerCount(userIdsInSeatOrder);

  const deck = shuffleDeck(createDeck(), randomFn);
  const players: PlayerGameState[] = [];

  let cursor = 0;

  for (let seatIndex = 0; seatIndex < userIdsInSeatOrder.length; seatIndex += 1) {
    const userId = userIdsInSeatOrder[seatIndex];

    const faceDown = deck.slice(cursor, cursor + 3);
    cursor += 3;
    const faceUp = deck.slice(cursor, cursor + 3);
    cursor += 3;
    const hand = deck.slice(cursor, cursor + 3);
    cursor += 3;

    players.push({
      userId,
      seatIndex,
      hand,
      tableFaceUp: faceUp,
      tableFaceDown: faceDown,
      isOut: false,
      isLoser: false,
      placement: null,
      finishedAtTurn: null,
    });
  }

  const defaultDrawPile = deck.slice(cursor);
  const drawPile = options?.debugShortDeck ? defaultDrawPile.slice(0, 10) : defaultDrawPile;

  return {
    players,
    drawPile,
    discardPile: [],
    burnedCards: [],
    burnedPileHistory: [],
    currentPlayerSeatIndex: 0,
    turnNumber: 1,
    phase: "swap",
    eliminationOrder: [],
    loserUserId: null,
  };
}

export function applySwapForPlayer(
  state: GameState,
  userId: string,
  handCardIds: string[],
  faceUpCardIds: string[],
): GameState {
  if (state.phase !== "swap") {
    throw new Error("Swaps are only allowed during the swap phase.");
  }

  if (handCardIds.length !== 3 || faceUpCardIds.length !== 3) {
    throw new Error("A player's hand and face-up sets must each contain exactly 3 cards after swap.");
  }

  const next = cloneState(state);
  const player = next.players.find((candidate) => candidate.userId === userId);

  if (!player) {
    throw new Error("Player not found.");
  }

  const all = [...player.hand, ...player.tableFaceUp];
  const byId = new Map(all.map((card) => [card.id, card]));

  const nextHand = handCardIds.map((id) => {
    const card = byId.get(id);
    if (!card) {
      throw new Error("Swap references unknown card id.");
    }
    return card;
  });

  const nextFaceUp = faceUpCardIds.map((id) => {
    const card = byId.get(id);
    if (!card) {
      throw new Error("Swap references unknown card id.");
    }
    return card;
  });

  const uniqueIds = new Set([...handCardIds, ...faceUpCardIds]);

  if (uniqueIds.size !== 6) {
    throw new Error("Swap must use each of the 6 visible cards exactly once.");
  }

  player.hand = nextHand;
  player.tableFaceUp = nextFaceUp;

  return next;
}

export function chooseStartingPlayerSeatIndexAfterSwap(state: GameState): number {
  if (state.players.length === 0) {
    throw new Error("Cannot choose starting player for empty game.");
  }

  let bestSeat = state.players[0].seatIndex;
  let bestRank = state.players[0].hand.reduce((lowest, card) =>
    compareRankAsc(card.rank, lowest) < 0 ? card.rank : lowest,
  state.players[0].hand[0]?.rank ?? "2");

  for (const player of state.players) {
    const lowestRank = player.hand.reduce((lowest, card) =>
      compareRankAsc(card.rank, lowest) < 0 ? card.rank : lowest,
    player.hand[0]?.rank ?? "2");

    const rankCmp = compareRankAsc(lowestRank, bestRank);

    if (rankCmp < 0 || (rankCmp === 0 && player.seatIndex < bestSeat)) {
      bestSeat = player.seatIndex;
      bestRank = lowestRank;
    }
  }

  return bestSeat;
}

export function startGameFromSwapState(state: GameState): GameState {
  if (state.phase !== "swap") {
    throw new Error("Game is already started.");
  }

  const next = cloneState(state);
  next.phase = "active";
  next.currentPlayerSeatIndex = chooseStartingPlayerSeatIndexAfterSwap(next);
  next.turnNumber = 1;
  return next;
}

function getPlayerBySeat(state: GameState, seatIndex: number): PlayerGameState {
  const player = state.players.find((candidate) => candidate.seatIndex === seatIndex);

  if (!player) {
    throw new Error("Player for seat index not found.");
  }

  return player;
}

function getCurrentPlayer(state: GameState): PlayerGameState {
  return getPlayerBySeat(state, state.currentPlayerSeatIndex);
}

function getTurnSource(state: GameState, player: PlayerGameState): TurnSource {
  if (player.hand.length > 0) {
    return "hand";
  }

  if (state.drawPile.length === 0 && player.tableFaceUp.length > 0) {
    return "face_up";
  }

  if (state.drawPile.length === 0 && player.tableFaceUp.length === 0 && player.tableFaceDown.length > 0) {
    return "face_down_blind";
  }

  return "hand";
}

function canCombineHandWithFaceUp(state: GameState, player: PlayerGameState): {
  enabled: boolean;
  handRank: CardRank | null;
} {
  if (state.drawPile.length > 0 || player.hand.length === 0 || player.tableFaceUp.length === 0) {
    return { enabled: false, handRank: null };
  }

  const handRank = player.hand[0]?.rank ?? null;

  if (!handRank) {
    return { enabled: false, handRank: null };
  }

  if (!player.hand.every((card) => card.rank === handRank)) {
    return { enabled: false, handRank: null };
  }

  const hasMatchingFaceUp = player.tableFaceUp.some((card) => card.rank === handRank);

  return {
    enabled: hasMatchingFaceUp,
    handRank,
  };
}

export function getEffectivePileState(discardPile: Card[]): EffectivePileState {
  let latestNonThree: Card | null = null;

  for (let index = discardPile.length - 1; index >= 0; index -= 1) {
    const card = discardPile[index];
    if (card.rank !== "3") {
      latestNonThree = card;
      break;
    }
  }

  if (!latestNonThree) {
    return {
      rankRestriction: null,
      sevenRuleActive: false,
      resetByTwo: false,
      latestEffectiveRank: null,
    };
  }

  if (latestNonThree.rank === "2") {
    return {
      rankRestriction: null,
      sevenRuleActive: false,
      resetByTwo: true,
      latestEffectiveRank: "2",
    };
  }

  if (latestNonThree.rank === "7") {
    return {
      rankRestriction: "7",
      sevenRuleActive: true,
      resetByTwo: false,
      latestEffectiveRank: "7",
    };
  }

  return {
    rankRestriction: latestNonThree.rank,
    sevenRuleActive: false,
    resetByTwo: false,
    latestEffectiveRank: latestNonThree.rank,
  };
}

function isCardLegalAgainstPile(card: Card, effectivePile: EffectivePileState): boolean {
  if (isAlwaysPlayable(card.rank)) {
    return true;
  }

  if (!effectivePile.rankRestriction) {
    return true;
  }

  if (effectivePile.sevenRuleActive) {
    return compareRankAsc(card.rank, "7") <= 0;
  }

  return compareRankAsc(card.rank, effectivePile.rankRestriction) >= 0;
}

function cardCombinationsByRank(cards: Card[]): Card[][] {
  const byRank = new Map<CardRank, Card[]>();

  for (const card of cards) {
    const existing = byRank.get(card.rank) ?? [];
    existing.push(card);
    byRank.set(card.rank, existing);
  }

  const combinations: Card[][] = [];

  function collectCombinations(cardsOfRank: Card[], size: number, start: number, selected: Card[]) {
    if (selected.length === size) {
      combinations.push([...selected]);
      return;
    }

    for (let index = start; index <= cardsOfRank.length - (size - selected.length); index += 1) {
      selected.push(cardsOfRank[index]);
      collectCombinations(cardsOfRank, size, index + 1, selected);
      selected.pop();
    }
  }

  for (const rankCards of byRank.values()) {
    for (let size = 1; size <= rankCards.length; size += 1) {
      collectCombinations(rankCards, size, 0, []);
    }
  }

  return combinations;
}

function combinationsOfSize(cards: Card[], size: number): Card[][] {
  const results: Card[][] = [];

  function collect(start: number, selected: Card[]) {
    if (selected.length === size) {
      results.push([...selected]);
      return;
    }

    for (let index = start; index <= cards.length - (size - selected.length); index += 1) {
      selected.push(cards[index]);
      collect(index + 1, selected);
      selected.pop();
    }
  }

  if (size <= 0 || size > cards.length) {
    return results;
  }

  collect(0, []);
  return results;
}

function getTopConnectedRankForThrowIn(discardPile: Card[]): { rank: CardRank; count: number } | null {
  if (discardPile.length === 0) {
    return null;
  }

  let anchorRank: CardRank | null = null;

  for (let index = discardPile.length - 1; index >= 0; index -= 1) {
    const card = discardPile[index];

    if (card.rank !== "3") {
      anchorRank = card.rank;
      break;
    }
  }

  if (!anchorRank) {
    return null;
  }

  let count = 0;

  for (let index = discardPile.length - 1; index >= 0; index -= 1) {
    const card = discardPile[index];

    if (card.rank === anchorRank) {
      count += 1;
      continue;
    }

    if (card.rank === "3") {
      continue;
    }

    break;
  }

  return {
    rank: anchorRank,
    count,
  };
}

function getThrowInPlayMoves(state: GameState, actingUserId: string): Array<{ type: "play"; cardIds: string[] }> {
  if (state.phase !== "active") {
    return [];
  }

  const currentPlayer = getCurrentPlayer(state);

  if (currentPlayer.userId === actingUserId) {
    return [];
  }

  const actingPlayer = state.players.find((player) => player.userId === actingUserId);

  if (!actingPlayer || actingPlayer.isOut || actingPlayer.isLoser || actingPlayer.hand.length === 0) {
    return [];
  }

  const connected = getTopConnectedRankForThrowIn(state.discardPile);

  if (!connected) {
    return [];
  }

  const needed = 4 - connected.count;

  if (needed <= 0 || needed > 4) {
    return [];
  }

  const matching = actingPlayer.hand.filter((card) => card.rank === connected.rank);

  if (matching.length < needed) {
    return [];
  }

  return combinationsOfSize(matching, needed).map((cards) => ({
    type: "play",
    cardIds: cards.map((card) => card.id),
  }));
}

function toMoveKey(cardIds: string[]): string {
  return cardIds.slice().sort().join("|");
}

export function getLegalMoves(state: GameState, actingUserId?: string): LegalMove[] {
  if (state.phase !== "active") {
    return [];
  }

  const currentPlayer = getCurrentPlayer(state);
  const targetUserId = actingUserId ?? currentPlayer.userId;

  if (targetUserId !== currentPlayer.userId) {
    return getThrowInPlayMoves(state, targetUserId);
  }

  const player = currentPlayer;

  if (player.isOut || player.isLoser) {
    return [];
  }

  const source = getTurnSource(state, player);
  const effectivePile = getEffectivePileState(state.discardPile);

  if (source === "face_down_blind") {
    return player.tableFaceDown.length > 0 ? [{ type: "blind_play" as const }] : [];
  }

  const combineMode = source === "hand" ? canCombineHandWithFaceUp(state, player) : { enabled: false, handRank: null as CardRank | null };
  const cards =
    source === "hand"
      ? combineMode.enabled && combineMode.handRank
        ? [...player.hand, ...player.tableFaceUp.filter((card) => card.rank === combineMode.handRank)]
        : player.hand
      : player.tableFaceUp;
  const handIds = new Set(player.hand.map((card) => card.id));
  const legal: LegalMove[] = [];
  const seen = new Set<string>();

  for (const combo of cardCombinationsByRank(cards)) {
    const representative = combo[0];
    const isDirectFourBurn = combo.length === 4;

    if (isDirectFourBurn || isCardLegalAgainstPile(representative, effectivePile)) {
      const cardIds = combo.map((card) => card.id);

      if (combineMode.enabled && !cardIds.some((id) => handIds.has(id))) {
        continue;
      }

      const key = toMoveKey(cardIds);

      if (!seen.has(key)) {
        seen.add(key);
        legal.push({ type: "play", cardIds });
      }
    }
  }

  if (source === "hand") {
    legal.push({ type: "pickup" });
  }

  if (source === "face_up") {
    const hasPlay = legal.some((move) => move.type === "play");

    if (!hasPlay) {
      legal.push({ type: "pickup" });
    }
  }

  return legal;
}

function removeCardsById(cards: Card[], cardIds: string[]): { removed: Card[]; remaining: Card[] } {
  const remaining = [...cards];
  const removed: Card[] = [];

  for (const cardId of cardIds) {
    const index = remaining.findIndex((card) => card.id === cardId);

    if (index < 0) {
      throw new Error("Move references card not owned by player.");
    }

    const [card] = remaining.splice(index, 1);
    removed.push(card);
  }

  return { removed, remaining };
}

function refillHandFromDraw(player: PlayerGameState, drawPile: Card[]): Card[] {
  let nextDrawPile = drawPile;

  while (player.hand.length < 3 && nextDrawPile.length > 0) {
    player.hand.push(nextDrawPile[0]);
    nextDrawPile = nextDrawPile.slice(1);
  }

  return nextDrawPile;
}

function topNAllSameRank(discardPile: Card[], count: number): boolean {
  if (discardPile.length < count) {
    return false;
  }

  const top = discardPile.slice(discardPile.length - count);
  const firstRank = top[0].rank;
  return top.every((card) => card.rank === firstRank);
}

export function advanceTurn(state: GameState, fromSeatIndex: number, skipCount: number): number {
  const activeSeats = state.players
    .filter((player) => !player.isOut && !player.isLoser)
    .map((player) => player.seatIndex)
    .sort((a, b) => a - b);

  if (activeSeats.length <= 1) {
    return fromSeatIndex;
  }

  const startIndex = activeSeats.indexOf(fromSeatIndex);

  if (startIndex < 0) {
    throw new Error("Current seat is not active.");
  }

  const steps = 1 + Math.max(skipCount, 0);
  const nextIndex = (startIndex + steps) % activeSeats.length;

  return activeSeats[nextIndex];
}

function maybeMarkEliminations(state: GameState): string[] {
  const events: string[] = [];

  for (const player of state.players) {
    if (player.isOut || player.isLoser) {
      continue;
    }

    const hasAnyCards = player.hand.length + player.tableFaceUp.length + player.tableFaceDown.length > 0;

    if (!hasAnyCards) {
      player.isOut = true;
      player.finishedAtTurn = state.turnNumber;
      state.eliminationOrder.push(player.userId);
      player.placement = state.eliminationOrder.length;
      events.push(`${player.userId} is out.`);
    }
  }

  const remaining = state.players.filter((player) => !player.isOut && !player.isLoser);

  if (remaining.length === 1) {
    const loser = remaining[0];
    loser.isLoser = true;
    loser.finishedAtTurn = state.turnNumber;
    loser.placement = state.players.length;
    state.loserUserId = loser.userId;
    state.phase = "finished";
    events.push(`${loser.userId} is the loser.`);
  }

  return events;
}

function assertSingleRank(cards: Card[]) {
  if (cards.length === 0) {
    throw new Error("At least one card must be played.");
  }

  const rank = cards[0].rank;

  if (!cards.every((card) => card.rank === rank)) {
    throw new Error("You may only play a set of equal-ranked cards.");
  }
}

function resolveSkipForMove(playedCards: Card[], previousEffective: EffectivePileState): number {
  const playedRank = playedCards[0]?.rank;

  if (!playedRank) {
    return 0;
  }

  if (playedRank === "8") {
    return 1;
  }

  if (playedRank === "3" && previousEffective.latestEffectiveRank === "8") {
    return 1;
  }

  return 0;
}

export function resolvePostPlayEffects(state: GameState, playedCards: Card[], previousEffective: EffectivePileState): {
  burned: boolean;
  skipCount: number;
  events: string[];
  burnedPileCards: Card[];
} {
  const events: string[] = [];

  const burnByTen = playedCards[0]?.rank === "10";
  const burnBySet = topNAllSameRank(state.discardPile, 4);
  const burned = burnByTen || burnBySet;

  if (burned) {
    const burnedPileCards = [...state.discardPile];
    state.burnedPileHistory.push([...burnedPileCards]);
    state.burnedCards.push(...state.discardPile);
    state.discardPile = [];
    events.push("Pile burned.");
    return {
      burned: true,
      skipCount: 0,
      events,
      burnedPileCards,
    };
  }

  const skipCount = resolveSkipForMove(playedCards, previousEffective);

  if (skipCount > 0) {
    events.push("Next player skipped.");
  }

  return {
    burned: false,
    skipCount,
    events,
    burnedPileCards: [],
  };
}

function requireActivePhase(state: GameState) {
  if (state.phase !== "active") {
    throw new Error("Game is not active.");
  }
}

function ensureCurrentPlayer(state: GameState, actingUserId: string): PlayerGameState {
  const player = getCurrentPlayer(state);

  if (player.userId !== actingUserId) {
    throw new Error("It is not your turn.");
  }

  return player;
}

export function applyMove(
  state: GameState,
  actingUserId: string,
  move: PlayerMove,
  randomFn: (maxExclusive: number) => number = (maxExclusive) => randomInt(maxExclusive),
): MoveResolution {
  requireActivePhase(state);

  const legalMoves = getLegalMoves(state, actingUserId);
  const legalKeys = new Set(
    legalMoves.map((legal) => {
      if (legal.type === "play") {
        return `play:${toMoveKey(legal.cardIds)}`;
      }

      if (legal.type === "blind_play") {
        return "blind";
      }

      return "pickup";
    }),
  );

  const moveKey = (() => {
    if (move.type === "play") {
      return `play:${toMoveKey(move.cardIds)}`;
    }

    if (move.type === "blind_play") {
      return "blind";
    }

    return "pickup";
  })();

  if (!legalKeys.has(moveKey)) {
    throw new Error("Illegal move.");
  }

  const next = cloneState(state);
  const currentPlayer = getCurrentPlayer(next);

  if (currentPlayer.userId !== actingUserId) {
    if (move.type !== "play") {
      throw new Error("It is not your turn.");
    }

    const player = next.players.find((entry) => entry.userId === actingUserId);

    if (!player) {
      throw new Error("Player not found.");
    }

    const { removed, remaining } = removeCardsById(player.hand, move.cardIds);
    assertSingleRank(removed);

    player.hand = remaining;

    const burnedPileCards = [...next.discardPile, ...removed];
    next.burnedCards.push(...burnedPileCards);
    next.burnedPileHistory.push([...burnedPileCards]);
    next.discardPile = [];
    next.drawPile = refillHandFromDraw(player, next.drawPile);
    next.currentPlayerSeatIndex = player.seatIndex;
    next.turnNumber += 1;

    const events: string[] = [];
    events.push(`${actingUserId} threw in ${removed.length}x ${removed[0].rank} and burned the pile.`);
    events.push("Pile burned.");
    events.push(...maybeMarkEliminations(next));

    return {
      state: next,
      events,
      burned: true,
      pickedUp: false,
      nextTurnSeatIndex: next.currentPlayerSeatIndex,
      playedCards: removed,
      burnedPileCards,
    };
  }

  const player = ensureCurrentPlayer(next, actingUserId);
  const source = getTurnSource(next, player);
  const previousEffective = getEffectivePileState(next.discardPile);
  const events: string[] = [];

  if (move.type === "pickup") {
    player.hand.push(...next.discardPile);
    next.discardPile = [];

    next.currentPlayerSeatIndex = player.seatIndex;
    next.turnNumber += 1;

    events.push(`${actingUserId} picked up the pile and starts a new pile.`);
    events.push(...maybeMarkEliminations(next));

    return {
      state: next,
      events,
      burned: false,
      pickedUp: true,
      nextTurnSeatIndex: player.seatIndex,
      playedCards: [],
    };
  }

  if (move.type === "blind_play") {
    if (player.tableFaceDown.length === 0) {
      throw new Error("No face-down cards available.");
    }

    const pickedIndex = randomFn(player.tableFaceDown.length);
    const [flipped] = player.tableFaceDown.splice(pickedIndex, 1);

    if (!flipped) {
      throw new Error("Blind card not found.");
    }

    if (isCardLegalAgainstPile(flipped, previousEffective)) {
      next.discardPile.push(flipped);
      const post = resolvePostPlayEffects(next, [flipped], previousEffective);

      if (post.burned) {
        events.push(`${actingUserId} burned the pile.`);
        events.push(...post.events);
      } else {
        const nextSeat = advanceTurn(next, player.seatIndex, post.skipCount);
        next.currentPlayerSeatIndex = nextSeat;
      }

      next.turnNumber += 1;
      events.push(`${actingUserId} randomly flipped and played ${flipped.rank}.`);
      events.push(...post.events);
      events.push(...maybeMarkEliminations(next));

      return {
        state: next,
        events,
        burned: post.burned,
        pickedUp: false,
        nextTurnSeatIndex: next.currentPlayerSeatIndex,
        revealedBlindCard: flipped,
        playedCards: [flipped],
        burnedPileCards: post.burnedPileCards,
      };
    }

    next.discardPile.push(flipped);
    player.hand.push(...next.discardPile);
    next.discardPile = [];

    next.currentPlayerSeatIndex = player.seatIndex;
    next.turnNumber += 1;

    events.push(`${actingUserId} randomly flipped ${flipped.rank}, could not play it, picked up the pile, and starts a new pile.`);
    events.push(...maybeMarkEliminations(next));

    return {
      state: next,
      events,
      burned: false,
      pickedUp: true,
      nextTurnSeatIndex: player.seatIndex,
      revealedBlindCard: flipped,
      playedCards: [flipped],
      burnedPileCards: [],
    };
  }

  if (source !== "hand" && source !== "face_up") {
    throw new Error("Play move is only allowed from hand or face-up cards.");
  }

  const combineMode = source === "hand" ? canCombineHandWithFaceUp(next, player) : { enabled: false, handRank: null as CardRank | null };

  if (source === "hand" && combineMode.enabled) {
    const handIds = new Set(player.hand.map((card) => card.id));
    const faceUpIds = new Set(player.tableFaceUp.map((card) => card.id));
    const handMoveIds = move.cardIds.filter((id) => handIds.has(id));
    const faceUpMoveIds = move.cardIds.filter((id) => faceUpIds.has(id));

    if (handMoveIds.length === 0) {
      throw new Error("Combined move must include at least one hand card.");
    }

    const { removed: handRemoved, remaining: handRemaining } = removeCardsById(player.hand, handMoveIds);
    const { removed: faceUpRemoved, remaining: faceUpRemaining } = removeCardsById(player.tableFaceUp, faceUpMoveIds);
    const removed = [...handRemoved, ...faceUpRemoved];
    assertSingleRank(removed);
    const isDirectFourBurn = removed.length === 4;

    if (!isDirectFourBurn && !isCardLegalAgainstPile(removed[0], previousEffective)) {
      throw new Error("Played card is not legal for the current pile state.");
    }

    player.hand = handRemaining;
    player.tableFaceUp = faceUpRemaining;

    if (isDirectFourBurn) {
      next.burnedCards.push(...removed);
      next.burnedPileHistory.push([...removed]);
      next.drawPile = refillHandFromDraw(player, next.drawPile);
      next.currentPlayerSeatIndex = player.seatIndex;
      next.turnNumber += 1;

      events.push(`${actingUserId} directly burned 4x ${removed[0].rank}.`);
      events.push("Pile burned.");
      events.push(...maybeMarkEliminations(next));

      return {
        state: next,
        events,
        burned: true,
        pickedUp: false,
        nextTurnSeatIndex: next.currentPlayerSeatIndex,
        playedCards: removed,
        burnedPileCards: removed,
      };
    }

    next.discardPile.push(...removed);
    next.drawPile = refillHandFromDraw(player, next.drawPile);

    const post = resolvePostPlayEffects(next, removed, previousEffective);

    if (!post.burned) {
      const nextSeat = advanceTurn(next, player.seatIndex, post.skipCount);
      next.currentPlayerSeatIndex = nextSeat;
    }

    next.turnNumber += 1;

    events.push(`${actingUserId} played ${removed.length}x ${removed[0].rank}.`);
    events.push(...post.events);
    events.push(...maybeMarkEliminations(next));

    return {
      state: next,
      events,
      burned: post.burned,
      pickedUp: false,
      nextTurnSeatIndex: next.currentPlayerSeatIndex,
      playedCards: removed,
      burnedPileCards: post.burnedPileCards,
    };
  }

  const cards = source === "hand" ? player.hand : player.tableFaceUp;
  const { removed, remaining } = removeCardsById(cards, move.cardIds);
  assertSingleRank(removed);
  const isDirectFourBurn = removed.length === 4;

  if (!isDirectFourBurn && !isCardLegalAgainstPile(removed[0], previousEffective)) {
    throw new Error("Played card is not legal for the current pile state.");
  }

  if (source === "hand") {
    player.hand = remaining;
  } else {
    player.tableFaceUp = remaining;
  }

  if (isDirectFourBurn) {
    next.burnedCards.push(...removed);
    next.burnedPileHistory.push([...removed]);

    if (source === "hand") {
      next.drawPile = refillHandFromDraw(player, next.drawPile);
    }

    next.currentPlayerSeatIndex = player.seatIndex;
    next.turnNumber += 1;

    events.push(`${actingUserId} directly burned 4x ${removed[0].rank}.`);
    events.push("Pile burned.");
    events.push(...maybeMarkEliminations(next));

    return {
      state: next,
      events,
      burned: true,
      pickedUp: false,
      nextTurnSeatIndex: next.currentPlayerSeatIndex,
      playedCards: removed,
      burnedPileCards: removed,
    };
  }

  next.discardPile.push(...removed);

  if (source === "hand") {
    next.drawPile = refillHandFromDraw(player, next.drawPile);
  }

  const post = resolvePostPlayEffects(next, removed, previousEffective);

  if (!post.burned) {
    const nextSeat = advanceTurn(next, player.seatIndex, post.skipCount);
    next.currentPlayerSeatIndex = nextSeat;
  }

  next.turnNumber += 1;

  events.push(`${actingUserId} played ${removed.length}x ${removed[0].rank}.`);
  events.push(...post.events);
  events.push(...maybeMarkEliminations(next));

  return {
    state: next,
    events,
    burned: post.burned,
    pickedUp: false,
    nextTurnSeatIndex: next.currentPlayerSeatIndex,
    playedCards: removed,
    burnedPileCards: post.burnedPileCards,
  };
}

export function getPublicPlayerView(state: GameState, viewerUserId: string) {
  return state.players.map((player) => ({
    userId: player.userId,
    seatIndex: player.seatIndex,
    handCount: player.hand.length,
    hand: player.userId === viewerUserId ? player.hand : undefined,
    tableFaceUp: player.tableFaceUp,
    faceDownCount: player.tableFaceDown.length,
    faceDownCards: player.userId === viewerUserId ? player.tableFaceDown : undefined,
    isOut: player.isOut,
    isLoser: player.isLoser,
    placement: player.placement,
    finishedAtTurn: player.finishedAtTurn,
  }));
}
