# 13 — Optimize Leaderboard Queries

## Problem

`getRoundHistory` and `getSportsMatchHistory` load the ENTIRE history of all rounds/matches with deep nested includes into application memory for rating computation. This grows linearly with usage.

## Files to Modify

- `lib/db/leaderboards.ts` (lines 64-124)
- `lib/rating/strategy.ts` (if it needs to change how it receives data)

## Implementation Steps

### Option A: Pre-compute ratings (recommended long-term)

1. Add `eloRating` / `openskillMu` / `openskillSigma` columns to `Player` (or a separate `PlayerRating` table per activity type).
2. Update ratings incrementally when a round/match is created (in the same transaction).
3. Leaderboard queries simply `ORDER BY rating DESC LIMIT N`.

### Option B: Incremental computation with caching (quick win)

1. **Add a date filter** to limit history to a reasonable window (e.g., last 6 months):
   ```typescript
   where: {
     archivedAt: null,
     gameSession: {
       playedAt: { gte: sixMonthsAgo },
       // ...other filters
     },
   }
   ```
2. **Add `select` instead of `include`** to fetch only the fields needed for rating computation:
   ```typescript
   select: {
     id: true,
     sequenceNumber: true,
     placements: {
       select: {
         position: true,
         sessionParticipant: { select: { player: { select: { id: true, displayName: true } } } },
       },
     },
   }
   ```
3. **Consider cursor-based pagination** if even the filtered set is too large.

## Acceptance Criteria

- Leaderboard page loads in under 2 seconds even with thousands of historical rounds.
- Ratings are still accurate (or acceptably approximated if using a time window).
- Memory usage for leaderboard computation is bounded.
