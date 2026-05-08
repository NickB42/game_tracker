# 15 — Fix Missing Cache Revalidation

## Problem

Several mutations don't revalidate dependent pages, causing stale data:
- Sports match creation doesn't revalidate leaderboard paths.
- Player name changes don't revalidate sessions/leaderboards.
- Group name changes don't revalidate session detail pages.

## Files to Modify

- `actions/matches.ts` (lines 91-93)
- `actions/players.ts` (lines 87-88)
- `actions/groups.ts` (lines 207-208)

## Implementation Steps

1. **In `actions/matches.ts`** — add leaderboard revalidation after match mutations:
   ```typescript
   function revalidateSportsSessionPaths(sessionId: string) {
     revalidatePath(`/dashboard/sessions/${sessionId}`);
     revalidatePath("/dashboard/sessions");
     revalidatePath("/dashboard/leaderboards/global");
     // Also revalidate group leaderboard if the session has a group
   }
   ```

2. **In `actions/players.ts`** — after `updatePlayer`:
   ```typescript
   revalidatePath("/dashboard/sessions");
   revalidatePath("/dashboard/leaderboards/global");
   revalidatePath("/dashboard/players");
   ```

3. **In `actions/groups.ts`** — after group update:
   ```typescript
   revalidatePath("/dashboard/sessions");
   revalidatePath(`/dashboard/leaderboards/groups/${groupId}`);
   ```

4. **Be careful not to over-revalidate** — only add paths that genuinely display the changed data.

## Acceptance Criteria

- Sports match leaderboards update immediately after match creation.
- Player name changes reflect on sessions and leaderboards without manual refresh.
- Group name changes reflect on session pages without manual refresh.
