import type { ActivityType } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { buildGroupVisibilityWhere, type AuthorizationActor } from "@/lib/domain/authorization";
import type { EloMatchEvent } from "@/lib/rating/elo";
import type { RatingRoundEvent } from "@/lib/rating/openskill";
import { computeActivityRatings, getRatingSystemForActivity, type RatingSystem } from "@/lib/rating/strategy";

export type LeaderboardRow = {
  playerId: string;
  playerDisplayName: string;
  displayedRating: number;
  mu: number;
  sigma: number;
  roundWins: number;
  matchWins: number;
  roundsPlayed: number;
  matchesPlayed: number;
  sessionsPlayed: number;
};

export type ActivityLeaderboard = {
  activityType: ActivityType;
  ratingSystem: RatingSystem;
  rows: LeaderboardRow[];
};

type MutableLeaderboardStats = {
  playerId: string;
  playerDisplayName: string;
  roundWins: number;
  matchWins: number;
  roundsPlayed: number;
  matchesPlayed: number;
  sessionsPlayed: Set<string>;
};

type GroupFilter = {
  groupId?: string;
  activityType: ActivityType;
};

export function buildCardRoundHistoryWhere(filter: GroupFilter) {
  return {
    archivedAt: null,
    gameSession: {
      archivedAt: null,
      activityType: filter.activityType,
      ...(filter.groupId ? { groupId: filter.groupId } : {}),
    },
  } as const;
}

export function buildSportsMatchHistoryWhere(filter: GroupFilter) {
  return {
    gameSession: {
      archivedAt: null,
      activityType: filter.activityType,
      ...(filter.groupId ? { groupId: filter.groupId } : {}),
    },
  } as const;
}

