import { readFile } from "node:fs/promises";
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
    assert.equal("playedAt" in where.gameSession, false);
  });

  it("group activity filter scopes card history to group and activity", () => {
    const where = buildCardRoundHistoryWhere({ groupId: "group-1", activityType: "CARD" });

    assert.equal(where.archivedAt, null);
    assert.equal(where.gameSession.archivedAt, null);
    assert.equal(where.gameSession.activityType, "CARD");
    assert.equal(where.gameSession.groupId, "group-1");
    assert.equal("playedAt" in where.gameSession, false);
  });

  it("global activity filter scopes sports history by activity", () => {
    const where = buildSportsMatchHistoryWhere({ activityType: "SQUASH" });

    assert.equal(where.gameSession.archivedAt, null);
    assert.equal(where.gameSession.activityType, "SQUASH");
    assert.equal("groupId" in where.gameSession, false);
    assert.equal("playedAt" in where.gameSession, false);
  });

  it("group activity filter scopes sports history by group and activity", () => {
    const where = buildSportsMatchHistoryWhere({ groupId: "group-2", activityType: "PADEL" });

    assert.equal(where.gameSession.archivedAt, null);
    assert.equal(where.gameSession.activityType, "PADEL");
    assert.equal(where.gameSession.groupId, "group-2");
    assert.equal("playedAt" in where.gameSession, false);
  });
});

describe("leaderboard page headers", () => {
  it("lists group leaderboards without activity grouping or row badges", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/leaderboards/page");
    const source = testModule.default.toString();

    assert(source.includes("groups.map"));
    assert(source.includes("Global leaderboard"));
    assert(source.includes("TrophyIcon"));
    assert(!source.includes("groupsByActivity"));
    assert(!source.includes("formatActivityType"));
    assert(!source.includes("ActivityBadge"));
    assert(!source.includes("Open leaderboard"));
    assert(!source.includes("Open global leaderboard"));
  });

  it("does not render an activity badge in the global leaderboard header", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/leaderboards/global/page");
    const source = testModule.default.toString();

    assert(source.includes("Global leaderboard"));
    assert(source.includes("RatingHistoryChart"));
    assert(source.includes("Rating history"));
    assert(source.includes("view"));
    assert(!source.includes("ActivityBadge"));
  });

  it("does not render an activity badge in the group leaderboard header", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/leaderboards/groups/[groupId]/page");
    const source = testModule.default.toString();

    assert(source.includes("PageHeader"));
    assert(source.includes("RatingHistoryChart"));
    assert(source.includes("Rating history"));
    assert(source.includes("view"));
    assert(!source.includes("ActivityBadge"));
  });

  it("uses a back icon and text actions on group leaderboard pages", async () => {
    const source = await readFile("app/(dashboard)/dashboard/leaderboards/groups/[groupId]/page.tsx", "utf8");

    assert(source.includes("app-icon-button"));
    assert(source.includes("ArrowLeftIcon"));
    assert(source.includes("Open group"));
    assert(source.includes("{entry.label}"));
  });
});
