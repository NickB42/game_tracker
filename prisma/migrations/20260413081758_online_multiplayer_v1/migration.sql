-- CreateEnum
CREATE TYPE "GameSessionSource" AS ENUM ('MANUAL', 'ONLINE');

-- CreateEnum
CREATE TYPE "OnlineLobbyStatus" AS ENUM ('WAITING', 'IN_PROGRESS', 'FINISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "OnlineGamePlayerStatus" AS ENUM ('ACTIVE', 'OUT', 'LOST');

-- CreateEnum
CREATE TYPE "OnlineGameStatus" AS ENUM ('IN_PROGRESS', 'FINISHED', 'CLOSED');

-- AlterTable
ALTER TABLE "GameSession" ADD COLUMN     "source" "GameSessionSource" NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "OnlineLobby" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "status" "OnlineLobbyStatus" NOT NULL DEFAULT 'WAITING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "emptySince" TIMESTAMP(3),

    CONSTRAINT "OnlineLobby_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnlineLobbyPlayer" (
    "id" TEXT NOT NULL,
    "lobbyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "isConnected" BOOLEAN NOT NULL DEFAULT true,
    "seatIndex" INTEGER NOT NULL,
    "readyState" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnlineLobbyPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnlineGame" (
    "id" TEXT NOT NULL,
    "lobbyId" TEXT NOT NULL,
    "status" "OnlineGameStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "currentTurnPlayerId" TEXT,
    "moveNumber" INTEGER NOT NULL DEFAULT 0,
    "drawPileCount" INTEGER NOT NULL DEFAULT 0,
    "discardPileState" JSONB NOT NULL,
    "publicStateJson" JSONB NOT NULL,
    "privateStateJson" JSONB NOT NULL,
    "eliminationOrderJson" JSONB NOT NULL,
    "loserUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnlineGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnlineGamePlayer" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seatIndex" INTEGER NOT NULL,
    "status" "OnlineGamePlayerStatus" NOT NULL DEFAULT 'ACTIVE',
    "handCount" INTEGER NOT NULL DEFAULT 0,
    "faceDownCount" INTEGER NOT NULL DEFAULT 3,
    "faceUpCardsJson" JSONB NOT NULL,
    "privateStateJson" JSONB NOT NULL,
    "placement" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnlineGamePlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnlineGameEvent" (
    "id" TEXT NOT NULL,
    "lobbyId" TEXT NOT NULL,
    "gameId" TEXT,
    "actorUserId" TEXT,
    "type" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnlineGameEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OnlineLobby_code_key" ON "OnlineLobby"("code");

-- CreateIndex
CREATE INDEX "OnlineLobby_status_idx" ON "OnlineLobby"("status");

-- CreateIndex
CREATE INDEX "OnlineLobby_ownerUserId_idx" ON "OnlineLobby"("ownerUserId");

-- CreateIndex
CREATE INDEX "OnlineLobby_updatedAt_idx" ON "OnlineLobby"("updatedAt");

-- CreateIndex
CREATE INDEX "OnlineLobbyPlayer_userId_idx" ON "OnlineLobbyPlayer"("userId");

-- CreateIndex
CREATE INDEX "OnlineLobbyPlayer_leftAt_idx" ON "OnlineLobbyPlayer"("leftAt");

-- CreateIndex
CREATE UNIQUE INDEX "OnlineLobbyPlayer_lobbyId_userId_key" ON "OnlineLobbyPlayer"("lobbyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "OnlineLobbyPlayer_lobbyId_seatIndex_key" ON "OnlineLobbyPlayer"("lobbyId", "seatIndex");

-- CreateIndex
CREATE INDEX "OnlineGame_status_idx" ON "OnlineGame"("status");

-- CreateIndex
CREATE INDEX "OnlineGame_currentTurnPlayerId_idx" ON "OnlineGame"("currentTurnPlayerId");

-- CreateIndex
CREATE INDEX "OnlineGame_loserUserId_idx" ON "OnlineGame"("loserUserId");

-- CreateIndex
CREATE UNIQUE INDEX "OnlineGame_lobbyId_key" ON "OnlineGame"("lobbyId");

-- CreateIndex
CREATE INDEX "OnlineGamePlayer_userId_idx" ON "OnlineGamePlayer"("userId");

-- CreateIndex
CREATE INDEX "OnlineGamePlayer_status_idx" ON "OnlineGamePlayer"("status");

-- CreateIndex
CREATE INDEX "OnlineGamePlayer_placement_idx" ON "OnlineGamePlayer"("placement");

-- CreateIndex
CREATE UNIQUE INDEX "OnlineGamePlayer_gameId_userId_key" ON "OnlineGamePlayer"("gameId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "OnlineGamePlayer_gameId_seatIndex_key" ON "OnlineGamePlayer"("gameId", "seatIndex");

-- CreateIndex
CREATE INDEX "OnlineGameEvent_lobbyId_createdAt_idx" ON "OnlineGameEvent"("lobbyId", "createdAt");

-- CreateIndex
CREATE INDEX "OnlineGameEvent_gameId_createdAt_idx" ON "OnlineGameEvent"("gameId", "createdAt");

-- CreateIndex
CREATE INDEX "OnlineGameEvent_actorUserId_idx" ON "OnlineGameEvent"("actorUserId");

-- AddForeignKey
ALTER TABLE "OnlineLobby" ADD CONSTRAINT "OnlineLobby_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineLobbyPlayer" ADD CONSTRAINT "OnlineLobbyPlayer_lobbyId_fkey" FOREIGN KEY ("lobbyId") REFERENCES "OnlineLobby"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineLobbyPlayer" ADD CONSTRAINT "OnlineLobbyPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineGame" ADD CONSTRAINT "OnlineGame_lobbyId_fkey" FOREIGN KEY ("lobbyId") REFERENCES "OnlineLobby"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineGamePlayer" ADD CONSTRAINT "OnlineGamePlayer_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "OnlineGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineGamePlayer" ADD CONSTRAINT "OnlineGamePlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineGameEvent" ADD CONSTRAINT "OnlineGameEvent_lobbyId_fkey" FOREIGN KEY ("lobbyId") REFERENCES "OnlineLobby"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineGameEvent" ADD CONSTRAINT "OnlineGameEvent_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "OnlineGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineGameEvent" ADD CONSTRAINT "OnlineGameEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
