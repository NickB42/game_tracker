import { prisma } from "@/lib/db/prisma";
import { computeRatingsFromRoundHistory, type RatingRoundEvent } from "@/lib/rating/openskill";

export type LeaderboardRow = {
  playerId: string;
  playerDisplayName: string;
  displayedRating: number;
  mu: number;
  sigma: number;
  roundWins: number;
  matchWins: number;
  roundsPlayed: number;
  sessionsPlayed: number;
};

type MutableLeaderboardStats = {
  playerId: string;
  playerDisplayName: string;
  roundWins: number;
  matchWins: number;
  roundsPlayed: number;
  sessionsPlayed: Set<string>;
};

type GroupFilter = {
  groupId?: string;
};

async function getRoundHistory(filter?: GroupFilter) {
  return prisma.roundResult.findMany({
    where: {
      archivedAt: null,
      gameSession: {
        archivedAt: null,
        ...(filter?.groupId ? { groupId: filter.groupId } : {}),
      },
    },
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

async function buildLeaderboard(filter?: GroupFilter): Promise<LeaderboardRow[]> {
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

  const ratingByPlayerId = computeRatingsFromRoundHistory(ratingEvents);

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
      sessionsPlayed: stats.sessionsPlayed.size,
    });
  }

  rows.sort((a, b) => {
    if (b.displayedRating !== a.displayedRating) {
      return b.displayedRating - a.displayedRating;
    }

    if (b.roundWins !== a.roundWins) {
      return b.roundWins - a.roundWins;
    }

    return a.playerDisplayName.localeCompare(b.playerDisplayName);
  });

  return rows;
}

export async function getGlobalLeaderboard(): Promise<LeaderboardRow[]> {
  return buildLeaderboard();
}

export async function getGroupLeaderboard(groupId: string): Promise<LeaderboardRow[]> {
  return buildLeaderboard({ groupId });
}
