import type { Prisma } from "@prisma/client";

import { buildGroupVisibilityWhere, type AuthorizationActor, type GroupAuthorizationContext } from "@/lib/domain/authorization";
import { prisma } from "@/lib/db/prisma";
import type { GroupInput, GroupMembershipUpdateInput, GroupWithMembersInput } from "@/lib/validation/group";

function uniqueIds(ids: string[]) {
  return [...new Set(ids)];
}

export async function getGroups(actor: AuthorizationActor) {
  return prisma.group.findMany({
    where: buildGroupVisibilityWhere(actor),
    orderBy: { name: "asc" },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      trustedAdmins: {
        where: {
          userId: actor.id,
        },
        select: {
          id: true,
          userId: true,
        },
      },
      _count: {
        select: {
          memberships: true,
          gameSessions: true,
        },
      },
    },
  });
}

export async function getGroupById(id: string, actor: AuthorizationActor) {
  return prisma.group.findFirst({
    where: {
      id,
      ...buildGroupVisibilityWhere(actor),
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      trustedAdmins: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          user: {
            name: "asc",
          },
        },
      },
      memberships: {
        include: {
          player: true,
        },
        orderBy: {
          player: {
            displayName: "asc",
          },
        },
      },
      _count: {
        select: {
          gameSessions: true,
        },
      },
    },
  });
}

export async function createGroup(input: GroupInput & { ownerUserId: string }, tx?: Prisma.TransactionClient) {
  const db = tx ?? prisma;
  const trustedAdminUserIds = uniqueIds([input.ownerUserId, ...input.trustedAdminUserIds]);

  const existingUsers = await db.user.findMany({
    where: {
      id: {
        in: trustedAdminUserIds,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingUsers.length !== trustedAdminUserIds.length) {
    throw new Error("One or more selected trusted admins no longer exist.");
  }

  return db.group.create({
    data: {
      ownerUserId: input.ownerUserId,
      name: input.name,
      description: input.description,
      trustedAdmins: {
        create: trustedAdminUserIds.map((userId) => ({
          userId,
        })),
      },
    },
  });
}

export async function updateGroup(
  input: GroupWithMembersInput | (GroupInput & { id: string }),
  tx?: Prisma.TransactionClient,
) {
  const db = tx ?? prisma;

  return db.group.update({
    where: { id: input.id },
    data: {
      name: input.name,
      description: input.description,
    },
  });
}

export async function setGroupTrustedAdmins(
  input: { groupId: string; ownerUserId: string; trustedAdminUserIds: string[] },
  tx?: Prisma.TransactionClient,
) {
  const db = tx ?? prisma;
  const dedupedUserIds = uniqueIds([input.ownerUserId, ...input.trustedAdminUserIds]);

  const existingUsers = await db.user.findMany({
    where: { id: { in: dedupedUserIds } },
    select: { id: true },
  });

  if (existingUsers.length !== dedupedUserIds.length) {
    throw new Error("One or more selected trusted admins no longer exist.");
  }

  await db.groupTrustedAdmin.deleteMany({
    where: {
      groupId: input.groupId,
      userId: {
        notIn: dedupedUserIds,
      },
    },
  });

  await db.groupTrustedAdmin.createMany({
    data: dedupedUserIds.map((userId) => ({
      groupId: input.groupId,
      userId,
    })),
    skipDuplicates: true,
  });
}

export async function setGroupMembers(input: GroupMembershipUpdateInput, tx?: Prisma.TransactionClient) {
  const db = tx ?? prisma;
  const dedupedPlayerIds = uniqueIds(input.playerIds);

  if (dedupedPlayerIds.length > 0) {
    const existingPlayers = await db.player.findMany({
      where: { id: { in: dedupedPlayerIds } },
      select: { id: true },
    });

    if (existingPlayers.length !== dedupedPlayerIds.length) {
      throw new Error("One or more selected players no longer exist.");
    }
  }

  if (dedupedPlayerIds.length === 0) {
    await db.groupMembership.deleteMany({
      where: {
        groupId: input.groupId,
      },
    });

    return;
  }

  await db.groupMembership.deleteMany({
    where: {
      groupId: input.groupId,
      playerId: {
        notIn: dedupedPlayerIds,
      },
    },
  });

  await db.groupMembership.createMany({
    data: dedupedPlayerIds.map((playerId) => ({
      groupId: input.groupId,
      playerId,
    })),
    skipDuplicates: true,
  });
}

export async function getGroupAuthorizationContext(
  groupId: string,
  actor: AuthorizationActor,
): Promise<GroupAuthorizationContext | null> {
  const group = await prisma.group.findUnique({
    where: {
      id: groupId,
    },
    select: {
      ownerUserId: true,
      trustedAdmins: {
        where: {
          userId: actor.id,
        },
        select: {
          id: true,
        },
      },
      memberships: actor.playerId
        ? {
            where: {
              playerId: actor.playerId,
            },
            select: {
              id: true,
            },
          }
        : false,
    },
  });

  if (!group) {
    return null;
  }

  return {
    isOwner: group.ownerUserId === actor.id,
    isTrustedAdmin: group.trustedAdmins.length > 0,
    isMember: actor.playerId ? group.memberships.length > 0 : false,
  };
}