export const ELO_BASE_RATING = 1500;
export const ELO_K_FACTOR = 32;
export const ELO_SCALE = 400;

export type EloMatchParticipant = {
  playerId: string;
  sideNumber: 1 | 2;
};

export type EloMatchEvent = {
  playedAt: Date;
  sequenceNumber: number;
  participants: EloMatchParticipant[];
  winningSideNumber: 1 | 2;
};

export type EloRatingSnapshot = {
  rating: number;
};

function sortMatchEvents(events: EloMatchEvent[]): EloMatchEvent[] {
  return [...events].sort((a, b) => {
    const playedAtDiff = a.playedAt.getTime() - b.playedAt.getTime();

    if (playedAtDiff !== 0) {
      return playedAtDiff;
    }

    return a.sequenceNumber - b.sequenceNumber;
  });
}

function getAverageRating(playerIds: string[], ratingsByPlayerId: Map<string, number>) {
  if (playerIds.length === 0) {
    return ELO_BASE_RATING;
  }

  const total = playerIds.reduce((sum, playerId) => sum + (ratingsByPlayerId.get(playerId) ?? ELO_BASE_RATING), 0);
  return total / playerIds.length;
}

function expectedScore(opponentRating: number, ownRating: number) {
  return 1 / (1 + 10 ** ((opponentRating - ownRating) / ELO_SCALE));
}

export function computeEloRatingsFromMatchHistory(events: EloMatchEvent[]): Map<string, EloRatingSnapshot> {
  const ratingsByPlayerId = new Map<string, number>();

  for (const event of sortMatchEvents(events)) {
    const sideOnePlayerIds = event.participants
      .filter((participant) => participant.sideNumber === 1)
      .map((participant) => participant.playerId);

    const sideTwoPlayerIds = event.participants
      .filter((participant) => participant.sideNumber === 2)
      .map((participant) => participant.playerId);

    if (sideOnePlayerIds.length === 0 || sideTwoPlayerIds.length === 0) {
      continue;
    }

    const sideOneAverageRating = getAverageRating(sideOnePlayerIds, ratingsByPlayerId);
    const sideTwoAverageRating = getAverageRating(sideTwoPlayerIds, ratingsByPlayerId);

    const expectedSideOne = expectedScore(sideTwoAverageRating, sideOneAverageRating);
    const expectedSideTwo = expectedScore(sideOneAverageRating, sideTwoAverageRating);

    const actualSideOne = event.winningSideNumber === 1 ? 1 : 0;
    const actualSideTwo = event.winningSideNumber === 2 ? 1 : 0;

    const sideOneDelta = ELO_K_FACTOR * (actualSideOne - expectedSideOne);
    const sideTwoDelta = ELO_K_FACTOR * (actualSideTwo - expectedSideTwo);

    for (const playerId of sideOnePlayerIds) {
      const currentRating = ratingsByPlayerId.get(playerId) ?? ELO_BASE_RATING;
      ratingsByPlayerId.set(playerId, currentRating + sideOneDelta);
    }

    for (const playerId of sideTwoPlayerIds) {
      const currentRating = ratingsByPlayerId.get(playerId) ?? ELO_BASE_RATING;
      ratingsByPlayerId.set(playerId, currentRating + sideTwoDelta);
    }
  }

  const snapshots = new Map<string, EloRatingSnapshot>();

  for (const [playerId, playerRating] of ratingsByPlayerId.entries()) {
    snapshots.set(playerId, {
      rating: playerRating,
    });
  }

  return snapshots;
}
