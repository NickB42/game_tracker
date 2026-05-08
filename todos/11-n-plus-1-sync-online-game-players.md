# 11 — Batch `syncOnlineGamePlayers` Updates

## Problem

`syncOnlineGamePlayers` issues one `UPDATE` query per player (2-5) after every game move, causing sequential DB round-trips in a latency-sensitive real-time path.

## Files to Modify

- `lib/db/online.ts` (lines 227-248)

## Implementation Steps

1. **Replace the sequential loop** with `Promise.all`:
   ```typescript
   async function syncOnlineGamePlayers(db: Db, gameId: string, envelope: PersistedGameEnvelope) {
     await Promise.all(
       envelope.game.players.map((player) =>
         db.onlineGamePlayer.updateMany({
           where: { gameId, userId: player.userId },
           data: {
             status: player.status,
             handCount: player.handCount,
             faceDownCount: player.faceDownCount,
             faceUpCardsJson: player.faceUpCards,
             privateStateJson: player.privateState,
             placement: player.placement,
           },
         })
       )
     );
   }
   ```
2. **Alternative (if even more performance is needed):** Use a single raw SQL statement with `CASE WHEN`:
   ```typescript
   await db.$executeRaw`
     UPDATE "OnlineGamePlayer"
     SET status = CASE user_id ... END,
         hand_count = CASE user_id ... END
     WHERE game_id = ${gameId}
   `;
   ```
3. **Test** with a multiplayer game to ensure all player states sync correctly after each move.

## Acceptance Criteria

- All player updates execute in parallel (or as a single SQL statement) rather than sequentially.
- Game state remains consistent after moves.
- Reduced latency on the move endpoint (measurable with 4-5 players).
