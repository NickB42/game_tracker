import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildGroupVisibilityWhere,
  buildSessionVisibilityWhere,
  canCreateGroup,
  canCreateSession,
  canEditGroup,
  canEditSession,
  canViewGroup,
  canViewGroupLeaderboard,
  canViewSession,
  type AuthorizationActor,
} from "@/lib/domain/authorization";

const memberActor: AuthorizationActor = {
  id: "member-1",
  role: "MEMBER",
  playerId: "player-1",
};

const adminActor: AuthorizationActor = {
  id: "admin-1",
  role: "ADMIN",
  playerId: null,
};

describe("authorization capabilities", () => {
  it("allows both ADMIN and MEMBER to create groups and sessions", () => {
    assert.equal(canCreateGroup(memberActor), true);
    assert.equal(canCreateGroup(adminActor), true);
    assert.equal(canCreateSession(memberActor), true);
    assert.equal(canCreateSession(adminActor), true);
  });

  it("requires owner or trusted admin for group edits", () => {
    assert.equal(
      canEditGroup(memberActor, {
        isOwner: false,
        isTrustedAdmin: false,
        isMember: true,
      }),
      false,
    );

    assert.equal(
      canEditGroup(memberActor, {
        isOwner: true,
        isTrustedAdmin: false,
        isMember: false,
      }),
      true,
    );

    assert.equal(
      canEditGroup(memberActor, {
        isOwner: false,
        isTrustedAdmin: true,
        isMember: false,
      }),
      true,
    );
  });

  it("allows group viewing for owner, trusted admin, or member", () => {
    assert.equal(
      canViewGroup(memberActor, {
        isOwner: false,
        isTrustedAdmin: false,
        isMember: true,
      }),
      true,
    );

    assert.equal(
      canViewGroup(memberActor, {
        isOwner: false,
        isTrustedAdmin: false,
        isMember: false,
      }),
      false,
    );
  });

  it("applies same visibility rule for group leaderboard", () => {
    assert.equal(
      canViewGroupLeaderboard(memberActor, {
        isOwner: false,
        isTrustedAdmin: true,
        isMember: false,
      }),
      true,
    );
  });

  it("requires owner or trusted admin for session edits", () => {
    assert.equal(
      canEditSession(memberActor, {
        isOwner: false,
        isTrustedAdmin: false,
        isParticipant: true,
        isLinkedGroupOwner: false,
        isLinkedGroupTrustedAdmin: false,
        isLinkedGroupMember: false,
      }),
      false,
    );

    assert.equal(
      canEditSession(memberActor, {
        isOwner: true,
        isTrustedAdmin: false,
        isParticipant: false,
        isLinkedGroupOwner: false,
        isLinkedGroupTrustedAdmin: false,
        isLinkedGroupMember: false,
      }),
      true,
    );
  });

  it("allows session visibility for participants or linked-group members", () => {
    assert.equal(
      canViewSession(memberActor, {
        isOwner: false,
        isTrustedAdmin: false,
        isParticipant: true,
        isLinkedGroupOwner: false,
        isLinkedGroupTrustedAdmin: false,
        isLinkedGroupMember: false,
      }),
      true,
    );

    assert.equal(
      canViewSession(memberActor, {
        isOwner: false,
        isTrustedAdmin: false,
        isParticipant: false,
        isLinkedGroupOwner: false,
        isLinkedGroupTrustedAdmin: false,
        isLinkedGroupMember: true,
      }),
      true,
    );
  });

  it("always grants admin users visibility and edit overrides", () => {
    assert.equal(
      canViewGroup(adminActor, {
        isOwner: false,
        isTrustedAdmin: false,
        isMember: false,
      }),
      true,
    );

    assert.equal(
      canEditSession(adminActor, {
        isOwner: false,
        isTrustedAdmin: false,
        isParticipant: false,
        isLinkedGroupOwner: false,
        isLinkedGroupTrustedAdmin: false,
        isLinkedGroupMember: false,
      }),
      true,
    );
  });
});

describe("authorization visibility filter builders", () => {
  it("builds group visibility filter with ownership, trusted admin, and membership", () => {
    const where = buildGroupVisibilityWhere(memberActor) as {
      OR: Array<Record<string, unknown>>;
    };

    assert.equal(Array.isArray(where.OR), true);
    assert.equal(where.OR.length, 3);
    assert.deepEqual(where.OR[0], { ownerUserId: memberActor.id });
  });

  it("builds session visibility filter with session and linked group paths", () => {
    const where = buildSessionVisibilityWhere(memberActor) as {
      OR: Array<Record<string, unknown>>;
    };

    assert.equal(Array.isArray(where.OR), true);
    assert.ok(where.OR.length >= 6);
  });

  it("returns unrestricted filters for admin", () => {
    assert.deepEqual(buildGroupVisibilityWhere(adminActor), {});
    assert.deepEqual(buildSessionVisibilityWhere(adminActor), {});
  });
});
