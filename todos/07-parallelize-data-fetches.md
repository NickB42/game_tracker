# 07 — Parallelize Independent Data Fetches

## Problem

Several pages and actions await independent queries sequentially, adding unnecessary latency.

## Files to Modify

- `app/(dashboard)/dashboard/sessions/page.tsx` (lines 48-63)
- `app/(dashboard)/dashboard/leaderboards/groups/[groupId]/page.tsx` (lines 35-43)
- `actions/groups.ts` (lines 158-179)

## Implementation Steps

1. **Sessions page** — parallelize `getGroups` and `getGameSessions`:
   ```typescript
   const user = await requireAuthenticatedUser();
   const sp = await searchParams;
   const filter = parseFilterState(sp);
   
   const [groups, { sessions, hasNextPage }] = await Promise.all([
     getGroups(user),
     getGameSessions(user, { activityType: filter.activityType, groupId: filter.groupId }),
   ]);
   ```

2. **Group leaderboard page** — parallelize group fetch and leaderboard computation:
   ```typescript
   const user = await requireAuthenticatedUser();
   const { groupId } = await params;
   
   const [group, leaderboard] = await Promise.all([
     getGroupById(groupId, user),
     getGroupLeaderboard(groupId, user),
   ]);
   if (!group) notFound();
   ```

3. **Group update action** — parallelize `setGroupTrustedAdmins` and `setGroupMembers`:
   ```typescript
   await Promise.all([
     setGroupTrustedAdmins(tx, groupId, trustedAdminUserIds),
     setGroupMembers(tx, groupId, memberPlayerIds),
   ]);
   ```

## Acceptance Criteria

- Pages with 2+ independent queries execute them in parallel.
- No functional regressions — authorization still checked before data access.
- Measurable improvement (~100-200ms) on pages with multiple queries.
