# 04 — Add Pagination to `getGameSessions`

## Problem

`getGameSessions` fetches ALL sessions visible to the user with multiple joins and no limit. As data grows, this becomes increasingly slow.

## Files to Modify

- `lib/db/sessions.ts` — `getGameSessions` function (lines 60-112)
- `app/(dashboard)/dashboard/sessions/page.tsx` — pass pagination params and render pagination controls
- `lib/validation/session.ts` — add pagination schema if needed

## Implementation Steps

1. **Add pagination parameters** to `getGameSessions`:
   ```typescript
   interface PaginationOptions {
     page?: number;
     pageSize?: number; // default 25
   }
   ```
2. **Add `take` and `skip`** to the Prisma query:
   ```typescript
   take: pageSize + 1,  // fetch one extra to know if there's a next page
   skip: (page - 1) * pageSize,
   ```
3. **Return pagination metadata** alongside results:
   ```typescript
   return { sessions, hasNextPage, hasPreviousPage, page, pageSize };
   ```
4. **Update `sessions/page.tsx`** to:
   - Read `page` from searchParams
   - Pass pagination to `getGameSessions`
   - Render prev/next navigation links
5. **Keep existing filters** (activity type, group, archive status) working alongside pagination.

## Acceptance Criteria

- Sessions page loads a maximum of 25 sessions per page (configurable).
- Prev/Next navigation works with all existing filters preserved in the URL.
- Page loads noticeably faster with large datasets.
