import { Prisma, type PrismaClient } from "@prisma/client";

import { appEnv } from "@/lib/env";
import {
  applyMove,
  applySwapForPlayer,
  createInitialGameState,
  getEffectivePileState,
  getLegalMoves,
  getPublicPlayerView,
  startGameFromSwapState,
  type GameState,
  type PlayerMove,
} from "@/lib/online/shithead-engine";
import { prisma } from "@/lib/db/prisma";
import { createGameSession } from "@/lib/db/sessions";
import { createRound } from "@/lib/db/rounds";

const ONLINE_LOBBY_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ONLINE_LOBBY_CODE_LENGTH = 6;
const ONLINE_LOBBY_MAX_PLAYERS = 5;
const ONLINE_LOBBY_MIN_PLAYERS = 2;
const LOBBY_EMPTY_TIMEOUT_MS = (appEnv.ONLINE_LOBBY_EMPTY_TIMEOUT_MINUTES ?? 15) * 60_000;

type Db = Prisma.TransactionClient | PrismaClient;

type PersistedGameEnvelope = {
  game: GameState;
  swapLockedUserIds: string[];
};

function now() {
  return new Date();
}

function getEnvelope(raw: Prisma.JsonValue): PersistedGameEnvelope {
  if (!raw || typeof raw !== "object") {
    throw new Error("Corrupted online game state.");
  }

  const value = raw as { game?: GameState; swapLockedUserIds?: string[] };

  if (!value.game || !Array.isArray(value.swapLockedUserIds)) {
    throw new Error("Corrupted online game state envelope.");
  }

  return {
    game: value.game,
    swapLockedUserIds: value.swapLockedUserIds,
  };
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function generateLobbyCode() {
  let code = "";

  for (let index = 0; index < ONLINE_LOBBY_CODE_LENGTH; index += 1) {
    code += ONLINE_LOBBY_CODE_ALPHABET[Math.floor(Math.random() * ONLINE_LOBBY_CODE_ALPHABET.length)];
  }

  return code;
}

function isLobbyExpired(lobby: { emptySince: Date | null; status: string }) {
  if (!lobby.emptySince || lobby.status === "CLOSED") {
    return false;
  }

  return Date.now() - lobby.emptySince.getTime() >= LOBBY_EMPTY_TIMEOUT_MS;
}

async function appendEvent(
  db: Db,
  input: {
    lobbyId: string;
    gameId?: string | null;
    actorUserId?: string | null;
    type: string;
    payload: Record<string, unknown>;
  },
) {
  await db.onlineGameEvent.create({
    data: {
      lobbyId: input.lobbyId,
      gameId: input.gameId ?? null,
      actorUserId: input.actorUserId ?? null,
      type: input.type,
      payloadJson: toJson(input.payload),
    },
  });
}

async function cleanupExpiredLobbies(db: Db) {
  const candidates = await db.onlineLobby.findMany({
    where: {
      status: {
        in: ["WAITING", "IN_PROGRESS", "FINISHED"],
      },
    },
    include: {
      players: {
        where: { leftAt: null },
        select: { id: true },
      },
    },
  });

  for (const lobby of candidates) {
    const hasActivePlayers = lobby.players.length > 0;

    if (hasActivePlayers && lobby.emptySince) {
      await db.onlineLobby.update({
        where: { id: lobby.id },
        data: { emptySince: null },
      });
      continue;
    }

    if (!hasActivePlayers && !lobby.emptySince) {
      await db.onlineLobby.update({
        where: { id: lobby.id },
        data: { emptySince: now() },
      });
      continue;
    }

    if (isLobbyExpired(lobby)) {
      await db.onlineLobby.update({
        where: { id: lobby.id },
        data: {
          status: "CLOSED",
          closedAt: now(),
        },
      });

      await appendEvent(db, {
        lobbyId: lobby.id,
        type: "lobby_closed_timeout",
        payload: { reason: "empty_timeout" },
      });
    }
  }
}

async function getActiveLobbyPlayers(db: Db, lobbyId: string) {
  return db.onlineLobbyPlayer.findMany({
    where: {
      lobbyId,
      leftAt: null,
    },
    orderBy: [{ seatIndex: "asc" }, { joinedAt: "asc" }],
    include: {
      user: {
        select: {
          id: true,
          name: true,
          playerId: true,
        },
      },
    },
  });
}

async function getCurrentInProgressGame(db: Db, lobbyId: string) {
  return db.onlineGame.findFirst({
    where: {
      lobbyId,
      status: "IN_PROGRESS",
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      status: true,
      moveNumber: true,
      privateStateJson: true,
    },
  });
}

function nextSeatIndex(players: Array<{ seatIndex: number }>) {
  if (players.length === 0) {
    return 0;
  }

  return Math.max(...players.map((player) => player.seatIndex)) + 1;
}

function buildPublicStateForViewer(envelope: PersistedGameEnvelope, viewerUserId: string) {
  const effectivePile = getEffectivePileState(envelope.game.discardPile);
  const legalMoves = envelope.game.phase === "active" ? getLegalMoves(envelope.game, viewerUserId) : [];
  const currentPlayer = envelope.game.players.find((player) => player.seatIndex === envelope.game.currentPlayerSeatIndex);
  const burnedPileHistory = Array.isArray(envelope.game.burnedPileHistory) ? envelope.game.burnedPileHistory : [];

  return {
    phase: envelope.game.phase,
    turnNumber: envelope.game.turnNumber,
    currentPlayerSeatIndex: envelope.game.currentPlayerSeatIndex,
    currentPlayerUserId: currentPlayer?.userId ?? null,
    drawPileCount: envelope.game.drawPile.length,
    discardPile: envelope.game.discardPile,
    discardPileSize: envelope.game.discardPile.length,
    effectivePile,
    burnedCardsCount: envelope.game.burnedCards.length,
    burnedPileHistory,
    eliminationOrder: envelope.game.eliminationOrder,
    loserUserId: envelope.game.loserUserId,
    swapLockedUserIds: envelope.swapLockedUserIds,
    players: getPublicPlayerView(envelope.game, viewerUserId),
    legalMoves,
  };
}

function getWinnerUserIdFromEnvelope(envelope: PersistedGameEnvelope): string | null {
  if (envelope.game.eliminationOrder.length > 0) {
    return envelope.game.eliminationOrder[0] ?? null;
  }

  const winner = envelope.game.players.find((player) => player.placement === 1);
  return winner?.userId ?? null;
}

async function syncOnlineGamePlayers(db: Db, gameId: string, envelope: PersistedGameEnvelope) {
  for (const player of envelope.game.players) {
    await db.onlineGamePlayer.updateMany({
      where: {
        gameId,
        userId: player.userId,
      },
      data: {
        handCount: player.hand.length,
        faceDownCount: player.tableFaceDown.length,
        faceUpCardsJson: toJson(player.tableFaceUp),
        status: player.isLoser ? "LOST" : player.isOut ? "OUT" : "ACTIVE",
        placement: player.placement,
        privateStateJson: toJson({
          hand: player.hand,
          tableFaceDown: player.tableFaceDown,
          tableFaceUp: player.tableFaceUp,
        }),
      },
    });
  }
}

async function getLobbyDebugOptions(db: Db, lobbyId: string): Promise<{ debugShortDeck: boolean }> {
  const createdEvent = await db.onlineGameEvent.findFirst({
    where: {
      lobbyId,
      type: "lobby_created",
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      payloadJson: true,
    },
  });

  if (!createdEvent || !createdEvent.payloadJson || typeof createdEvent.payloadJson !== "object") {
    return { debugShortDeck: false };
  }

  const payload = createdEvent.payloadJson as { debugShortDeck?: unknown };

  return {
    debugShortDeck: payload.debugShortDeck === true,
  };
}

export async function createOnlineLobby(ownerUserId: string, options?: { debugShortDeck?: boolean }) {
  return prisma.$transaction(async (tx) => {
    await cleanupExpiredLobbies(tx);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const code = generateLobbyCode();

      try {
        const lobby = await tx.onlineLobby.create({
          data: {
            code,
            ownerUserId,
            status: "WAITING",
            players: {
              create: {
                userId: ownerUserId,
                seatIndex: 0,
                readyState: false,
                isConnected: true,
                leftAt: null,
              },
            },
          },
        });

        await appendEvent(tx, {
          lobbyId: lobby.id,
          actorUserId: ownerUserId,
          type: "lobby_created",
          payload: {
            code: lobby.code,
            debugShortDeck: options?.debugShortDeck === true,
          },
        });

        return lobby;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          continue;
        }

        throw error;
      }
    }

    throw new Error("Failed to generate a unique lobby code.");
  });
}

