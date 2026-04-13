import assert from "node:assert/strict";
import test from "node:test";

import {
  detectBurnPulse,
  getLatestBlindPlayOutcome,
  getRoundFinishSummary,
  getSpecialEffectBadge,
  summarizeLobbyEvent,
} from "@/components/online/table/polish-state";
import type { LobbySnapshot } from "@/components/online/types";

function makeMoveEvent(input: {
  id: string;
  actorUserId?: string | null;
  moveType: "play" | "pickup" | "blind_play";
  engineEvents?: string[];
  blindRevealedCard?: { rank: string; suit: string } | null;
  moveNumber?: number;
}): LobbySnapshot["events"][number] {
  return {
    id: input.id,
    type: "move_applied",
    actorUserId: input.actorUserId ?? "u1",
    createdAt: "2026-04-13T12:00:00.000Z",
    payload: {
      move: { type: input.moveType },
      events: input.engineEvents ?? [],
      blindRevealedCard: input.blindRevealedCard ?? null,
      moveNumber: input.moveNumber ?? 1,
    },
  };
}

test("summarizeLobbyEvent renders player-friendly move title", () => {
  const summary = summarizeLobbyEvent(
    makeMoveEvent({ id: "e1", moveType: "blind_play", engineEvents: ["u1 randomly flipped and played 8."] }),
    new Map([["u1", "Alice"]]),
  );

  assert.equal(summary.title, "Alice played blind");
  assert.equal(summary.detail, "Alice randomly flipped and played 8.");
  assert.equal(summary.tone, "info");
});

test("summarizeLobbyEvent marks burn/skip/loss outcomes as important", () => {
  const burnSummary = summarizeLobbyEvent(
    makeMoveEvent({ id: "e2", moveType: "play", engineEvents: ["Pile burned."] }),
    new Map([["u1", "Alice"]]),
  );

  assert.equal(burnSummary.important, true);
  assert.equal(burnSummary.tone, "warning");
});

test("getSpecialEffectBadge prefers active seven rule and reset state", () => {
  const sevenState = {
    effectivePile: {
      rankRestriction: "7",
      latestEffectiveRank: "7",
      sevenRuleActive: true,
      resetByTwo: false,
    },
  } as NonNullable<NonNullable<LobbySnapshot["game"]>["publicState"]>;

  assert.deepEqual(getSpecialEffectBadge(sevenState, []), { label: "7 or lower active", tone: "amber" });

  const resetState = {
    effectivePile: {
      rankRestriction: null,
      latestEffectiveRank: "2",
      sevenRuleActive: false,
      resetByTwo: true,
    },
  } as NonNullable<NonNullable<LobbySnapshot["game"]>["publicState"]>;

  assert.deepEqual(getSpecialEffectBadge(resetState, []), { label: "2 reset", tone: "sky" });
});

test("getSpecialEffectBadge detects skip and burn from latest move events", () => {
  const neutralState = {
    effectivePile: {
      rankRestriction: null,
      latestEffectiveRank: "9",
      sevenRuleActive: false,
      resetByTwo: false,
    },
  } as NonNullable<NonNullable<LobbySnapshot["game"]>["publicState"]>;

  const skipBadge = getSpecialEffectBadge(neutralState, [makeMoveEvent({ id: "e3", moveType: "play", engineEvents: ["Next player skipped."] })]);
  assert.deepEqual(skipBadge, { label: "Skip effect", tone: "zinc" });

  const burnBadge = getSpecialEffectBadge(neutralState, [makeMoveEvent({ id: "e4", moveType: "play", engineEvents: ["Pile burned."] })]);
  assert.deepEqual(burnBadge, { label: "Pile burned", tone: "emerald" });
});

test("detectBurnPulse only triggers once per new burn move", () => {
  const events = [makeMoveEvent({ id: "e5", moveType: "play", engineEvents: ["Pile burned."] })];

  const first = detectBurnPulse(events, null);
  assert.equal(first.shouldPulse, true);
  assert.equal(first.latestEventId, "e5");

  const second = detectBurnPulse(events, "e5");
  assert.equal(second.shouldPulse, false);
  assert.equal(second.latestEventId, "e5");
});

test("getLatestBlindPlayOutcome detects success and pickup variants", () => {
  const success = getLatestBlindPlayOutcome([
    makeMoveEvent({
      id: "e6",
      moveType: "blind_play",
      actorUserId: "u1",
      engineEvents: ["u1 randomly flipped and played 9."],
      blindRevealedCard: { rank: "9", suit: "S" },
      moveNumber: 12,
    }),
  ]);
  assert.equal(success?.status, "success");
  assert.equal(success?.actorUserId, "u1");
  assert.equal(success?.moveNumber, 12);
  assert.deepEqual(success?.revealedCard, { rank: "9", suit: "S" });

  const pickup = getLatestBlindPlayOutcome([
    makeMoveEvent({
      id: "e7",
      moveType: "blind_play",
      engineEvents: ["u1 randomly flipped 4, could not play it, picked up the pile, and starts a new pile."],
      blindRevealedCard: { rank: "4", suit: "H" },
    }),
  ]);
  assert.equal(pickup?.status, "pickup");
  assert.equal(pickup?.actorUserId, "u1");
  assert.deepEqual(pickup?.revealedCard, { rank: "4", suit: "H" });
});

test("getRoundFinishSummary maps winner and loser names", () => {
  const publicState = {
    phase: "finished",
    eliminationOrder: ["u2"],
    loserUserId: "u1",
  } as NonNullable<NonNullable<LobbySnapshot["game"]>["publicState"]>;

  const summary = getRoundFinishSummary(publicState, [
    { userId: "u1", name: "Alice", seatIndex: 0, readyState: true, isConnected: true, isOwner: true },
    { userId: "u2", name: "Bob", seatIndex: 1, readyState: true, isConnected: true, isOwner: false },
  ]);

  assert.deepEqual(summary, {
    winnerName: "Bob",
    loserName: "Alice",
  });
});
