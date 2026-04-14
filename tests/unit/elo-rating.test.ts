import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { computeEloRatingsFromMatchHistory, ELO_BASE_RATING } from "@/lib/rating/elo";

describe("elo ratings", () => {
  it("applies expected 1v1 deltas from equal starting ratings", () => {
    const ratings = computeEloRatingsFromMatchHistory([
      {
        playedAt: new Date("2026-01-01T10:00:00Z"),
        sequenceNumber: 1,
        winningSideNumber: 1,
        participants: [
          { playerId: "p1", sideNumber: 1 },
          { playerId: "p2", sideNumber: 2 },
        ],
      },
    ]);

    const p1 = ratings.get("p1")?.rating;
    const p2 = ratings.get("p2")?.rating;

    assert.ok(p1);
    assert.ok(p2);
    assert.equal(Number((p1 ?? 0).toFixed(2)), 1516);
    assert.equal(Number((p2 ?? 0).toFixed(2)), 1484);
  });

  it("updates each teammate equally in team matches", () => {
    const ratings = computeEloRatingsFromMatchHistory([
      {
        playedAt: new Date("2026-01-01T10:00:00Z"),
        sequenceNumber: 1,
        winningSideNumber: 1,
        participants: [
          { playerId: "p1", sideNumber: 1 },
          { playerId: "p2", sideNumber: 1 },
          { playerId: "p3", sideNumber: 2 },
          { playerId: "p4", sideNumber: 2 },
        ],
      },
    ]);

    assert.equal(Number((ratings.get("p1")?.rating ?? ELO_BASE_RATING).toFixed(2)), Number((ratings.get("p2")?.rating ?? ELO_BASE_RATING).toFixed(2)));
    assert.equal(Number((ratings.get("p3")?.rating ?? ELO_BASE_RATING).toFixed(2)), Number((ratings.get("p4")?.rating ?? ELO_BASE_RATING).toFixed(2)));
  });

  it("is deterministic with stable ordering", () => {
    const events = [
      {
        playedAt: new Date("2026-01-01T10:00:00Z"),
        sequenceNumber: 1,
        winningSideNumber: 1 as const,
        participants: [
          { playerId: "p1", sideNumber: 1 as const },
          { playerId: "p2", sideNumber: 2 as const },
        ],
      },
      {
        playedAt: new Date("2026-01-01T10:00:00Z"),
        sequenceNumber: 2,
        winningSideNumber: 2 as const,
        participants: [
          { playerId: "p1", sideNumber: 1 as const },
          { playerId: "p2", sideNumber: 2 as const },
        ],
      },
    ];

    const first = computeEloRatingsFromMatchHistory(events);
    const second = computeEloRatingsFromMatchHistory(events);

    assert.deepEqual(first, second);
  });
});