async function getRoundHistory(filter?: GroupFilter) {
  return prisma.roundResult.findMany({
    where: buildCardRoundHistoryWhere(filter ?? { activityType: "CARD" }),
    include: {
      gameSession: {
        select: {
          id: true,
          playedAt: true,
        },
      },
      placements: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        include: {
          sessionParticipant: {
            select: {
              id: true,
              player: {
                select: {
                  id: true,
                  displayName: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ gameSession: { playedAt: "asc" } }, { sequenceNumber: "asc" }, { createdAt: "asc" }],
  });
}

async function getSportsMatchHistory(filter: GroupFilter) {
  return prisma.match.findMany({
    where: buildSportsMatchHistoryWhere(filter),
    include: {
      gameSession: {
        select: {
          id: true,
          playedAt: true,
        },
      },
      participants: {
        orderBy: [{ sideNumber: "asc" }, { seatOrder: "asc" }, { createdAt: "asc" }],
        include: {
          player: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
      },
      result: {
        select: {
          winningSideNumber: true,
        },
      },
    },
    orderBy: [{ gameSession: { playedAt: "asc" } }, { sequenceNumber: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });
}

function getOrCreateStats(
  statsByPlayerId: Map<string, MutableLeaderboardStats>,
  player: { id: string; displayName: string },
): MutableLeaderboardStats {
  const existing = statsByPlayerId.get(player.id);

  if (existing) {
    return existing;
  }

  const created: MutableLeaderboardStats = {
    playerId: player.id,
    playerDisplayName: player.displayName,
    roundWins: 0,
    matchWins: 0,
    roundsPlayed: 0,
    matchesPlayed: 0,
    sessionsPlayed: new Set<string>(),
  };

  statsByPlayerId.set(player.id, created);
  return created;
}

function computeDerivedMatchWins(
  sessionRoundWins: Map<string, Map<string, number>>,
  statsByPlayerId: Map<string, MutableLeaderboardStats>,
) {
  for (const winsByPlayerId of sessionRoundWins.values()) {
    if (winsByPlayerId.size === 0) {
      continue;
    }

    const maxWins = Math.max(...winsByPlayerId.values());

    if (maxWins <= 0) {
      continue;
    }

    for (const [playerId, wins] of winsByPlayerId.entries()) {
      if (wins !== maxWins) {
        continue;
      }

      const stats = statsByPlayerId.get(playerId);

      if (stats) {
        stats.matchWins += 1;
      }
    }
  }
}

function buildRows(
  activityType: ActivityType,
  statsByPlayerId: Map<string, MutableLeaderboardStats>,
  ratingEvents: {
    cardEvents: RatingRoundEvent[];
    sportsEvents: EloMatchEvent[];
  },
): LeaderboardRow[] {
  const ratingByPlayerId = computeActivityRatings(activityType, ratingEvents);
  const rows: LeaderboardRow[] = [];

  for (const stats of statsByPlayerId.values()) {
    const rating = ratingByPlayerId.get(stats.playerId);

    rows.push({
      playerId: stats.playerId,
      playerDisplayName: stats.playerDisplayName,
      displayedRating: rating?.ordinal ?? 0,
      mu: rating?.mu ?? 0,
      sigma: rating?.sigma ?? 0,
      roundWins: stats.roundWins,
      matchWins: stats.matchWins,
      roundsPlayed: stats.roundsPlayed,
      matchesPlayed: stats.matchesPlayed,
      sessionsPlayed: stats.sessionsPlayed.size,
    });
  }

  rows.sort((a, b) => {
    if (b.displayedRating !== a.displayedRating) {
      return b.displayedRating - a.displayedRating;
    }

    if (b.matchWins !== a.matchWins) {
      return b.matchWins - a.matchWins;
    }

    if (b.roundWins !== a.roundWins) {
      return b.roundWins - a.roundWins;
    }

    return a.playerDisplayName.localeCompare(b.playerDisplayName);
  });

  return rows;
}

async function buildCardLeaderboard(filter: GroupFilter): Promise<LeaderboardRow[]> {
  const rounds = await getRoundHistory(filter);

  if (rounds.length === 0) {
    return [];
  }

  const statsByPlayerId = new Map<string, MutableLeaderboardStats>();
  const ratingEvents: RatingRoundEvent[] = [];
  const sessionRoundWins = new Map<string, Map<string, number>>();

  for (const round of rounds) {
    const ratingEventParticipants = round.placements.map((placement) => {
      const player = placement.sessionParticipant.player;
      const stats = getOrCreateStats(statsByPlayerId, player);

      stats.roundsPlayed += 1;
      stats.sessionsPlayed.add(round.gameSession.id);

      return {
        playerId: player.id,
        position: placement.position,
      };
    });

    ratingEvents.push({
      playedAt: round.gameSession.playedAt,
      sequenceNumber: round.sequenceNumber,
      participants: ratingEventParticipants,
    });

    const winnerPlacement = round.placements.find((placement) => placement.position === 1);

    if (winnerPlacement) {
      const winnerPlayer = winnerPlacement.sessionParticipant.player;
      const winnerStats = getOrCreateStats(statsByPlayerId, winnerPlayer);

      winnerStats.roundWins += 1;

      const winsByPlayerId = sessionRoundWins.get(round.gameSession.id) ?? new Map<string, number>();
      winsByPlayerId.set(winnerPlayer.id, (winsByPlayerId.get(winnerPlayer.id) ?? 0) + 1);
      sessionRoundWins.set(round.gameSession.id, winsByPlayerId);
    }
  }

  computeDerivedMatchWins(sessionRoundWins, statsByPlayerId);

  return buildRows("CARD", statsByPlayerId, {
    cardEvents: ratingEvents,
    sportsEvents: [],
  });
}

async function buildSportsLeaderboard(filter: GroupFilter): Promise<LeaderboardRow[]> {
  const matches = await getSportsMatchHistory(filter);

  if (matches.length === 0) {
    return [];
  }

  const statsByPlayerId = new Map<string, MutableLeaderboardStats>();
  const ratingEvents: EloMatchEvent[] = [];

  for (const match of matches) {
    if (!match.result?.winningSideNumber || (match.result.winningSideNumber !== 1 && match.result.winningSideNumber !== 2)) {
      continue;
    }

    for (const participant of match.participants) {
      const stats = getOrCreateStats(statsByPlayerId, participant.player);
      stats.matchesPlayed += 1;
      stats.sessionsPlayed.add(match.gameSession.id);

      if (participant.sideNumber === match.result.winningSideNumber) {
        stats.matchWins += 1;
      }
    }

    ratingEvents.push({
      playedAt: match.gameSession.playedAt,
      sequenceNumber: match.sequenceNumber,
      winningSideNumber: match.result.winningSideNumber,
      participants: match.participants
        .filter((participant) => participant.sideNumber === 1 || participant.sideNumber === 2)
        .map((participant) => ({
          playerId: participant.player.id,
          sideNumber: participant.sideNumber as 1 | 2,
        })),
    });
  }

  return buildRows(filter.activityType, statsByPlayerId, {
    cardEvents: [],
    sportsEvents: ratingEvents,
  });
}

async function buildLeaderboard(filter: GroupFilter): Promise<ActivityLeaderboard> {
  const rows =
    filter.activityType === "CARD"
      ? await buildCardLeaderboard(filter)
      : await buildSportsLeaderboard(filter);

  return {
    activityType: filter.activityType,
    ratingSystem: getRatingSystemForActivity(filter.activityType),
    rows,
  };
}

export async function getGlobalLeaderboard(options?: { activityType?: ActivityType }): Promise<ActivityLeaderboard> {
  return buildLeaderboard({
    activityType: options?.activityType ?? "CARD",
  });
}

export async function getGroupLeaderboard(
  groupId: string,
  actor: AuthorizationActor,
  options?: { activityType?: ActivityType },
): Promise<ActivityLeaderboard | null> {
  const visibleGroup = await prisma.group.findFirst({
    where: {
      id: groupId,
      ...buildGroupVisibilityWhere(actor),
    },
    select: {
      id: true,
      activityType: true,
    },
  });

  if (!visibleGroup) {
    return null;
  }

  const activityType = options?.activityType ?? visibleGroup.activityType;

  if (activityType !== visibleGroup.activityType) {
    return {
      activityType,
      ratingSystem: getRatingSystemForActivity(activityType),
      rows: [],
    };
  }

  return buildLeaderboard({ groupId, activityType });
}
