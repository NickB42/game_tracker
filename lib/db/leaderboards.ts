import type { ActivityType } from "@prisma/client";
import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { buildGroupVisibilityWhere, type AuthorizationActor } from "@/lib/domain/authorization";
import { computeEloRatingUpdatesFromMatchHistory, type EloMatchEvent } from "@/lib/rating/elo";
import {
  computeOpenSkillRatingUpdatesFromRoundHistory,
  type PlayerRatingSnapshot,
  type RatingRoundEvent,
} from "@/lib/rating/openskill";
import { getRatingSystemForActivity, type RatingSystem } from "@/lib/rating/strategy";

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
  history: RatingHistorySeries[];
};

export type RatingHistoryPoint = {
  sessionId: string;
  sessionTitle: string | null;
  playedAt: string;
  sequenceNumber: number;
  order: number;
  rating: number;
  delta: number;
};

export type RatingHistorySeries = {
  playerId: string;
  playerDisplayName: string;
  points: RatingHistoryPoint[];
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

type RatingTimelineUpdate = {
  event: {
    sessionId?: string;
    playedAt: Date;
    sequenceNumber: number;
  };
  changes: Array<{
    playerId: string;
    ratingAfter: PlayerRatingSnapshot;
    delta: number;
  }>;
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
    select: {
      id: true,
      sequenceNumber: true,
      gameSession: {
        select: {
          id: true,
          title: true,
          playedAt: true,
        },
      },
      placements: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: {
          position: true,
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
    select: {
      id: true,
      sequenceNumber: true,
      gameSession: {
        select: {
          id: true,
          title: true,
          playedAt: true,
        },
      },
      participants: {
        orderBy: [{ sideNumber: "asc" }, { seatOrder: "asc" }, { createdAt: "asc" }],
        select: {
          sideNumber: true,
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

export async function getSportsMatchEloChangesByMatchId(gameSessionId: string, filter: GroupFilter) {
  const matches = await getSportsMatchHistory(filter);
  const events: EloMatchEvent[] = [];
  const targetMatchIds = new Set<string>();

  for (const match of matches) {
    if (match.result?.winningSideNumber !== 1 && match.result?.winningSideNumber !== 2) {
      continue;
    }

    events.push({
      id: match.id,
      sessionId: match.gameSession.id,
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

    if (match.gameSession.id === gameSessionId) {
      targetMatchIds.add(match.id);
    }
  }

  return new Map(
    computeEloRatingUpdatesFromMatchHistory(events)
      .filter((update) => update.event.id && targetMatchIds.has(update.event.id))
      .map((update) => [
        update.event.id as string,
        update.changes.map((change) => ({
          playerId: change.playerId,
          delta: change.delta,
        })),
      ]),
  );
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
  statsByPlayerId: Map<string, MutableLeaderboardStats>,
  ratingByPlayerId: Map<string, PlayerRatingSnapshot>,
): LeaderboardRow[] {
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

function getLatestRatings(updates: RatingTimelineUpdate[]) {
  const ratingsByPlayerId = new Map<string, PlayerRatingSnapshot>();

  for (const update of updates) {
    for (const change of update.changes) {
      ratingsByPlayerId.set(change.playerId, change.ratingAfter);
    }
  }

  return ratingsByPlayerId;
}

function buildRatingHistory(
  updates: RatingTimelineUpdate[],
  statsByPlayerId: Map<string, MutableLeaderboardStats>,
  sessionTitleById: Map<string, string | null>,
): RatingHistorySeries[] {
  const pointsByPlayerId = new Map<string, Map<string, RatingHistoryPoint>>();
  const sessionOrderById = new Map<string, number>();

  updates.forEach((update, updateIndex) => {
    if (update.event.sessionId) {
      sessionOrderById.set(update.event.sessionId, updateIndex);
    }
  });

  updates.forEach((update) => {
    const sessionId = update.event.sessionId;

    if (!sessionId) {
      return;
    }

    for (const change of update.changes) {
      const playerPoints = pointsByPlayerId.get(change.playerId) ?? new Map<string, RatingHistoryPoint>();
      const existingPoint = playerPoints.get(sessionId);

      if (existingPoint) {
        existingPoint.sequenceNumber = update.event.sequenceNumber;
        existingPoint.order = sessionOrderById.get(sessionId) ?? existingPoint.order;
        existingPoint.rating = change.ratingAfter.ordinal;
        existingPoint.delta += change.delta;
      } else {
        playerPoints.set(sessionId, {
          sessionId,
          sessionTitle: sessionTitleById.get(sessionId) ?? null,
          playedAt: update.event.playedAt.toISOString(),
          sequenceNumber: update.event.sequenceNumber,
          order: sessionOrderById.get(sessionId) ?? 0,
          rating: change.ratingAfter.ordinal,
          delta: change.delta,
        });
      }

      pointsByPlayerId.set(change.playerId, playerPoints);
    }
  });

  return [...statsByPlayerId.values()]
    .map((stats) => ({
      playerId: stats.playerId,
      playerDisplayName: stats.playerDisplayName,
      points: [...(pointsByPlayerId.get(stats.playerId)?.values() ?? [])].sort((a, b) => a.order - b.order),
    }))
    .filter((series) => series.points.length > 0);
}

function sortHistoryByLeaderboardRank(history: RatingHistorySeries[], rows: LeaderboardRow[]) {
  const rankByPlayerId = new Map(rows.map((row, index) => [row.playerId, index]));
  return history.sort(
    (a, b) =>
      (rankByPlayerId.get(a.playerId) ?? Number.MAX_SAFE_INTEGER) -
      (rankByPlayerId.get(b.playerId) ?? Number.MAX_SAFE_INTEGER),
  );
}

async function buildCardLeaderboard(filter: GroupFilter) {
  const rounds = await getRoundHistory(filter);

  if (rounds.length === 0) {
    return { rows: [], history: [] };
  }

  const statsByPlayerId = new Map<string, MutableLeaderboardStats>();
  const ratingEvents: RatingRoundEvent[] = [];
  const sessionRoundWins = new Map<string, Map<string, number>>();
  const sessionTitleById = new Map<string, string | null>();

  for (const round of rounds) {
    sessionTitleById.set(round.gameSession.id, round.gameSession.title);
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
      id: round.id,
      sessionId: round.gameSession.id,
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
  const timeline = computeOpenSkillRatingUpdatesFromRoundHistory(ratingEvents);
  const rows = buildRows(statsByPlayerId, getLatestRatings(timeline));
  const history = sortHistoryByLeaderboardRank(
    buildRatingHistory(timeline, statsByPlayerId, sessionTitleById),
    rows,
  );

  return { rows, history };
}

async function buildSportsLeaderboard(filter: GroupFilter) {
  const matches = await getSportsMatchHistory(filter);

  if (matches.length === 0) {
    return { rows: [], history: [] };
  }

  const statsByPlayerId = new Map<string, MutableLeaderboardStats>();
  const ratingEvents: EloMatchEvent[] = [];
  const sessionTitleById = new Map<string, string | null>();

  for (const match of matches) {
    if (!match.result?.winningSideNumber || (match.result.winningSideNumber !== 1 && match.result.winningSideNumber !== 2)) {
      continue;
    }

    sessionTitleById.set(match.gameSession.id, match.gameSession.title);

    for (const participant of match.participants) {
      const stats = getOrCreateStats(statsByPlayerId, participant.player);
      stats.matchesPlayed += 1;
      stats.sessionsPlayed.add(match.gameSession.id);

      if (participant.sideNumber === match.result.winningSideNumber) {
        stats.matchWins += 1;
      }
    }

    ratingEvents.push({
      id: match.id,
      sessionId: match.gameSession.id,
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

  const timeline: RatingTimelineUpdate[] = computeEloRatingUpdatesFromMatchHistory(ratingEvents).map((update) => ({
    event: update.event,
    changes: update.changes.map((change) => ({
      playerId: change.playerId,
      ratingAfter: {
        mu: change.ratingAfter,
        sigma: 0,
        ordinal: change.ratingAfter,
      },
      delta: change.delta,
    })),
  }));
  const rows = buildRows(statsByPlayerId, getLatestRatings(timeline));
  const history = sortHistoryByLeaderboardRank(
    buildRatingHistory(timeline, statsByPlayerId, sessionTitleById),
    rows,
  );

  return { rows, history };
}

async function buildLeaderboard(filter: GroupFilter): Promise<ActivityLeaderboard> {
  const result =
    filter.activityType === "CARD"
      ? await buildCardLeaderboard(filter)
      : await buildSportsLeaderboard(filter);

  return {
    activityType: filter.activityType,
    ratingSystem: getRatingSystemForActivity(filter.activityType),
    rows: result.rows,
    history: result.history,
  };
}

export async function getGlobalLeaderboard(options?: { activityType?: ActivityType }): Promise<ActivityLeaderboard> {
  const activityType = options?.activityType ?? "CARD";

  return unstable_cache(
    async () => buildLeaderboard({ activityType }),
    ["leaderboard", "global", "with-history-v1", activityType],
    {
      revalidate: 60,
      tags: ["leaderboard:global"],
    },
  )();
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
    },
  });

  if (!visibleGroup) {
    return null;
  }

  const activityType = options?.activityType ?? "CARD";

  // TODO: Cache group leaderboards only after cache keys include actor-visible scope or mutations can revalidate safely.
  return buildLeaderboard({ groupId, activityType });
}