export async function joinOnlineLobbyByCode(userId: string, code: string) {
  return prisma.$transaction(async (tx) => {
    await cleanupExpiredLobbies(tx);

    const lobby = await tx.onlineLobby.findUnique({
      where: { code },
    });

    if (!lobby) {
      throw new Error("Lobby not found.");
    }

    if (lobby.status === "CLOSED") {
      throw new Error("Lobby is closed.");
    }

    const existingMembership = await tx.onlineLobbyPlayer.findUnique({
      where: {
        lobbyId_userId: {
          lobbyId: lobby.id,
          userId,
        },
      },
    });

    const activePlayers = await getActiveLobbyPlayers(tx, lobby.id);

    if (!existingMembership && activePlayers.length >= ONLINE_LOBBY_MAX_PLAYERS) {
      throw new Error("Lobby is full.");
    }

    if (lobby.status === "IN_PROGRESS" && !existingMembership) {
      throw new Error("This lobby already started. Only existing participants can reconnect.");
    }

    const seatIndex = existingMembership?.seatIndex ?? nextSeatIndex(activePlayers);

    await tx.onlineLobbyPlayer.upsert({
      where: {
        lobbyId_userId: {
          lobbyId: lobby.id,
          userId,
        },
      },
      create: {
        lobbyId: lobby.id,
        userId,
        seatIndex,
        readyState: false,
        isConnected: true,
      },
      update: {
        leftAt: null,
        isConnected: true,
      },
    });

    await tx.onlineLobby.update({
      where: { id: lobby.id },
      data: {
        emptySince: null,
      },
    });

    await appendEvent(tx, {
      lobbyId: lobby.id,
      actorUserId: userId,
      type: existingMembership ? "player_reconnected" : "player_joined",
      payload: { userId },
    });

    return lobby;
  });
}

