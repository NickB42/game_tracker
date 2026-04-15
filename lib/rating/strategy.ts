import type { ActivityType } from "@prisma/client";

import { computeEloRatingsFromMatchHistory, type EloMatchEvent } from "@/lib/rating/elo";
import { computeRatingsFromRoundHistory, type PlayerRatingSnapshot, type RatingRoundEvent } from "@/lib/rating/openskill";

export type RatingSystem = "OPEN_SKILL" | "ELO";

export function getRatingSystemForActivity(activityType: ActivityType): RatingSystem {
  if (activityType === "CARD") {
    return "OPEN_SKILL";
  }

  return "ELO";
}

export function computeActivityRatings(
  activityType: ActivityType,
  input: {
    cardEvents?: RatingRoundEvent[];
    sportsEvents?: EloMatchEvent[];
  },
): Map<string, PlayerRatingSnapshot> {
  if (activityType === "CARD") {
    return computeRatingsFromRoundHistory(input.cardEvents ?? []);
  }

  const eloSnapshots = computeEloRatingsFromMatchHistory(input.sportsEvents ?? []);
  const snapshots = new Map<string, PlayerRatingSnapshot>();

  for (const [playerId, snapshot] of eloSnapshots.entries()) {
    snapshots.set(playerId, {
      mu: snapshot.rating,
      sigma: 0,
      ordinal: snapshot.rating,
    });
  }

  return snapshots;
}
