import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { RoundCreateInput, RoundDeleteInput, RoundUpdateInput } from "@/lib/validation/round";

async function assertGameSessionExists(gameSessionId: string, db: Prisma.TransactionClient | typeof prisma) {
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
    throw new Error("Cannot record rounds for an archived session.");
  }

  if (gameSession.activityType !== "CARD") {
    throw new Error("Rounds are only available for CARD sessions.");
  }
}

async function getSessionParticipants(gameSessionId: string, db: Prisma.TransactionClient | typeof prisma) {
  return db.sessionParticipant.findMany({
    where: { gameSessionId },
    select: {
      id: true,
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
  });
}

function assertOrderedIdsMatchSessionParticipants(orderedIds: string[], sessionParticipantIds: string[]) {
  const uniqueOrderedIds = new Set(orderedIds);

  if (uniqueOrderedIds.size !== orderedIds.length) {
    throw new Error("Duplicate participant IDs are not allowed.");
  }

  if (sessionParticipantIds.length < 2) {
    throw new Error("A session must have at least 2 participants to record rounds.");
  }

  if (orderedIds.length !== sessionParticipantIds.length) {
    throw new Error("Every session participant must appear exactly once in the round order.");
  }

  const sessionParticipantIdSet = new Set(sessionParticipantIds);

  for (const id of orderedIds) {
    if (!sessionParticipantIdSet.has(id)) {
      throw new Error("Round placements must only contain participants from this session.");
    }
  }
}

export async function getRoundsByGameSessionId(gameSessionId: string) {
  return prisma.roundResult.findMany({
    where: { gameSessionId },
    orderBy: [{ sequenceNumber: "asc" }, { createdAt: "asc" }],
    include: {
      placements: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        include: {
          sessionParticipant: {
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
        },
      },
    },
  });
}

export async function getRoundById(id: string) {
  return prisma.roundResult.findUnique({
    where: { id },
    include: {
      placements: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        include: {
          sessionParticipant: {
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
        },
      },
    },
  });
}

export async function createRound(input: RoundCreateInput, tx?: Prisma.TransactionClient) {
  const db = tx ?? prisma;

  await assertGameSessionExists(input.gameSessionId, db);

  const sessionParticipants = await getSessionParticipants(input.gameSessionId, db);
  const sessionParticipantIds = sessionParticipants.map((participant) => participant.id);

  assertOrderedIdsMatchSessionParticipants(input.orderedSessionParticipantIds, sessionParticipantIds);

  const aggregate = await db.roundResult.aggregate({
    where: { gameSessionId: input.gameSessionId },
    _max: { sequenceNumber: true },
  });

  const nextSequenceNumber = (aggregate._max.sequenceNumber ?? 0) + 1;

  return db.roundResult.create({
    data: {
      gameSessionId: input.gameSessionId,
      sequenceNumber: nextSequenceNumber,
      notes: input.notes,
      placements: {
        create: input.orderedSessionParticipantIds.map((sessionParticipantId, index) => ({
          sessionParticipantId,
          position: index + 1,
        })),
      },
    },
    include: {
      placements: {
        orderBy: [{ position: "asc" }],
      },
    },
  });
}

export async function updateRound(input: RoundUpdateInput, tx?: Prisma.TransactionClient) {
  const db = tx ?? prisma;

  const existing = await db.roundResult.findUnique({
    where: { id: input.id },
    select: {
      id: true,
      gameSessionId: true,
      archivedAt: true,
      gameSession: {
        select: {
          archivedAt: true,
        },
      },
    },
  });

  if (!existing) {
    throw new Error("Round not found.");
  }

  if (existing.gameSessionId !== input.gameSessionId) {
    throw new Error("Round does not belong to the selected session.");
  }

  if (existing.archivedAt) {
    throw new Error("Archived rounds are read-only. Unarchive the round before editing it.");
  }

  if (existing.gameSession.archivedAt) {
    throw new Error("Cannot edit rounds for an archived session.");
  }

  const sessionParticipants = await getSessionParticipants(input.gameSessionId, db);
  const sessionParticipantIds = sessionParticipants.map((participant) => participant.id);

  assertOrderedIdsMatchSessionParticipants(input.orderedSessionParticipantIds, sessionParticipantIds);

  await db.roundPlacement.deleteMany({
    where: { roundResultId: input.id },
  });

  return db.roundResult.update({
    where: { id: input.id },
    data: {
      notes: input.notes,
      placements: {
        create: input.orderedSessionParticipantIds.map((sessionParticipantId, index) => ({
          sessionParticipantId,
          position: index + 1,
        })),
      },
    },
    include: {
      placements: {
        orderBy: [{ position: "asc" }],
      },
    },
  });
}

export async function deleteRound(input: RoundDeleteInput, tx?: Prisma.TransactionClient) {
  const db = tx ?? prisma;

  const existing = await db.roundResult.findUnique({
    where: { id: input.id },
    select: {
      id: true,
      gameSessionId: true,
    },
  });

  if (!existing) {
    throw new Error("Round not found.");
  }

  if (existing.gameSessionId !== input.gameSessionId) {
    throw new Error("Round does not belong to the selected session.");
  }

  return db.roundResult.delete({
    where: { id: input.id },
  });
}

export async function archiveRound(id: string, tx?: Prisma.TransactionClient) {
  const db = tx ?? prisma;

  return db.roundResult.update({
    where: { id },
    data: {
      archivedAt: new Date(),
    },
  });
}

export async function unarchiveRound(id: string, tx?: Prisma.TransactionClient) {
  const db = tx ?? prisma;

  return db.roundResult.update({
    where: { id },
    data: {
      archivedAt: null,
    },
  });
}

export type SessionRoundParticipantSummary = {
  sessionParticipantId: string;
  playerId: string;
  playerDisplayName: string;
  roundWins: number;
};

export type SessionRoundSummary = {
  roundsPlayed: number;
  participants: SessionRoundParticipantSummary[];
  matchWinnerSessionParticipantIds: string[];
};

export function deriveSessionMatchWinners(participants: SessionRoundParticipantSummary[]): string[] {
  if (participants.length === 0) {
    return [];
  }

  const maxRoundWins = Math.max(...participants.map((participant) => participant.roundWins));

  if (maxRoundWins === 0) {
    return [];
  }

  return participants
    .filter((participant) => participant.roundWins === maxRoundWins)
    .map((participant) => participant.sessionParticipantId);
}

export async function getSessionRoundSummary(gameSessionId: string): Promise<SessionRoundSummary> {
  const [sessionParticipants, rounds] = await Promise.all([
    getSessionParticipants(gameSessionId, prisma),
    prisma.roundResult.findMany({
      where: {
        gameSessionId,
        archivedAt: null,
        gameSession: {
          archivedAt: null,
        },
      },
      select: {
        id: true,
        placements: {
          where: { position: 1 },
          select: { sessionParticipantId: true },
        },
      },
      orderBy: [{ sequenceNumber: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const winsBySessionParticipantId = new Map<string, number>();

  for (const participant of sessionParticipants) {
    winsBySessionParticipantId.set(participant.id, 0);
  }

  for (const round of rounds) {
    const winner = round.placements[0];

    if (!winner) {
      continue;
    }

    winsBySessionParticipantId.set(
      winner.sessionParticipantId,
      (winsBySessionParticipantId.get(winner.sessionParticipantId) ?? 0) + 1,
    );
  }

  const participants = sessionParticipants.map((participant) => ({
    sessionParticipantId: participant.id,
    playerId: participant.player.id,
    playerDisplayName: participant.player.displayName,
    roundWins: winsBySessionParticipantId.get(participant.id) ?? 0,
  }));

  return {
    roundsPlayed: rounds.length,
    participants,
    matchWinnerSessionParticipantIds: deriveSessionMatchWinners(participants),
  };
}
