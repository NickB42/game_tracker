import type { ActivityType, Prisma } from "@prisma/client";

import {
  buildSessionVisibilityWhere,
  type AuthorizationActor,
  type SessionAuthorizationContext,
} from "@/lib/domain/authorization";
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
      activityType: true,
      archivedAt: true,
      trustedAdmins: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!group) {
    throw new Error("Selected group no longer exists.");
  }

  if (group.archivedAt) {
    throw new Error("Archived groups cannot be assigned to new or edited sessions.");
  }

  return group;
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

export async function getGameSessions(
  actor: AuthorizationActor,
  options?: { includeArchived?: boolean; activityType?: ActivityType; groupId?: string },
) {
  const visibilityWhere = buildSessionVisibilityWhere(actor);

  return prisma.gameSession.findMany({
    where: {
      ...(options?.includeArchived ? {} : { archivedAt: null }),
      ...(options?.activityType ? { activityType: options.activityType } : {}),
      ...(options?.groupId ? { groupId: options.groupId } : {}),
      ...visibilityWhere,
    },
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
      ownerUser: {
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
          participants: true,
          roundResults: true,
          matches: true,
        },
      },
    },
  });
}

export async function getGameSessionById(id: string, actor: AuthorizationActor) {
  return prisma.gameSession.findFirst({
    where: {
      id,
      ...buildSessionVisibilityWhere(actor),
    },
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
      ownerUser: {
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
  input: GameSessionInput & {
    ownerUserId: string;
    createdByUserId?: string | null;
    source?: "MANUAL" | "ONLINE";
  },
  tx?: Prisma.TransactionClient,
) {
  const db = tx ?? prisma;
  let groupTrustedAdminUserIds: string[] = [];

  if (input.groupId) {
    const group = await assertGroupExists(input.groupId, db);

    if (group.activityType !== input.activityType) {
      throw new Error("Selected group activity must match the session activity.");
    }

    groupTrustedAdminUserIds = group.trustedAdmins.map((entry) => entry.userId);
  }

  const trustedAdminUserIds = uniqueIds([input.ownerUserId, ...groupTrustedAdminUserIds, ...input.trustedAdminUserIds]);

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

  return db.gameSession.create({
    data: {
      groupId: input.groupId,
      ownerUserId: input.ownerUserId,
      activityType: input.activityType,
      title: input.title,
      playedAt: input.playedAt,
      notes: input.notes,
      source: input.source,
      createdByUserId: input.createdByUserId ?? null,
      trustedAdmins: {
        create: trustedAdminUserIds.map((userId) => ({
          userId,
        })),
      },
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
      activityType: true,
      archivedAt: true,
      _count: {
        select: {
          roundResults: true,
          matches: true,
        },
      },
    },
  });

  if (!existing) {
    throw new Error("Session not found.");
  }

  if (existing.archivedAt) {
    throw new Error("Archived sessions are read-only. Unarchive the session before editing it.");
  }

  if (existing.activityType !== input.activityType && (existing._count.roundResults > 0 || existing._count.matches > 0)) {
    throw new Error("Activity cannot be changed after rounds or matches have been recorded for this session.");
  }

  const lockReasons = await getSessionEditLockReasons(input.id, db);

  if (lockReasons.groupLocked && existing.groupId !== input.groupId) {
    throw new Error(GROUP_LOCK_MESSAGE);
  }

  if (input.groupId) {
    const group = await assertGroupExists(input.groupId, db);

    if (group.activityType !== input.activityType) {
      throw new Error("Selected group activity must match the session activity.");
    }
  }

  return db.gameSession.update({
    where: { id: input.id },
    data: {
      groupId: input.groupId,
      activityType: input.activityType,
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

  if (participantIds.length > 0) {
    await db.sessionParticipant.createMany({
      data: participantIds.map((playerId) => ({
        gameSessionId: input.gameSessionId,
        playerId,
      })),
      skipDuplicates: true,
    });
  }
}

export async function setSessionTrustedAdmins(
  input: { gameSessionId: string; ownerUserId: string; groupId?: string | null; trustedAdminUserIds: string[] },
  tx?: Prisma.TransactionClient,
) {
  const db = tx ?? prisma;

  let inheritedGroupTrustedAdminUserIds: string[] = [];

  if (input.groupId) {
    const group = await assertGroupExists(input.groupId, db);
    inheritedGroupTrustedAdminUserIds = group.trustedAdmins.map((entry) => entry.userId);
  }

  const dedupedUserIds = uniqueIds([
    input.ownerUserId,
    ...inheritedGroupTrustedAdminUserIds,
    ...input.trustedAdminUserIds,
  ]);

  const existingUsers = await db.user.findMany({
    where: {
      id: {
        in: dedupedUserIds,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingUsers.length !== dedupedUserIds.length) {
    throw new Error("One or more selected trusted admins no longer exist.");
  }

  await db.gameSessionTrustedAdmin.deleteMany({
    where: {
      gameSessionId: input.gameSessionId,
      userId: {
        notIn: dedupedUserIds,
      },
    },
  });

  await db.gameSessionTrustedAdmin.createMany({
    data: dedupedUserIds.map((userId) => ({
      gameSessionId: input.gameSessionId,
      userId,
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

export async function getGameSessionAuthorizationContext(
  gameSessionId: string,
  actor: AuthorizationActor,
): Promise<SessionAuthorizationContext | null> {
  const session = await prisma.gameSession.findUnique({
    where: {
      id: gameSessionId,
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
      participants: actor.playerId
        ? {
            where: {
              playerId: actor.playerId,
            },
            select: {
              id: true,
            },
          }
        : false,
      group: {
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
      },
    },
  });

  if (!session) {
    return null;
  }

  return {
    isOwner: session.ownerUserId === actor.id,
    isTrustedAdmin: session.trustedAdmins.length > 0,
    isParticipant: actor.playerId ? session.participants.length > 0 : false,
    isLinkedGroupOwner: session.group ? session.group.ownerUserId === actor.id : false,
    isLinkedGroupTrustedAdmin: session.group ? session.group.trustedAdmins.length > 0 : false,
    isLinkedGroupMember: actor.playerId && session.group ? session.group.memberships.length > 0 : false,
  };
}
