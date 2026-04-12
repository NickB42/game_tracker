import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { PlayerInput, PlayerUpdateInput } from "@/lib/validation/player";

export async function getPlayers(options?: { includeInactive?: boolean }) {
  return prisma.player.findMany({
    where: options?.includeInactive ? undefined : { isActive: true },
    orderBy: { displayName: "asc" },
    include: {
      _count: {
        select: {
          groupMemberships: true,
          sessionParticipants: true,
        },
      },
    },
  });
}

export async function getPlayerById(id: string) {
  return prisma.player.findUnique({
    where: { id },
    include: {
      groupMemberships: {
        include: {
          group: true,
        },
        orderBy: {
          group: {
            name: "asc",
          },
        },
      },
      _count: {
        select: {
          sessionParticipants: true,
        },
      },
    },
  });
}

export async function createPlayer(input: PlayerInput, tx?: Prisma.TransactionClient) {
  const db = tx ?? prisma;

  return db.player.create({
    data: {
      displayName: input.displayName,
      notes: input.notes,
      isActive: input.isActive,
    },
  });
}

export async function updatePlayer(input: PlayerUpdateInput, tx?: Prisma.TransactionClient) {
  const db = tx ?? prisma;

  return db.player.update({
    where: { id: input.id },
    data: {
      displayName: input.displayName,
      notes: input.notes,
      isActive: input.isActive,
    },
  });
}