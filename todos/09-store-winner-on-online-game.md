# 09 — Store Winner on `OnlineGame` Row

## Problem

`getOnlineLobbySnapshot` fetches up to 200 finished games with full `privateStateJson` blobs (entire game state) just to extract winner user IDs for the leaderboard. The schema already has `loserUserId` but no `winnerUserId`.

## Files to Modify

- `prisma/schema.prisma` — add `winnerUserId` field to `OnlineGame`
- `lib/db/online.ts` — update game-finish logic to set `winnerUserId`; update `getOnlineLobbySnapshot` to query `winnerUserId` directly
- New migration file

## Implementation Steps

1. **Add `winnerUserId` column** to the `OnlineGame` model:
   ```prisma
   model OnlineGame {
     // ...existing fields...
     winnerUserId String?
     // ...
   }
   ```
2. **Create a migration**:
   ```bash
   npm run prisma:migrate:dev -- --name add_winner_user_id
   ```
3. **Update game-finish logic** in `lib/db/online.ts` — wherever a game is marked `FINISHED`, also set `winnerUserId` (the last remaining player, or derived from elimination order).
4. **Update `getOnlineLobbySnapshot`** (around lines 884-924):
   - Replace the `findMany` that fetches `privateStateJson` from 200 games with:
     ```typescript
     const finishedGames = await prisma.onlineGame.findMany({
       where: { lobbyId, status: "FINISHED" },
       select: { winnerUserId: true },
     });
     ```
   - Remove the JSON deserialization loop.
5. **Backfill existing data** — write a one-time script or migration that reads existing finished games' `privateStateJson`, extracts winner, and sets `winnerUserId`.

## Acceptance Criteria

- `getOnlineLobbySnapshot` no longer fetches or deserializes full game state blobs for the leaderboard.
- Winner is correctly stored on game completion.
- Existing lobby leaderboards still display correct win counts.