export async function leaveOnlineLobby(userId: string, lobbyId: string) {
  return prisma.$transaction(async (tx) => {
    await cleanupExpiredLobbies(tx);

    const lobby = await tx.onlineLobby.findUnique({
      where: { id: lobbyId },
    });

    if (!lobby) {
      throw new Error("Lobby not found.");
    }

    await tx.onlineLobbyPlayer.updateMany({
      where: {
        lobbyId,
        userId,
        leftAt: null,
      },
      data: {
        leftAt: now(),
        isConnected: false,
        readyState: false,
      },
    });

    const remaining = await getActiveLobbyPlayers(tx, lobbyId);

    if (remaining.length === 0) {
      await tx.onlineLobby.update({
        where: { id: lobbyId },
        data: { emptySince: now() },
      });
    } else if (lobby.ownerUserId === userId) {
      const nextOwner = remaining[0];
      await tx.onlineLobby.update({
        where: { id: lobbyId },
        data: { ownerUserId: nextOwner.userId },
      });
      await appendEvent(tx, {
        lobbyId,
        actorUserId: userId,
        type: "owner_transferred",
        payload: { nextOwnerUserId: nextOwner.userId },
      });
    }

    await appendEvent(tx, {
      lobbyId,
      actorUserId: userId,
      type: "player_left",
      payload: { userId },
    });
  });
}

export async function setOnlineLobbyReadyState(userId: string, lobbyId: string, ready: boolean) {
  await prisma.onlineLobbyPlayer.updateMany({
    where: {
      lobbyId,
      userId,
      leftAt: null,
    },
    data: {
      readyState: ready,
      isConnected: true,
    },
  });

  await appendEvent(prisma, {
    lobbyId,
    actorUserId: userId,
    type: "ready_state_changed",
    payload: { ready },
  });
}

export async function sendOnlineLobbyChatMessage(userId: string, lobbyId: string, message: string) {
  const trimmed = message.trim();

  if (!trimmed) {
    throw new Error("Message cannot be empty.");
  }

  if (trimmed.length > 240) {
    throw new Error("Message is too long.");
  }

  return prisma.$transaction(async (tx) => {
    const lobby = await tx.onlineLobby.findUnique({
      where: { id: lobbyId },
      select: { id: true, status: true },
    });

    if (!lobby || lobby.status === "CLOSED") {
      throw new Error("Lobby not available.");
    }

    const membership = await tx.onlineLobbyPlayer.findFirst({
      where: {
        lobbyId,
        userId,
        leftAt: null,
      },
      select: { id: true },
    });

    if (!membership) {
      throw new Error("You are not an active player in this lobby.");
    }

    await appendEvent(tx, {
      lobbyId,
      actorUserId: userId,
      type: "chat_message",
      payload: {
        message: trimmed,
      },
    });
  });
}

