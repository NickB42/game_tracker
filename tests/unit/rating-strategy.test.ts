import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { computeActivityRatings, getRatingSystemForActivity } from "@/lib/rating/strategy";

describe("rating strategy dispatch", () => {
  it("uses OpenSkill for CARD", () => {
    assert.equal(getRatingSystemForActivity("CARD"), "OPEN_SKILL");

    const snapshots = computeActivityRatings("CARD", {
      cardEvents: [
        {
          playedAt: new Date("2026-01-01T10:00:00Z"),
          sequenceNumber: 1,
          participants: [
            { playerId: "p1", position: 1 },
            { playerId: "p2", position: 2 },
          ],
        },
      ],
    });

    const p1 = snapshots.get("p1");
    const p2 = snapshots.get("p2");

    assert.ok((p1?.ordinal ?? 0) > (p2?.ordinal ?? 0));
  });

  it("uses Elo for SQUASH and PADEL", () => {
    assert.equal(getRatingSystemForActivity("SQUASH"), "ELO");
    assert.equal(getRatingSystemForActivity("PADEL"), "ELO");

    const squashSnapshots = computeActivityRatings("SQUASH", {
      sportsEvents: [
        {
          playedAt: new Date("2026-01-01T10:00:00Z"),
          sequenceNumber: 1,
          winningSideNumber: 1,
          participants: [
            { playerId: "p1", sideNumber: 1 },
            { playerId: "p2", sideNumber: 2 },
          ],
        },
      ],
    });

    assert.ok((squashSnapshots.get("p1")?.ordinal ?? 0) > (squashSnapshots.get("p2")?.ordinal ?? 0));
  });
});
