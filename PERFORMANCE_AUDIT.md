# Performance Audit

**Date:** 2026-05-08  
**Scope:** Full-stack analysis of database, server actions, API routes, and frontend rendering.

---

## Executive Summary

The primary performance bottlenecks stem from:

1. **Online lobby polling architecture** — duplicate 2-second polling loops, expensive snapshot computation on every tick, and no client-disconnect handling on SSE streams.
2. **`cleanupExpiredLobbies` running in the critical path** — a write-heavy O(N) cleanup function executes on every read/write operation in the online system.
3. **Unbounded queries** — session lists, player lists, and leaderboard history have no pagination or limits, loading entire tables into memory.
4. **Missing Suspense boundaries and sequential data fetching** — pages block entirely until all queries resolve, with no streaming or parallelism.

---

## Critical Issues (HIGH Impact)

### 1. Duplicate Polling in Online Lobby Page

**Files:** `app/(dashboard)/dashboard/online-play/[lobbyId]/page.tsx`, `components/online/lobby-page-revalidator.tsx`, `components/online/lobby-live-view.tsx`

Two independent 2-second polling loops run simultaneously:
- `LobbyPageRevalidator` calls `router.refresh()` every 2000ms, re-executing the entire server component tree.
- `LobbyLiveView` fetches `/api/online/lobbies/${lobbyId}` every 2000ms via `setInterval`.

This **doubles network traffic and server load** for every active lobby viewer. The `router.refresh()` additionally causes a full React Server Component re-render on the server, whose output is then ignored by the client-side state.

**Fix:** Remove one polling mechanism. Use either SSE (already partially implemented in `stream/route.ts`) or the client-side fetch alone. If using `router.refresh()`, remove the client-side `setInterval`.

---

### 2. `cleanupExpiredLobbies` Runs on Every Request

**File:** `lib/db/online.ts` (lines 96-146, called at line 839)

This function scans ALL non-closed lobbies with their players, then issues individual `UPDATE` queries in a loop for each stale lobby. It is called on:
- Every SSE tick (every 2s per client)
- Every GET to the lobby route
- Every lobby create/join/leave operation

For N connected clients polling every 2 seconds, this means N/2 full lobby table scans per second, each potentially writing to multiple rows.

**Fix:** Move to a background cron job (run at most once per minute) or add an in-memory timestamp guard so it runs at most once every 60 seconds regardless of caller frequency.

---

### 3. SSE Stream Has No Client-Disconnect Detection

**File:** `app/api/online/lobbies/[lobbyId]/stream/route.ts` (lines 34-58)

The `ReadableStream` uses `start()` but never registers a `cancel()` callback. If the client disconnects, the stream continues polling the database every 2 seconds for up to 30 seconds. No `AbortSignal` is monitored.

