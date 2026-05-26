# 12 — Deduplicate Auth in API Routes

## Problem

`requireApiAuthenticatedUser` in `lib/auth/api-guards.ts` performs 2 DB calls on every API request (session lookup + user query). For the SSE stream route that runs every 2 seconds, this adds up. Unlike React server components, API routes can't use React's `cache()`.

## Files to Modify

- `lib/auth/api-guards.ts`
- `app/api/online/lobbies/[lobbyId]/stream/route.ts`

## Implementation Steps

1. **For the SSE stream route**, authenticate once at the start and reuse the user object for all iterations:
   ```typescript
   export async function GET(request: Request, { params }) {
     const user = await requireApiAuthenticatedUser(); // auth ONCE
     
     const stream = new ReadableStream({
       async start(controller) {
         // Use `user` throughout the loop — don't re-auth each tick
         while (!closed) {
           const snapshot = await getOnlineLobbySnapshot(lobbyId, user.id);
           // ...
         }
       },
     });
   }
   ```
2. **For other API routes** (move, chat, events), keep per-request auth since those are one-shot handlers.
3. **Consider session expiry** — for long-running streams, optionally re-validate auth every N iterations (e.g., every 30s = every 15 iterations) rather than every tick.

## Acceptance Criteria

- SSE stream authenticates once at connection start, not every 2 seconds.
- If a session expires mid-stream, the stream terminates gracefully within ~30s.
- Non-streaming API routes still authenticate per-request.
