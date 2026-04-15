-- Phase 1 foundation for multi-activity support.
-- Backward-compatible: existing legacy data is backfilled to CARD before NOT NULL is enforced.

CREATE TYPE "ActivityType" AS ENUM ('CARD', 'SQUASH', 'PADEL');

ALTER TABLE "Group" ADD COLUMN "activityType" "ActivityType";
ALTER TABLE "GameSession" ADD COLUMN "activityType" "ActivityType";

UPDATE "Group"
SET "activityType" = 'CARD'
WHERE "activityType" IS NULL;

UPDATE "GameSession"
SET "activityType" = 'CARD'
WHERE "activityType" IS NULL;

ALTER TABLE "Group"
  ALTER COLUMN "activityType" SET NOT NULL,
  ALTER COLUMN "activityType" SET DEFAULT 'CARD';

ALTER TABLE "GameSession"
  ALTER COLUMN "activityType" SET NOT NULL,
  ALTER COLUMN "activityType" SET DEFAULT 'CARD';

CREATE INDEX "Group_activityType_idx" ON "Group"("activityType");
CREATE INDEX "GameSession_activityType_idx" ON "GameSession"("activityType");

CREATE TABLE "Match" (
  "id" TEXT NOT NULL,
  "gameSessionId" TEXT NOT NULL,
  "sequenceNumber" INTEGER NOT NULL,
  "notes" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MatchParticipant" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "sideNumber" INTEGER,
  "seatOrder" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MatchParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MatchResult" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "winningSideNumber" INTEGER,
  "isDraw" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MatchResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MatchScoreLine" (
  "id" TEXT NOT NULL,
  "matchResultId" TEXT NOT NULL,
  "sequenceNumber" INTEGER NOT NULL,
  "sideNumber" INTEGER NOT NULL,
  "score" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MatchScoreLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Match_gameSessionId_sequenceNumber_key" ON "Match"("gameSessionId", "sequenceNumber");
CREATE INDEX "Match_gameSessionId_idx" ON "Match"("gameSessionId");

CREATE UNIQUE INDEX "MatchParticipant_matchId_playerId_key" ON "MatchParticipant"("matchId", "playerId");
CREATE INDEX "MatchParticipant_playerId_idx" ON "MatchParticipant"("playerId");
CREATE INDEX "MatchParticipant_matchId_sideNumber_idx" ON "MatchParticipant"("matchId", "sideNumber");

CREATE UNIQUE INDEX "MatchResult_matchId_key" ON "MatchResult"("matchId");

CREATE UNIQUE INDEX "MatchScoreLine_matchResultId_sequenceNumber_sideNumber_key" ON "MatchScoreLine"("matchResultId", "sequenceNumber", "sideNumber");
CREATE INDEX "MatchScoreLine_matchResultId_sequenceNumber_idx" ON "MatchScoreLine"("matchResultId", "sequenceNumber");

ALTER TABLE "Match"
  ADD CONSTRAINT "Match_gameSessionId_fkey"
  FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MatchParticipant"
  ADD CONSTRAINT "MatchParticipant_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MatchParticipant"
  ADD CONSTRAINT "MatchParticipant_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MatchResult"
  ADD CONSTRAINT "MatchResult_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MatchScoreLine"
  ADD CONSTRAINT "MatchScoreLine_matchResultId_fkey"
  FOREIGN KEY ("matchResultId") REFERENCES "MatchResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
