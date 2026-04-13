import type { Prisma } from "@prisma/client";

export type AuthorizationActor = {
  id: string;
  role: "ADMIN" | "MEMBER";
  playerId: string | null;
};

export type GroupAuthorizationContext = {
  isOwner: boolean;
  isTrustedAdmin: boolean;
  isMember: boolean;
};

export type SessionAuthorizationContext = {
  isOwner: boolean;
  isTrustedAdmin: boolean;
  isParticipant: boolean;
  isLinkedGroupOwner: boolean;
  isLinkedGroupTrustedAdmin: boolean;
  isLinkedGroupMember: boolean;
};

export function canCreateGroup(actor: AuthorizationActor): boolean {
  return actor.role === "ADMIN" || actor.role === "MEMBER";
}

export function canCreateSession(actor: AuthorizationActor): boolean {
  return actor.role === "ADMIN" || actor.role === "MEMBER";
}

export function canViewGroup(actor: AuthorizationActor, context: GroupAuthorizationContext): boolean {
  if (actor.role === "ADMIN") {
    return true;
  }

  return context.isOwner || context.isTrustedAdmin || context.isMember;
}

export function canEditGroup(actor: AuthorizationActor, context: GroupAuthorizationContext): boolean {
  if (actor.role === "ADMIN") {
    return true;
  }

  return context.isOwner || context.isTrustedAdmin;
}

export function canViewSession(actor: AuthorizationActor, context: SessionAuthorizationContext): boolean {
  if (actor.role === "ADMIN") {
    return true;
  }

  return (
    context.isOwner ||
    context.isTrustedAdmin ||
    context.isParticipant ||
    context.isLinkedGroupOwner ||
    context.isLinkedGroupTrustedAdmin ||
    context.isLinkedGroupMember
  );
}

export function canEditSession(actor: AuthorizationActor, context: SessionAuthorizationContext): boolean {
  if (actor.role === "ADMIN") {
    return true;
  }

  return context.isOwner || context.isTrustedAdmin;
}

export function canViewGroupLeaderboard(actor: AuthorizationActor, context: GroupAuthorizationContext): boolean {
  return canViewGroup(actor, context);
}

export function buildGroupVisibilityWhere(actor: AuthorizationActor): Prisma.GroupWhereInput {
  if (actor.role === "ADMIN") {
    return {};
  }

  const orConditions: Prisma.GroupWhereInput[] = [
    { ownerUserId: actor.id },
    { trustedAdmins: { some: { userId: actor.id } } },
  ];

  if (actor.playerId) {
    orConditions.push({ memberships: { some: { playerId: actor.playerId } } });
  }

  return {
    OR: orConditions,
  };
}

export function buildSessionVisibilityWhere(actor: AuthorizationActor): Prisma.GameSessionWhereInput {
  if (actor.role === "ADMIN") {
    return {};
  }

  const orConditions: Prisma.GameSessionWhereInput[] = [
    { ownerUserId: actor.id },
    { trustedAdmins: { some: { userId: actor.id } } },
    {
      group: {
        ownerUserId: actor.id,
      },
    },
    {
      group: {
        trustedAdmins: {
          some: {
            userId: actor.id,
          },
        },
      },
    },
  ];

  if (actor.playerId) {
    orConditions.push({ participants: { some: { playerId: actor.playerId } } });
    orConditions.push({ group: { memberships: { some: { playerId: actor.playerId } } } });
  }

  return {
    OR: orConditions,
  };
}
