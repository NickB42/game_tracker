-- CreateIndex
CREATE INDEX "GameSession_groupId_playedAt_idx" ON "GameSession"("groupId", "playedAt");

-- CreateIndex
CREATE INDEX "GameSession_activityType_archivedAt_playedAt_idx" ON "GameSession"("activityType", "archivedAt", "playedAt");

-- CreateIndex
CREATE INDEX "RoundResult_gameSessionId_archivedAt_idx" ON "RoundResult"("gameSessionId", "archivedAt");