Each iteration calls `getOnlineLobbySnapshot()` which is itself extremely expensive (see #4).

**Fix:** Add a `cancel()` handler to the `ReadableStream` and wire up the request's `AbortSignal` to break out of the polling loop on disconnect.

---

### 4. `getOnlineLobbySnapshot` Is Extremely Expensive

**File:** `lib/db/online.ts` (lines 838-1003)

Every 2 seconds per connected client, this function executes:
1. `cleanupExpiredLobbies` — full lobby table scan with writes
2. Large `findUnique` with nested includes (lobby + players + games + last 50 events)
3. `findMany` for up to 200 finished games with full `privateStateJson` blobs
4. Deserialization of every finished game's full state to extract winner user IDs
5. Additional `user.findMany` for leaderboard display names
6. `buildPublicStateForViewer` which calls `getLegalMoves` (combinatorial)

**Fix:** Store `winnerUserId` directly on `OnlineGame` to avoid deserializing 200 game states. Separate the leaderboard/history data from the real-time game state — compute leaderboard only on status changes. Cache cleanup results.

---

### 5. Unbounded `getGameSessions` Query

**File:** `lib/db/sessions.ts` (lines 60-112)

Fetches ALL game sessions visible to the user with multiple joins (`group`, `createdByUser`, `ownerUser`, `trustedAdmins`, `_count`), no `take` or `skip` parameter. As sessions accumulate, this becomes progressively slower.

**Fix:** Add cursor-based or offset pagination with a reasonable default limit (e.g., 25-50 per page).

---

### 6. Unbounded Leaderboard History Queries

**File:** `lib/db/leaderboards.ts` (lines 64-124)

`getRoundHistory` and `getSportsMatchHistory` load the ENTIRE history of all rounds/matches with deep nested includes. All data is loaded into application memory for in-app rating computation rather than database aggregation.

**Fix:** Either:
- Add a materialized summary table / pre-computed ratings column updated on each round/match creation.
- Use database-level aggregation queries.
- At minimum, add date-range filtering.

---

### 7. Aggressive Polling Without Visibility Check or Backoff

**Files:** `components/online/lobby-live-view.tsx` (line 79), `components/online/lobby-page-revalidator.tsx` (line 19)

Both polling intervals:
- Run continuously at 2s with no exponential backoff on errors.
- Do not pause when the browser tab is not visible (`document.visibilityState`).
- Do not stop when lobby status is `FINISHED` or `CLOSED`.

Users who leave a lobby tab open in the background generate continuous server load indefinitely.

**Fix:** Add `document.visibilitychange` listener to pause polling when hidden. Stop polling when game is finished. Add exponential backoff on errors.

---

### 8. N+1 Query in `syncOnlineGamePlayers`

**File:** `lib/db/online.ts` (lines 227-248)

Issues one `UPDATE` query per player after every game move (2-5 players). In a fast-paced multiplayer game, this causes sequential DB round-trips on every single move.

**Fix:** Batch updates using a single raw SQL `UPDATE ... CASE` statement or `Promise.all` for parallel execution.

---

## Medium Impact Issues

### 9. Double DB Hit in `requireAuthenticatedUser`

**File:** `lib/auth/guards.ts` (lines 16-42)

Every server action and API route calls this function which makes TWO async calls:
1. `auth.api.getSession()` — session store/DB lookup
2. `prisma.user.findUnique()` — additional DB call for role/metadata

The dashboard layout calls it, then each page calls it again. Some pages call it 3 times total.

**Fix:** Use React's `cache()` wrapper (available in Next.js server components) to deduplicate within a single request. Or enrich the auth session with role/metadata to eliminate the second query.

---

### 10. No Suspense Boundaries Anywhere

**Files:** All page components under `app/(dashboard)/dashboard/`

Zero `<Suspense>` boundaries exist. The only loading state is a single `dashboard/loading.tsx`. All data fetching blocks the entire page render — users see nothing until all queries complete. No streaming is possible.

**Fix:** Add `<Suspense>` boundaries around data-dependent sections. Create per-route `loading.tsx` files for the main sub-routes (sessions, leaderboards, players, groups, online-play).

---

### 11. Sequential Data Fetching Where Parallel Is Possible

**Files:**
- `app/(dashboard)/dashboard/sessions/page.tsx` (lines 48-63): `getGroups` then `getGameSessions` sequentially
- `app/(dashboard)/dashboard/leaderboards/groups/[groupId]/page.tsx` (lines 35-43): `getGroupById` then `getGroupLeaderboard`
- `actions/groups.ts` (lines 158-179): `setGroupTrustedAdmins` then `setGroupMembers`

**Fix:** Use `Promise.all` for independent operations.

---

### 12. AppShell Is a Client Component Wrapping All Content

**File:** `components/ui/app-shell.tsx` (line 1: `"use client"`)

The entire application shell is a client component. Only `usePathname()` requires client-side logic. This forces the entire subtree to be serialized across the client boundary, inflating the RSC payload.

**Fix:** Extract the pathname-dependent nav-highlighting into a small client component. Keep the shell structure as a server component.

---

### 13. Missing Leaderboard Revalidation for Sports Matches

**File:** `actions/matches.ts` (lines 91-93)

Sports match creation/update does NOT revalidate leaderboard paths. If leaderboards incorporate match results, they serve stale data after mutations.

**Fix:** Add leaderboard path revalidation in `revalidateSportsSessionPaths`.

---

### 14. Missing Revalidation After Player/Group Name Changes

**Files:** `actions/players.ts` (lines 87-88), `actions/groups.ts` (lines 207-208)

When a player's `displayName` or a group's `name` is updated, sessions and leaderboards that display those names serve stale data.

**Fix:** Revalidate session and leaderboard paths after name changes.

---

### 15. Over-Fetching 200 Full Game State Blobs

**File:** `lib/db/online.ts` (lines 884-894)

Fetches up to 200 finished games with full `privateStateJson` (entire game state: deck, all hands, history) just to extract winner user IDs.

**Fix:** Add a `loserUserId` / `winnerUserId` column on `OnlineGame` (the schema already has `loserUserId`) and query that directly.

---

### 16. `getLegalMoves` Combinatorial Explosion

**File:** `lib/online/shithead-engine.ts` (lines 404-435, 549-618)

`cardCombinationsByRank` generates ALL subset combinations of cards grouped by rank. After a pile pickup (20+ cards), this can generate hundreds of combinations. This runs on every SSE tick via `buildPublicStateForViewer`.

**Fix:** Cap the combination generation (e.g., only show singles and pairs in UI) or lazily compute on demand rather than every tick.

---

### 17. Large JSON Payloads — `burnedPileHistory` in Every Snapshot

**File:** `lib/db/online.ts` (lines 197, 209)

`buildPublicStateForViewer` includes the full `burnedPileHistory` — every pile ever burned in the game. In long games, this array grows without bound and is sent every 2 seconds per client (50-100KB+ payloads).

**Fix:** Omit `burnedPileHistory` from the real-time streaming payload (or send it once, then send only incremental burns).

---

## Low Impact Issues

### 18. Unbounded `getPlayers` Query

**File:** `lib/db/players.ts` (lines 6-19)

Fetches all players with `_count` sub-queries with no limit or pagination.

---

### 19. Missing Composite Database Indexes

**File:** `prisma/schema.prisma`

Missing composite indexes that would optimize common query patterns:
- `GameSession(groupId, playedAt)` — leaderboard queries filter by group, order by date
- `GameSession(activityType, archivedAt, playedAt)` — session list filtering
- `RoundResult(gameSessionId, archivedAt)` — leaderboard round queries

---

### 20. `Intl.DateTimeFormat` Recreated Per Call

**Files:** `app/(dashboard)/dashboard/sessions/page.tsx` (lines 33-38), `sessions/[id]/page.tsx` (lines 82-87)

A new formatter instance is created on every call inside a loop. Should be defined at module scope.

---

### 21. Redundant Count Query in `updateGameSession`

**File:** `lib/db/sessions.ts` (lines 230-285)

`getSessionEditLockReasons` issues a separate `count` query for round results after already fetching `_count.roundResults` in the initial `findUnique`.

---

## Recommended Priority Order

| Priority | Action | Expected Improvement |
|----------|--------|---------------------|
| 1 | Remove duplicate polling (keep one mechanism) | 50% reduction in online lobby server load |
| 2 | Move `cleanupExpiredLobbies` to background/debounced | Eliminates O(N) writes from every read path |
| 3 | Add SSE `cancel()` handler + AbortSignal | Stops zombie streams from burning resources |
| 4 | Add pagination to `getGameSessions` and leaderboard queries | Prevents linear degradation as data grows |
| 5 | Add `document.visibilitychange` and terminal-state checks to polling | Eliminates background-tab load |
| 6 | Add Suspense boundaries + per-route loading states | Perceived performance improvement on navigation |
| 7 | Parallelize independent data fetches with `Promise.all` | ~100-200ms saved per page with 2+ queries |
| 8 | Cache `requireAuthenticatedUser` per request | Eliminates 1-2 redundant DB calls per page |
| 9 | Store winner on `OnlineGame` row, stop fetching 200 game blobs | Major reduction in snapshot computation |
| 10 | Add composite database indexes | Faster query execution at scale |
