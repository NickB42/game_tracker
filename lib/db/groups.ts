import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { GroupInput, GroupMembershipUpdateInput, GroupWithMembersInput } from "@/lib/validation/group";

function uniqueIds(ids: string[]) {
  return [...new Set(ids)];
}

export async function getGroups() {
  return prisma.group.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          memberships: true,
          gameSessions: true,
        },
      },
    },
  });
}

export async function getGroupById(id: string) {
  return prisma.group.findUnique({
    where: { id },
    include: {
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

export async function createGroup(input: GroupInput, tx?: Prisma.TransactionClient) {
  const db = tx ?? prisma;

  return db.group.create({
    data: {
      name: input.name,
      description: input.description,
    },
  });
}

export async function updateGroup(input: GroupWithMembersInput | (GroupInput & { id: string }), tx?: Prisma.TransactionClient) {
  const db = tx ?? prisma;

  return db.group.update({
    where: { id: input.id },
    data: {
      name: input.name,
      description: input.description,
    },
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