import { ordinal, rate, rating } from "openskill";

export type RatingRoundParticipant = {
  playerId: string;
  position: number;
};

export type RatingRoundEvent = {
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

export function computeRatingsFromRoundHistory(events: RatingRoundEvent[]): Map<string, PlayerRatingSnapshot> {
  const ratingsByPlayerId = new Map<string, OpenSkillRating>();

  for (const event of sortRoundEvents(events)) {
    const orderedParticipants = sortedParticipantsByPosition(event.participants);

    const teams = orderedParticipants.map((participant) => [ratingsByPlayerId.get(participant.playerId) ?? rating()]);
    const ranks = orderedParticipants.map((participant) => participant.position);
    const updatedTeams = rate(teams, { rank: ranks });

    for (let index = 0; index < orderedParticipants.length; index += 1) {
      const participant = orderedParticipants[index];
      const updatedRating = updatedTeams[index]?.[0];

      if (updatedRating) {
        ratingsByPlayerId.set(participant.playerId, updatedRating);
      }
    }
  }

  const snapshots = new Map<string, PlayerRatingSnapshot>();

  for (const [playerId, playerRating] of ratingsByPlayerId.entries()) {
    snapshots.set(playerId, {
      mu: playerRating.mu,
      sigma: playerRating.sigma,
      ordinal: ordinal(playerRating),
    });
  }

  return snapshots;
}
