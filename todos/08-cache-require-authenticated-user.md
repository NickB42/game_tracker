# 08 — Cache `requireAuthenticatedUser` Per Request

## Problem

`requireAuthenticatedUser` makes 2 DB calls (session lookup + user query) and is called multiple times per request — once in the layout, once in the page, sometimes more. These are not deduplicated.

## Files to Modify

- `lib/auth/guards.ts` (lines 16-42)

## Implementation Steps

1. **Wrap `requireAuthenticatedUser` with React's `cache()`**:
   ```typescript
   import { cache } from "react";
   
   export const requireAuthenticatedUser = cache(async () => {
     const session = await auth.api.getSession({ headers: await headers() });
     if (!session?.user?.id) redirect("/login");
     
     const user = await prisma.user.findUnique({
       where: { id: session.user.id },
       select: { id: true, role: true, playerId: true, mustChangePassword: true, name: true, email: true },
     });
     if (!user) redirect("/login");
     return user;
   });
   ```
2. **Verify that all existing call sites** still work (the function signature remains the same).
3. **Also consider wrapping `auth.api.getSession`** with `cache()` if it's called independently elsewhere (e.g., in `api-guards.ts`).
4. **Note:** `cache()` only deduplicates within a single React server component render pass. It won't affect API routes or server actions — those get their own request scope, which is correct behavior.

## Acceptance Criteria

- Multiple calls to `requireAuthenticatedUser` within the same page render result in only 1 session lookup + 1 user query.
- Auth still works correctly — redirects to login when unauthenticated.
- API routes and server actions still independently verify auth.
