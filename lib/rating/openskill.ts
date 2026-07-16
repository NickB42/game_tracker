import { ordinal, rate, rating } from "openskill";

export type RatingRoundParticipant = {
  playerId: string;
  position: number;
};

export type RatingRoundEvent = {
  id?: string;
  sessionId?: string;
  playedAt: Date;
  sequenceNumber: number;
  participants: RatingRoundParticipant[];
};

export type PlayerRatingSnapshot = {
  mu: number;
  sigma: number;
  ordinal: number;
};

type OpenSkillRating = ReturnType<typeof rating>;

export type OpenSkillRatingChange = {
  playerId: string;
  ratingBefore: PlayerRatingSnapshot;
  ratingAfter: PlayerRatingSnapshot;
  delta: number;
};

export type OpenSkillRatingUpdate = {
  event: RatingRoundEvent;
  changes: OpenSkillRatingChange[];
};

function sortRoundEvents(events: RatingRoundEvent[]): RatingRoundEvent[] {
  return [...events].sort((a, b) => {
    const playedAtDiff = a.playedAt.getTime() - b.playedAt.getTime();

    if (playedAtDiff !== 0) {
      return playedAtDiff;
    }

    return a.sequenceNumber - b.sequenceNumber;
  });
}

function sortedParticipantsByPosition(participants: RatingRoundParticipant[]): RatingRoundParticipant[] {
  return [...participants].sort((a, b) => a.position - b.position);
}

function toSnapshot(playerRating: OpenSkillRating): PlayerRatingSnapshot {
  return {
    mu: playerRating.mu,
    sigma: playerRating.sigma,
    ordinal: ordinal(playerRating),
  };
}

export function computeOpenSkillRatingUpdatesFromRoundHistory(events: RatingRoundEvent[]): OpenSkillRatingUpdate[] {
  const ratingsByPlayerId = new Map<string, OpenSkillRating>();
  const updates: OpenSkillRatingUpdate[] = [];

  for (const event of sortRoundEvents(events)) {
    const orderedParticipants = sortedParticipantsByPosition(event.participants);

    if (orderedParticipants.length === 0) {
      continue;
    }

    const ratingsBefore = orderedParticipants.map((participant) => ratingsByPlayerId.get(participant.playerId) ?? rating());
    const teams = ratingsBefore.map((playerRating) => [playerRating]);
    const ranks = orderedParticipants.map((participant) => participant.position);
    const updatedTeams = rate(teams, { rank: ranks });
    const changes: OpenSkillRatingChange[] = [];

    for (let index = 0; index < orderedParticipants.length; index += 1) {
      const participant = orderedParticipants[index];
      const previousRating = ratingsBefore[index];
      const updatedRating = updatedTeams[index]?.[0];

      if (previousRating && updatedRating) {
        ratingsByPlayerId.set(participant.playerId, updatedRating);
        const ratingBefore = toSnapshot(previousRating);
        const ratingAfter = toSnapshot(updatedRating);

        changes.push({
          playerId: participant.playerId,
          ratingBefore,
          ratingAfter,
          delta: ratingAfter.ordinal - ratingBefore.ordinal,
        });
      }
    }

    updates.push({ event, changes });
  }

  return updates;
}

export function computeRatingsFromRoundHistory(events: RatingRoundEvent[]): Map<string, PlayerRatingSnapshot> {
  const updates = computeOpenSkillRatingUpdatesFromRoundHistory(events);
  const latestRatingsByPlayerId = new Map<string, PlayerRatingSnapshot>();

  for (const update of updates) {
    for (const change of update.changes) {
      latestRatingsByPlayerId.set(change.playerId, change.ratingAfter);
    }
  }

  const snapshots = new Map<string, PlayerRatingSnapshot>();

  for (const [playerId, playerRating] of latestRatingsByPlayerId.entries()) {
    snapshots.set(playerId, playerRating);
  }

  return snapshots;
}
