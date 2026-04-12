-- AlterTable
ALTER TABLE "GameSession" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RoundResult" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "GameSession_archivedAt_idx" ON "GameSession"("archivedAt");

-- CreateIndex
CREATE INDEX "Group_archivedAt_idx" ON "Group"("archivedAt");

-- CreateIndex
CREATE INDEX "Player_archivedAt_idx" ON "Player"("archivedAt");

-- CreateIndex
CREATE INDEX "RoundResult_archivedAt_idx" ON "RoundResult"("archivedAt");