export async function closeOnlineLobby(ownerUserId: string, lobbyId: string) {
  return prisma.$transaction(async (tx) => {
    const lobby = await tx.onlineLobby.findUnique({
      where: { id: lobbyId },
    });

    if (!lobby) {
      throw new Error("Lobby not found.");
    }

    if (lobby.ownerUserId !== ownerUserId) {
      throw new Error("Only the lobby owner can close the lobby.");
    }

    await tx.onlineLobby.update({
      where: { id: lobbyId },
      data: {
        status: "CLOSED",
        closedAt: now(),
      },
    });

    await appendEvent(tx, {
      lobbyId,
      actorUserId: ownerUserId,
      type: "lobby_closed",
      payload: { reason: "owner_closed" },
    });
  });
}

export async function startOnlineLobbyGame(ownerUserId: string, lobbyId: string) {
  return prisma.$transaction(async (tx) => {
    const lobby = await tx.onlineLobby.findUnique({
      where: { id: lobbyId },
    });

    if (!lobby) {
      throw new Error("Lobby not found.");
    }

    if (lobby.ownerUserId !== ownerUserId) {
      throw new Error("Only the owner can start the game.");
    }

    if (lobby.status !== "WAITING" && lobby.status !== "FINISHED") {
      throw new Error("Lobby is not ready to start a new round.");
    }

    const players = await getActiveLobbyPlayers(tx, lobbyId);

    if (players.length < ONLINE_LOBBY_MIN_PLAYERS) {
      throw new Error("At least 2 players are required to start.");
    }

    const notReady = players.filter((player) => !player.readyState);

    if (notReady.length > 0) {
      throw new Error("All players must mark ready before a new round starts.");
    }

    const existingInProgress = await getCurrentInProgressGame(tx, lobbyId);

    if (existingInProgress) {
      throw new Error("A round is already in progress in this lobby.");
    }

    const seatOrderedUserIds = players.map((player) => player.userId);
    const debugOptions = await getLobbyDebugOptions(tx, lobbyId);
    const gameState = createInitialGameState(seatOrderedUserIds, undefined, {
      debugShortDeck: debugOptions.debugShortDeck,
    });

    const envelope: PersistedGameEnvelope = {
      game: gameState,
      swapLockedUserIds: [],
    };

    const game = await tx.onlineGame.create({
      data: {
        lobbyId,
        status: "IN_PROGRESS",
        currentTurnPlayerId: null,
        moveNumber: 0,
        drawPileCount: gameState.drawPile.length,
        discardPileState: toJson(gameState.discardPile),
        publicStateJson: toJson(buildPublicStateForViewer(envelope, ownerUserId)),
        privateStateJson: toJson(envelope),
        eliminationOrderJson: toJson([]),
        players: {
          create: players.map((player) => {
            const playerState = gameState.players.find((candidate) => candidate.userId === player.userId);

            if (!playerState) {
              throw new Error("Player state mapping failed.");
            }

            return {
              userId: player.userId,
              seatIndex: player.seatIndex,
              handCount: playerState.hand.length,
              faceDownCount: playerState.tableFaceDown.length,
              faceUpCardsJson: toJson(playerState.tableFaceUp),
              privateStateJson: toJson({
                hand: playerState.hand,
                tableFaceDown: playerState.tableFaceDown,
                tableFaceUp: playerState.tableFaceUp,
              }),
            };
          }),
        },
      },
    });

    await tx.onlineLobby.update({
      where: { id: lobbyId },
      data: {
        status: "IN_PROGRESS",
      },
    });

    await tx.onlineLobbyPlayer.updateMany({
      where: {
        lobbyId,
        leftAt: null,
      },
      data: {
        readyState: false,
      },
    });

    await appendEvent(tx, {
      lobbyId,
      gameId: game.id,
      actorUserId: ownerUserId,
      type: "game_started",
      payload: {
        phase: gameState.phase,
      },
    });

    return game;
  });
}

