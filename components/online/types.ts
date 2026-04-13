export type LobbySnapshot = {
  lobby: {
    id: string;
    code: string;
    ownerUserId: string;
    status: "WAITING" | "IN_PROGRESS" | "FINISHED" | "CLOSED";
    createdAt?: string | Date;
    updatedAt?: string | Date;
    closedAt?: string | Date | null;
  };
  players: Array<{
    id?: string;
    userId: string;
    name: string;
    seatIndex: number;
    readyState: boolean;
    isConnected: boolean;
    isOwner: boolean;
    joinedAt?: string | Date;
  }>;
  game: null | {
    id: string;
    status: "IN_PROGRESS" | "FINISHED" | "CLOSED";
    moveNumber: number;
    currentTurnPlayerId?: string | null;
    publicState: null | {
      phase: "swap" | "active" | "finished";
      turnNumber: number;
      currentPlayerSeatIndex?: number;
      currentPlayerUserId: string | null;
      drawPileCount: number;
      discardPile: Array<{ id: string; rank: string; suit: string }>;
      discardPileSize: number;
      effectivePile: {
        rankRestriction?: string | null;
        latestEffectiveRank: string | null;
        sevenRuleActive: boolean;
        resetByTwo: boolean;
      };
      burnedCardsCount?: number;
      burnedPileHistory?: Array<Array<{ id: string; rank: string; suit: string }>>;
      eliminationOrder?: string[];
      legalMoves: Array<
        | { type: "play"; cardIds: string[] }
        | { type: "pickup" }
        | { type: "blind_play" }
      >;
      players: Array<{
        userId: string;
        seatIndex: number;
        handCount: number;
        hand?: Array<{ id: string; rank: string; suit: string }>;
        tableFaceUp: Array<{ id: string; rank: string; suit: string }>;
        faceDownCount: number;
        faceDownCards?: Array<{ id: string; rank: string; suit: string }>;
        isOut: boolean;
        isLoser: boolean;
        placement: number | null;
      }>;
      loserUserId: string | null;
      swapLockedUserIds: string[];
    };
  };
  events: Array<{
    id: string;
    type: string;
    actorUserId: string | null;
    createdAt: string | Date;
    payload: unknown;
  }>;
  lobbyLeaderboard: Array<{
    userId: string;
    name: string;
    wins: number;
    winRate: number;
  }>;
  lobbyRoundsPlayed: number;
  lobbyLastWinner: {
    userId: string;
    name: string;
  } | null;
};

export type PublicCard = { id: string; rank: string; suit: string };
