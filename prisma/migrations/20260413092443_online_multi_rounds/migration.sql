-- DropIndex
DROP INDEX "OnlineGame_lobbyId_key";

-- CreateIndex
CREATE INDEX "OnlineGame_lobbyId_idx" ON "OnlineGame"("lobbyId");