export async function submitOnlineSwap(userId: string, lobbyId: string, handCardIds: string[], faceUpCardIds: string[]) {
  return prisma.$transaction(async (tx) => {
    const game = await getCurrentInProgressGame(tx, lobbyId);

    if (!game || game.status !== "IN_PROGRESS") {
      throw new Error("No active game for this lobby.");
    }

    const envelope = getEnvelope(game.privateStateJson);

    if (envelope.game.phase !== "swap") {
      throw new Error("Swap phase is already finished.");
    }

    const swapped = applySwapForPlayer(envelope.game, userId, handCardIds, faceUpCardIds);

    envelope.game = swapped;
    envelope.swapLockedUserIds = Array.from(new Set([...envelope.swapLockedUserIds, userId]));

    await tx.onlineGame.update({
      where: { id: game.id },
      data: {
        privateStateJson: toJson(envelope),
        publicStateJson: toJson(buildPublicStateForViewer(envelope, userId)),
      },
    });

    await syncOnlineGamePlayers(tx, game.id, envelope);

    await appendEvent(tx, {
      lobbyId,
      gameId: game.id,
      actorUserId: userId,
      type: "swap_submitted",
      payload: {
        swapLockedUserIds: envelope.swapLockedUserIds,
      },
    });
  });
}

export async function beginActiveTurns(ownerUserId: string, lobbyId: string) {
  return prisma.$transaction(async (tx) => {
    const lobby = await tx.onlineLobby.findUnique({
      where: { id: lobbyId },
    });

    if (!lobby) {
      throw new Error("Lobby not found.");
    }

    if (lobby.ownerUserId !== ownerUserId) {
      throw new Error("Only the owner can begin turns.");
    }

    const game = await getCurrentInProgressGame(tx, lobbyId);

    if (!game || game.status !== "IN_PROGRESS") {
      throw new Error("No active game to start.");
    }

    const envelope = getEnvelope(game.privateStateJson);

    if (envelope.game.phase !== "swap") {
      return;
    }

    const activePlayers = await getActiveLobbyPlayers(tx, lobbyId);
    const lockedSet = new Set(envelope.swapLockedUserIds);
    const missingSelections = activePlayers
      .map((player) => player.userId)
      .filter((userId) => !lockedSet.has(userId));

    if (missingSelections.length > 0) {
      throw new Error("All players must choose and lock their 3 face-up cards before turns can begin.");
    }

    envelope.game = startGameFromSwapState(envelope.game);

    await tx.onlineGame.update({
      where: { id: game.id },
      data: {
        currentTurnPlayerId: envelope.game.players.find((p) => p.seatIndex === envelope.game.currentPlayerSeatIndex)?.userId ?? null,
        privateStateJson: toJson(envelope),
        publicStateJson: toJson(buildPublicStateForViewer(envelope, ownerUserId)),
      },
    });

    await syncOnlineGamePlayers(tx, game.id, envelope);

    await appendEvent(tx, {
      lobbyId,
      gameId: game.id,
      actorUserId: ownerUserId,
      type: "turns_began",
      payload: {
        currentPlayerSeatIndex: envelope.game.currentPlayerSeatIndex,
      },
    });
  });
}

export async function applyOnlineMove(userId: string, lobbyId: string, move: PlayerMove) {
  return prisma.$transaction(async (tx) => {
    const game = await getCurrentInProgressGame(tx, lobbyId);

    if (!game || game.status !== "IN_PROGRESS") {
      throw new Error("No active game for this lobby.");
    }

    const envelope = getEnvelope(game.privateStateJson);

    const resolution = applyMove(envelope.game, userId, move);
    envelope.game = resolution.state;

    const currentPlayer = envelope.game.players.find((player) => player.seatIndex === envelope.game.currentPlayerSeatIndex);

    await tx.onlineGame.update({
      where: { id: game.id },
      data: {
        moveNumber: game.moveNumber + 1,
        drawPileCount: envelope.game.drawPile.length,
        discardPileState: toJson(envelope.game.discardPile),
        eliminationOrderJson: toJson(envelope.game.eliminationOrder),
        loserUserId: envelope.game.loserUserId,
        currentTurnPlayerId: currentPlayer?.userId ?? null,
        status: envelope.game.phase === "finished" ? "FINISHED" : "IN_PROGRESS",
        finishedAt: envelope.game.phase === "finished" ? now() : null,
        privateStateJson: toJson(envelope),
        publicStateJson: toJson(buildPublicStateForViewer(envelope, userId)),
      },
    });

    if (envelope.game.phase === "finished") {
      await tx.onlineLobby.update({
        where: { id: lobbyId },
        data: {
          status: "FINISHED",
        },
      });

      await tx.onlineLobbyPlayer.updateMany({
        where: {
          lobbyId,
          leftAt: null,
        },
        data: {
          readyState: false,
        },
      });
    }

    await syncOnlineGamePlayers(tx, game.id, envelope);

    await appendEvent(tx, {
      lobbyId,
      gameId: game.id,
      actorUserId: userId,
      type: "move_applied",
      payload: {
        move,
        events: resolution.events,
        moveNumber: game.moveNumber + 1,
        blindRevealedCard: resolution.revealedBlindCard ?? null,
        playedCards: resolution.playedCards ?? [],
        burnedPileCards: resolution.burnedPileCards ?? [],
      },
    });

    return resolution;
  });
}

