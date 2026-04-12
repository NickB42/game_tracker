-- Drop obsolete generic result model and enum.
DROP TABLE "Result";
DROP TYPE "ResultKind";

-- Create one short-game round model within a session.
CREATE TABLE "RoundResult" (
    "id" TEXT NOT NULL,
    "gameSessionId" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoundResult_pkey" PRIMARY KEY ("id")
);

-- Create exact finishing placements for every participant in a round.
CREATE TABLE "RoundPlacement" (
    "id" TEXT NOT NULL,
    "roundResultId" TEXT NOT NULL,
    "sessionParticipantId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoundPlacement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RoundResult_gameSessionId_sequenceNumber_key" ON "RoundResult"("gameSessionId", "sequenceNumber");
CREATE INDEX "RoundResult_gameSessionId_idx" ON "RoundResult"("gameSessionId");

CREATE UNIQUE INDEX "RoundPlacement_roundResultId_sessionParticipantId_key" ON "RoundPlacement"("roundResultId", "sessionParticipantId");
CREATE UNIQUE INDEX "RoundPlacement_roundResultId_position_key" ON "RoundPlacement"("roundResultId", "position");
CREATE INDEX "RoundPlacement_sessionParticipantId_idx" ON "RoundPlacement"("sessionParticipantId");
CREATE INDEX "RoundPlacement_position_idx" ON "RoundPlacement"("position");

ALTER TABLE "RoundResult"
ADD CONSTRAINT "RoundResult_gameSessionId_fkey"
FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RoundPlacement"
ADD CONSTRAINT "RoundPlacement_roundResultId_fkey"
FOREIGN KEY ("roundResultId") REFERENCES "RoundResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RoundPlacement"
ADD CONSTRAINT "RoundPlacement_sessionParticipantId_fkey"
FOREIGN KEY ("sessionParticipantId") REFERENCES "SessionParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
