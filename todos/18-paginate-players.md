# 18 — Add Pagination to `getPlayers`

## Problem

`getPlayers` fetches all players with `_count` sub-queries and no limit.

## Files to Modify

- `lib/db/players.ts` (lines 6-19)
- `app/(dashboard)/dashboard/players/page.tsx`

## Implementation Steps

1. **Add pagination parameters** to `getPlayers`:
   ```typescript
   export async function getPlayers(options?: { page?: number; pageSize?: number; search?: string }) {
     const { page = 1, pageSize = 50, search } = options ?? {};
     
     const where = {
       archivedAt: null,
       ...(search ? { displayName: { contains: search, mode: "insensitive" } } : {}),
     };
     
     const players = await prisma.player.findMany({
       where,
       take: pageSize + 1,
       skip: (page - 1) * pageSize,
       orderBy: { displayName: "asc" },
       include: { _count: { select: { sessionParticipants: true } } },
     });
     
     const hasNextPage = players.length > pageSize;
     return { players: players.slice(0, pageSize), hasNextPage, page };
   }
   ```
2. **Update the players page** to pass pagination params and render navigation.
3. **Add search/filter** as an optional enhancement (useful with large player lists).

## Acceptance Criteria

- Players page loads a bounded number of results.
- Pagination navigation works.
- Existing player selection flows (in forms) still work.
