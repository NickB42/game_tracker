# 20 — Remove Redundant Count Query in `updateGameSession`

## Problem

`getSessionEditLockReasons` issues a separate `count` query for round results, but the round count was already fetched via `_count.roundResults` in the preceding `findUnique` call.

## Files to Modify

- `lib/db/sessions.ts` (lines 230-285)

## Implementation Steps

1. **Pass the already-fetched count** to `getSessionEditLockReasons` instead of letting it query again:
   ```typescript
   const existing = await prisma.gameSession.findUnique({
     where: { id },
     include: { _count: { select: { roundResults: true, matches: true } } },
   });
   
   // Pass counts directly instead of re-querying
   const lockReasons = getSessionEditLockReasons(existing._count);
   ```
2. **Update `getSessionEditLockReasons`** to accept counts as a parameter rather than performing its own DB query.
3. **Verify** that the lock reasons logic still works correctly (check if it uses any other data beyond the count).

## Acceptance Criteria

- One fewer DB query per `updateGameSession` call.
- Lock reason logic still correctly prevents edits when rounds/matches exist.
