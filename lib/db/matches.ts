import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  deriveSportsMatchResultPayload,
  type SportsMatchCreateInput,
  type SportsMatchDeleteInput,
  type SportsMatchUpdateInput,
} from "@/lib/validation/match";

async function assertSportsSessionExists(gameSessionId: string, db: Prisma.TransactionClient | typeof prisma) {
  const gameSession = await db.gameSession.findUnique({
    where: { id: gameSessionId },
    select: {
      id: true,
      activityType: true,
      archivedAt: true,
    },
  });

  if (!gameSession) {
    throw new Error("Session not found.");
  }

  if (gameSession.archivedAt) {
    throw new Error("Cannot manage sports matches for an archived session.");
  }

  if (gameSession.activityType === "CARD") {
    throw new Error("Sports matches are only available for SQUASH or PADEL sessions.");
  }

  return gameSession;
}

async function mapSessionParticipantIdsToPlayerIds(
  gameSessionId: string,
  sessionParticipantIds: string[],
  db: Prisma.TransactionClient | typeof prisma,
) {
  if (sessionParticipantIds.length === 0) {
    return [] as string[];
  }

  const participants = await db.sessionParticipant.findMany({
    where: {
      gameSessionId,
      id: {
        in: sessionParticipantIds,
      },
    },
    select: {
      id: true,
      playerId: true,
    },
  });

  if (participants.length !== sessionParticipantIds.length) {
    throw new Error("All match participants must belong to this session.");
  }

  const playerIdBySessionParticipantId = new Map(participants.map((participant) => [participant.id, participant.playerId]));

  return sessionParticipantIds.map((sessionParticipantId) => {
    const playerId = playerIdBySessionParticipantId.get(sessionParticipantId);

    if (!playerId) {
      throw new Error("All match participants must belong to this session.");
    }

    return playerId;
  });
}

export async function getSportsMatchesByGameSessionId(gameSessionId: string) {
  return prisma.match.findMany({
    where: {
      gameSessionId,
    },
    orderBy: [{ sequenceNumber: "asc" }, { createdAt: "asc" }],
    include: {
      participants: {
        orderBy: [{ sideNumber: "asc" }, { seatOrder: "asc" }, { createdAt: "asc" }],
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
      },
      result: {
        include: {
          scoreLines: {
            orderBy: [{ sequenceNumber: "asc" }, { sideNumber: "asc" }],
          },
        },
      },
    },
  });
}

export async function getSportsMatchById(id: string) {
  return prisma.match.findUnique({
    where: {
      id,
    },
    include: {
      participants: {
        orderBy: [{ sideNumber: "asc" }, { seatOrder: "asc" }, { createdAt: "asc" }],
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
      },
      result: {
        include: {
          scoreLines: {
            orderBy: [{ sequenceNumber: "asc" }, { sideNumber: "asc" }],
          },
        },
      },
    },
  });
}

export async function createSportsMatch(input: SportsMatchCreateInput, tx?: Prisma.TransactionClient) {
  const db = tx ?? prisma;

  const gameSession = await assertSportsSessionExists(input.gameSessionId, db);

  if (gameSession.activityType !== input.activityType) {
    throw new Error("Match activity must match the session activity.");
  }

  const [sideOnePlayerIds, sideTwoPlayerIds] = await Promise.all([
    mapSessionParticipantIdsToPlayerIds(input.gameSessionId, input.sideOneSessionParticipantIds, db),
    mapSessionParticipantIdsToPlayerIds(input.gameSessionId, input.sideTwoSessionParticipantIds, db),
  ]);

  const aggregate = await db.match.aggregate({
    where: {
      gameSessionId: input.gameSessionId,
    },
    _max: {
      sequenceNumber: true,
    },
  });

  const nextSequenceNumber = (aggregate._max.sequenceNumber ?? 0) + 1;
  const resultPayload = deriveSportsMatchResultPayload(input);

  return db.match.create({
    data: {
      gameSessionId: input.gameSessionId,
      sequenceNumber: nextSequenceNumber,
      notes: input.notes,
      participants: {
        create: [
          ...sideOnePlayerIds.map((playerId, index) => ({
            playerId,
            sideNumber: 1,
            seatOrder: index + 1,
          })),
          ...sideTwoPlayerIds.map((playerId, index) => ({
            playerId,
            sideNumber: 2,
            seatOrder: index + 1,
          })),
        ],
      },
      result: {
        create: {
          winningSideNumber: resultPayload.winningSideNumber,
          isDraw: false,
          scoreLines: {
            create: resultPayload.scoreLines,
          },
        },
      },
    },
  });
}

export async function updateSportsMatch(input: SportsMatchUpdateInput, tx?: Prisma.TransactionClient) {
  const db = tx ?? prisma;

  const existing = await db.match.findUnique({
    where: {
      id: input.id,
    },
    select: {
      id: true,
      gameSessionId: true,
      gameSession: {
        select: {
          activityType: true,
          archivedAt: true,
        },
      },
      result: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!existing) {
    throw new Error("Match not found.");
  }

  if (existing.gameSessionId !== input.gameSessionId) {
    throw new Error("Match does not belong to the selected session.");
  }

  if (existing.gameSession.archivedAt) {
    throw new Error("Cannot edit matches for an archived session.");
  }

  if (existing.gameSession.activityType !== input.activityType) {
    throw new Error("Match activity must match the session activity.");
  }

  const [sideOnePlayerIds, sideTwoPlayerIds] = await Promise.all([
    mapSessionParticipantIdsToPlayerIds(input.gameSessionId, input.sideOneSessionParticipantIds, db),
    mapSessionParticipantIdsToPlayerIds(input.gameSessionId, input.sideTwoSessionParticipantIds, db),
  ]);

  const resultPayload = deriveSportsMatchResultPayload(input);

  await db.matchParticipant.deleteMany({
    where: {
      matchId: input.id,
    },
  });

  await db.matchResult.deleteMany({
    where: {
      matchId: input.id,
    },
  });

  return db.match.update({
    where: {
      id: input.id,
    },
    data: {
      notes: input.notes,
      participants: {
        create: [
          ...sideOnePlayerIds.map((playerId, index) => ({
            playerId,
            sideNumber: 1,
            seatOrder: index + 1,
          })),
          ...sideTwoPlayerIds.map((playerId, index) => ({
            playerId,
            sideNumber: 2,
            seatOrder: index + 1,
          })),
        ],
      },
      result: {
        create: {
          winningSideNumber: resultPayload.winningSideNumber,
          isDraw: false,
          scoreLines: {
            create: resultPayload.scoreLines,
          },
        },
      },
    },
  });
}

export async function deleteSportsMatch(input: SportsMatchDeleteInput, tx?: Prisma.TransactionClient) {
  const db = tx ?? prisma;

  const existing = await db.match.findUnique({
    where: {
      id: input.id,
    },
    select: {
      id: true,
      gameSessionId: true,
    },
  });

  if (!existing) {
    throw new Error("Match not found.");
  }

  if (existing.gameSessionId !== input.gameSessionId) {
    throw new Error("Match does not belong to the selected session.");
  }

  return db.match.delete({
    where: {
      id: input.id,
    },
  });
}
