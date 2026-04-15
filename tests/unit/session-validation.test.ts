import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { gameSessionInputSchema } from "@/lib/validation/session";

const basePayload = {
  groupId: undefined,
  title: "Test session",
  playedAt: new Date("2026-04-15T10:00:00.000Z"),
  notes: "",
  trustedAdminUserIds: [] as string[],
};

describe("session validation", () => {
  it("requires at least two participants for CARD and SQUASH sessions", () => {
    const card = gameSessionInputSchema.safeParse({
      ...basePayload,
      activityType: "CARD",
      participantIds: ["p1"],
    });

    const squash = gameSessionInputSchema.safeParse({
      ...basePayload,
      activityType: "SQUASH",
      participantIds: ["p1"],
    });

    assert.equal(card.success, false);
    assert.equal(squash.success, false);
  });

  it("requires at least four participants for PADEL sessions", () => {
    const tooFew = gameSessionInputSchema.safeParse({
      ...basePayload,
      activityType: "PADEL",
      participantIds: ["p1", "p2", "p3"],
    });

    const valid = gameSessionInputSchema.safeParse({
      ...basePayload,
      activityType: "PADEL",
      participantIds: ["p1", "p2", "p3", "p4"],
    });

    assert.equal(tooFew.success, false);
    assert.equal(valid.success, true);
  });
});