export async function getOnlineLobbySnapshot(lobbyId: string, viewerUserId: string) {
  await cleanupExpiredLobbies(prisma);

  const lobby = await prisma.onlineLobby.findUnique({
    where: { id: lobbyId },
    include: {
      players: {
        where: { leftAt: null },
        orderBy: [{ seatIndex: "asc" }, { joinedAt: "asc" }],
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      games: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          players: {
            orderBy: { seatIndex: "asc" },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      events: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!lobby) {
    throw new Error("Lobby not found.");
  }

  const finishedGames = await prisma.onlineGame.findMany({
    where: {
      lobbyId,
      status: "FINISHED",
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      privateStateJson: true,
    },
  });

  const winsByUserId = new Map<string, number>();
  const totalFinishedRounds = finishedGames.length;
  let lastWinnerUserId: string | null = null;

  for (const [index, game] of finishedGames.entries()) {
    const winnerUserId = getWinnerUserIdFromEnvelope(getEnvelope(game.privateStateJson));

    if (!winnerUserId) {
      continue;
    }

    if (index === 0) {
      lastWinnerUserId = winnerUserId;
    }

    winsByUserId.set(winnerUserId, (winsByUserId.get(winnerUserId) ?? 0) + 1);
  }

  const leaderboardUserIds = [...winsByUserId.keys()];
  const leaderboardUsers =
    leaderboardUserIds.length > 0
      ? await prisma.user.findMany({
          where: {
            id: { in: leaderboardUserIds },
          },
          select: {
            id: true,
            name: true,
          },
        })
      : [];

  const lobbyLeaderboard = leaderboardUserIds
    .map((userId) => ({
      userId,
      name: leaderboardUsers.find((user) => user.id === userId)?.name ?? "Unknown",
      wins: winsByUserId.get(userId) ?? 0,
      winRate: totalFinishedRounds > 0 ? ((winsByUserId.get(userId) ?? 0) / totalFinishedRounds) * 100 : 0,
    }))
    .sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name));

  const lobbyLastWinner = lastWinnerUserId
    ? {
        userId: lastWinnerUserId,
        name: leaderboardUsers.find((user) => user.id === lastWinnerUserId)?.name ?? "Unknown",
      }
    : null;

  const latestGame = lobby.games[0] ?? null;
  const persisted = latestGame ? getEnvelope(latestGame.privateStateJson) : null;
  const publicState = persisted ? buildPublicStateForViewer(persisted, viewerUserId) : null;

  return {
    lobby: {
      id: lobby.id,
      code: lobby.code,
      ownerUserId: lobby.ownerUserId,
      status: lobby.status,
      createdAt: lobby.createdAt,
      updatedAt: lobby.updatedAt,
      closedAt: lobby.closedAt,
    },
    players: lobby.players.map((player) => ({
      id: player.id,
      userId: player.userId,
      name: player.user.name,
      seatIndex: player.seatIndex,
      readyState: player.readyState,
      isConnected: player.isConnected,
      joinedAt: player.joinedAt,
      isOwner: lobby.ownerUserId === player.userId,
    })),
    game: latestGame
      ? {
          id: latestGame.id,
          status: latestGame.status,
          startedAt: latestGame.startedAt,
          finishedAt: latestGame.finishedAt,
          currentTurnPlayerId: latestGame.currentTurnPlayerId,
          moveNumber: latestGame.moveNumber,
          publicState,
          players: latestGame.players.map((player) => ({
            userId: player.userId,
            name: player.user.name,
            seatIndex: player.seatIndex,
            status: player.status,
            handCount: player.handCount,
            faceDownCount: player.faceDownCount,
            faceUpCards: player.faceUpCardsJson,
            placement: player.placement,
          })),
        }
      : null,
    events: lobby.events
      .slice()
      .reverse()
      .map((event) => ({
        id: event.id,
        type: event.type,
        actorUserId: event.actorUserId,
        payload: event.payloadJson,
        createdAt: event.createdAt,
      })),
    lobbyLeaderboard,
    lobbyRoundsPlayed: totalFinishedRounds,
    lobbyLastWinner,
  };
}

export async function listOpenOnlineLobbies() {
  await cleanupExpiredLobbies(prisma);

  const lobbies = await prisma.onlineLobby.findMany({
    where: {
      status: {
        in: ["WAITING", "IN_PROGRESS", "FINISHED"],
      },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      players: {
        where: { leftAt: null },
        select: {
          userId: true,
          seatIndex: true,
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    take: 50,
  });

  return lobbies.map((lobby) => ({
    id: lobby.id,
    code: lobby.code,
    ownerUserId: lobby.ownerUserId,
    status: lobby.status,
    createdAt: lobby.createdAt,
    updatedAt: lobby.updatedAt,
    playerCount: lobby.players.length,
    players: lobby.players.map((player) => ({
      userId: player.userId,
      name: player.user.name,
      seatIndex: player.seatIndex,
    })),
  }));
}

export async function exportFinishedOnlineGameToTracker(userId: string, lobbyId: string) {
  return prisma.$transaction(async (tx) => {
    const lobby = await tx.onlineLobby.findUnique({
      where: { id: lobbyId },
      include: {
        games: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!lobby) {
      throw new Error("Lobby not found.");
    }

    const game = lobby.games.find((candidate) => candidate.status === "FINISHED") ?? lobby.games[0];

    if (!game || game.status !== "FINISHED") {
      throw new Error("Only finished online games can be exported.");
    }

    const alreadyExported = await tx.gameSession.findFirst({
      where: {
        title: `Online lobby ${lobby.code} (${game.id.slice(0, 8)})`,
        source: "ONLINE",
      },
      select: { id: true },
    });

    if (alreadyExported) {
      return alreadyExported.id;
    }

    const envelope = getEnvelope(game.privateStateJson);
    const orderedUserIds = [...envelope.game.eliminationOrder];

    if (envelope.game.loserUserId) {
      orderedUserIds.push(envelope.game.loserUserId);
    }

    if (orderedUserIds.length < 2) {
      throw new Error("Online game result is incomplete and cannot be exported.");
    }

    const users = await tx.user.findMany({
      where: {
        id: { in: orderedUserIds },
      },
      select: {
        id: true,
        playerId: true,
      },
    });

    const playerIds = orderedUserIds.map((entryUserId) => {
      const user = users.find((candidate) => candidate.id === entryUserId);

      if (!user?.playerId) {
        throw new Error("Cannot export online result because at least one user is not linked to a player.");
      }

      return user.playerId;
    });

    const session = await createGameSession(
      {
        groupId: undefined,
        ownerUserId: userId,
        title: `Online lobby ${lobby.code} (${game.id.slice(0, 8)})`,
        playedAt: game.finishedAt ?? now(),
        notes: `Imported from online multiplayer match ${game.id}.`,
        participantIds: playerIds,
        trustedAdminUserIds: [],
        createdByUserId: userId,
        source: "ONLINE",
      },
      tx,
    );

    await tx.sessionParticipant.createMany({
      data: playerIds.map((playerId) => ({
        gameSessionId: session.id,
        playerId,
      })),
      skipDuplicates: true,
    });

    const participantRows = await tx.sessionParticipant.findMany({
      where: {
        gameSessionId: session.id,
      },
      select: {
        id: true,
        playerId: true,
      },
    });

    const orderedSessionParticipantIds = playerIds.map((playerId) => {
      const row = participantRows.find((candidate) => candidate.playerId === playerId);

      if (!row) {
        throw new Error("Export participant mapping failed.");
      }

      return row.id;
    });

    await createRound(
      {
        gameSessionId: session.id,
        orderedSessionParticipantIds,
        notes: "Online match final elimination order.",
      },
      tx,
    );

    await appendEvent(tx, {
      lobbyId,
      gameId: game.id,
      actorUserId: userId,
      type: "game_exported",
      payload: {
        gameSessionId: session.id,
      },
    });

    return session.id;
  });
}
