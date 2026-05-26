# 02 — Debounce `cleanupExpiredLobbies`

## Problem

`cleanupExpiredLobbies` scans ALL non-closed lobbies and issues individual UPDATE queries per stale lobby. It runs on every SSE tick, every GET, and every lobby create/join/leave — potentially hundreds of times per minute with multiple connected clients.

## Files to Modify

- `lib/db/online.ts` (lines 96-146 and all call sites at ~lines 277, 339, 390, 838)

## Implementation Steps

1. **Add a module-level timestamp guard** in `lib/db/online.ts`:
   ```typescript
   let lastCleanupAt = 0;
   const CLEANUP_INTERVAL_MS = 60_000; // run at most once per minute
   
   async function maybeCleanupExpiredLobbies(db: Db) {
     const now = Date.now();
     if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
     lastCleanupAt = now;
     await cleanupExpiredLobbies(db);
   }
   ```
2. **Replace all direct `cleanupExpiredLobbies()` calls** with `maybeCleanupExpiredLobbies()`.
3. **Batch the updates inside `cleanupExpiredLobbies`** — replace the loop of individual `db.onlineLobby.update()` calls with a single `updateMany` where possible, or use `Promise.all` for the ones that need individual event appends.
4. **Remove `cleanupExpiredLobbies` from `getOnlineLobbySnapshot`** (line 839) — a read-heavy function should never trigger writes. Rely on the debounced version in mutation paths only.

## Acceptance Criteria

- `cleanupExpiredLobbies` executes at most once per 60 seconds regardless of how many clients are polling.
- Read paths (`getOnlineLobbySnapshot`) do not trigger lobby cleanup writes.
- Stale lobbies are still cleaned up within ~1 minute of expiring.
