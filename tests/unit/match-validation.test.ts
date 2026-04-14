import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { sportsMatchCreateInputSchema } from "@/lib/validation/match";

describe("sports match validation", () => {
  it("accepts valid squash match payload", () => {
    const parsed = sportsMatchCreateInputSchema.safeParse({
      gameSessionId: "session-1",
      activityType: "SQUASH",
      sideOneSessionParticipantIds: ["sp-1"],
      sideTwoSessionParticipantIds: ["sp-2"],
      squashScoreSideOne: 11,
      squashScoreSideTwo: 8,
      padelSets: [],
      notes: "Friendly match",
    });

    assert.equal(parsed.success, true);
  });

  it("rejects squash payload with invalid participant count", () => {
    const parsed = sportsMatchCreateInputSchema.safeParse({
      gameSessionId: "session-1",
      activityType: "SQUASH",
      sideOneSessionParticipantIds: ["sp-1", "sp-2"],
      sideTwoSessionParticipantIds: [],
      squashScoreSideOne: 11,
      squashScoreSideTwo: 6,
      padelSets: [],
    });

    assert.equal(parsed.success, false);
  });

  it("accepts valid padel payload", () => {
    const parsed = sportsMatchCreateInputSchema.safeParse({
      gameSessionId: "session-1",
      activityType: "PADEL",
      sideOneSessionParticipantIds: ["sp-1", "sp-2"],
      sideTwoSessionParticipantIds: ["sp-3", "sp-4"],
      padelSets: [
        { sideOneGames: 6, sideTwoGames: 4 },
        { sideOneGames: 6, sideTwoGames: 3 },
      ],
    });

    assert.equal(parsed.success, true);
  });

  it("rejects padel payload with invalid participant count", () => {
    const parsed = sportsMatchCreateInputSchema.safeParse({
      gameSessionId: "session-1",
      activityType: "PADEL",
      sideOneSessionParticipantIds: ["sp-1", "sp-2"],
      sideTwoSessionParticipantIds: ["sp-3"],
      padelSets: [
        { sideOneGames: 6, sideTwoGames: 4 },
        { sideOneGames: 6, sideTwoGames: 3 },
      ],
    });

    assert.equal(parsed.success, false);
  });

  it("rejects padel payload without deciding set", () => {
    const parsed = sportsMatchCreateInputSchema.safeParse({
      gameSessionId: "session-1",
      activityType: "PADEL",
      sideOneSessionParticipantIds: ["sp-1", "sp-2"],
      sideTwoSessionParticipantIds: ["sp-3", "sp-4"],
      padelSets: [
        { sideOneGames: 6, sideTwoGames: 4 },
        { sideOneGames: 3, sideTwoGames: 6 },
      ],
    });

    assert.equal(parsed.success, false);
  });
});
