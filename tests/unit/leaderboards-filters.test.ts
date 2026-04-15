import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildCardRoundHistoryWhere, buildSportsMatchHistoryWhere } from "@/lib/db/leaderboards";

describe("leaderboard data-layer filters", () => {
  it("global activity filter scopes card history to activity", () => {
    const where = buildCardRoundHistoryWhere({ activityType: "CARD" });

    assert.equal(where.archivedAt, null);
    assert.equal(where.gameSession.archivedAt, null);
    assert.equal(where.gameSession.activityType, "CARD");
    assert.equal("groupId" in where.gameSession, false);
  });

  it("group activity filter scopes card history to group and activity", () => {
    const where = buildCardRoundHistoryWhere({ groupId: "group-1", activityType: "CARD" });

    assert.equal(where.archivedAt, null);
    assert.equal(where.gameSession.archivedAt, null);
    assert.equal(where.gameSession.activityType, "CARD");
    assert.equal(where.gameSession.groupId, "group-1");
  });

  it("global activity filter scopes sports history by activity", () => {
    const where = buildSportsMatchHistoryWhere({ activityType: "SQUASH" });

    assert.equal(where.gameSession.archivedAt, null);
    assert.equal(where.gameSession.activityType, "SQUASH");
    assert.equal("groupId" in where.gameSession, false);
  });

  it("group activity filter scopes sports history by group and activity", () => {
    const where = buildSportsMatchHistoryWhere({ groupId: "group-2", activityType: "PADEL" });

    assert.equal(where.gameSession.archivedAt, null);
    assert.equal(where.gameSession.activityType, "PADEL");
    assert.equal(where.gameSession.groupId, "group-2");
  });
});
