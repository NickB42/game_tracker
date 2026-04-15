import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { computeRatingsFromRoundHistory } from "@/lib/rating/openskill";

describe("openskill ratings", () => {
  it("keeps winner above loser for a single round", () => {
    const ratings = computeRatingsFromRoundHistory([
      {
        playedAt: new Date("2026-01-01T10:00:00Z"),
        sequenceNumber: 1,
        participants: [
          { playerId: "p1", position: 1 },
          { playerId: "p2", position: 2 },
        ],
      },
    ]);

    const winner = ratings.get("p1");
    const loser = ratings.get("p2");

    assert.ok(winner);
    assert.ok(loser);
    assert.ok((winner?.ordinal ?? 0) > (loser?.ordinal ?? 0));
  });

  it("is deterministic with same event order", () => {
    const events = [
      {
        playedAt: new Date("2026-01-01T10:00:00Z"),
        sequenceNumber: 1,
        participants: [
          { playerId: "p1", position: 1 },
          { playerId: "p2", position: 2 },
          { playerId: "p3", position: 3 },
        ],
      },
      {
        playedAt: new Date("2026-01-01T10:00:00Z"),
        sequenceNumber: 2,
        participants: [
          { playerId: "p3", position: 1 },
          { playerId: "p2", position: 2 },
          { playerId: "p1", position: 3 },
        ],
      },
    ];

    const first = computeRatingsFromRoundHistory(events);
    const second = computeRatingsFromRoundHistory(events);

    assert.deepEqual(first, second);
  });
});
