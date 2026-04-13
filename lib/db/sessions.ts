import type { Prisma } from "@prisma/client";

import { GROUP_LOCK_MESSAGE, PARTICIPANTS_LOCK_MESSAGE, getSessionEditLockReasons } from "@/lib/domain/safety";
import { prisma } from "@/lib/db/prisma";
import type { GameSessionInput, GameSessionUpdateInput, SessionParticipantsUpdateInput } from "@/lib/validation/session";

function uniqueIds(ids: string[]) {
  return [...new Set(ids)];
}

async function assertGroupExists(groupId: string, db: Prisma.TransactionClient | typeof prisma) {
  const group = await db.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      archivedAt: true,
    },
  });

  if (!group) {
    throw new Error("Selected group no longer exists.");
  }

  if (group.archivedAt) {
    throw new Error("Archived groups cannot be assigned to new or edited sessions.");
  }
}

async function assertPlayersExist(playerIds: string[], db: Prisma.TransactionClient | typeof prisma) {
  if (playerIds.length === 0) {
    return;
  }

  const existingPlayers = await db.player.findMany({
    where: {
      id: { in: playerIds },
      archivedAt: null,
    },
    select: { id: true },
  });

  if (existingPlayers.length !== playerIds.length) {
    throw new Error("One or more selected participants are archived or no longer exist.");
  }
}

export async function getGameSessions(options?: { includeArchived?: boolean }) {
  return prisma.gameSession.findMany({
    where: options?.includeArchived ? undefined : { archivedAt: null },
    orderBy: [{ playedAt: "desc" }, { createdAt: "desc" }],
    include: {
      group: {
        select: {
          id: true,
          name: true,
        },
      },
      createdByUser: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          participants: true,
        },
      },
    },
  });
}

export async function getGameSessionById(id: string) {
  return prisma.gameSession.findUnique({
    where: { id },
    include: {
      group: {
        select: {
          id: true,
          name: true,
        },
      },
      createdByUser: {
        select: {
          id: true,
          name: true,
        },
      },
      participants: {
        include: {
          player: {
            select: {
              id: true,
              displayName: true,
              isActive: true,
              archivedAt: true,
            },
          },
        },
        orderBy: [{ seatOrder: "asc" }, { player: { displayName: "asc" } }],
      },
    },
  });
}

export async function createGameSession(
  input: GameSessionInput & { createdByUserId?: string | null; source?: "MANUAL" | "ONLINE" },
  tx?: Prisma.TransactionClient,
) {
  const db = tx ?? prisma;

  if (input.groupId) {
    await assertGroupExists(input.groupId, db);
  }

  return db.gameSession.create({
    data: {
      groupId: input.groupId,
      title: input.title,
      playedAt: input.playedAt,
      notes: input.notes,
      source: input.source,
      createdByUserId: input.createdByUserId ?? null,
    },
  });
}

export async function updateGameSession(input: GameSessionUpdateInput, tx?: Prisma.TransactionClient) {
  const db = tx ?? prisma;

  const existing = await db.gameSession.findUnique({
    where: { id: input.id },
    select: {
      id: true,
      groupId: true,
      archivedAt: true,
    },
  });

  if (!existing) {
    throw new Error("Session not found.");
  }

  if (existing.archivedAt) {
    throw new Error("Archived sessions are read-only. Unarchive the session before editing it.");
  }

  const lockReasons = await getSessionEditLockReasons(input.id, db);

  if (lockReasons.groupLocked && existing.groupId !== input.groupId) {
    throw new Error(GROUP_LOCK_MESSAGE);
  }

  if (input.groupId) {
    await assertGroupExists(input.groupId, db);
  }

  return db.gameSession.update({
    where: { id: input.id },
    data: {
      groupId: input.groupId,
      title: input.title,
      playedAt: input.playedAt,
      notes: input.notes,
    },
  });
}

export async function setSessionParticipants(input: SessionParticipantsUpdateInput, tx?: Prisma.TransactionClient) {
  const db = tx ?? prisma;
  const participantIds = uniqueIds(input.participantIds);

  const session = await db.gameSession.findUnique({
    where: { id: input.gameSessionId },
    select: {
      id: true,
      archivedAt: true,
    },
  });

  if (!session) {
    throw new Error("Session not found.");
  }

  if (session.archivedAt) {
    throw new Error("Archived sessions are read-only. Unarchive the session before editing it.");
  }

  const existingParticipantRows = await db.sessionParticipant.findMany({
    where: {
      gameSessionId: input.gameSessionId,
    },
    select: {
      playerId: true,
    },
  });

  const currentParticipantIds = existingParticipantRows.map((row) => row.playerId).sort();
  const nextParticipantIds = [...participantIds].sort();

  const participantSetChanged =
    currentParticipantIds.length !== nextParticipantIds.length ||
    currentParticipantIds.some((playerId, index) => playerId !== nextParticipantIds[index]);

  if (participantSetChanged) {
    const lockReasons = await getSessionEditLockReasons(input.gameSessionId, db);

    if (lockReasons.participantsLocked) {
      throw new Error(PARTICIPANTS_LOCK_MESSAGE);
    }
  }

  await assertPlayersExist(participantIds, db);

  await db.sessionParticipant.deleteMany({
    where: {
      gameSessionId: input.gameSessionId,
      playerId: {
        notIn: participantIds,
      },
    },
  });

  await db.sessionParticipant.createMany({
    data: participantIds.map((playerId) => ({
      gameSessionId: input.gameSessionId,
      playerId,
    })),
    skipDuplicates: true,
  });
}

export async function archiveGameSession(id: string, tx?: Prisma.TransactionClient) {
  const db = tx ?? prisma;

  return db.gameSession.update({
    where: { id },
    data: {
      archivedAt: new Date(),
    },
  });
}

export async function unarchiveGameSession(id: string, tx?: Prisma.TransactionClient) {
  const db = tx ?? prisma;

  return db.gameSession.update({
    where: { id },
    data: {
      archivedAt: null,
    },
  });
}
