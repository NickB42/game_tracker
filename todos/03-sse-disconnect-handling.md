# 03 — Add SSE Client-Disconnect Handling

## Problem

The SSE `ReadableStream` in the stream route has no `cancel()` callback and does not monitor the request's `AbortSignal`. If a client disconnects, the stream continues polling the database every 2 seconds for up to 30 seconds.

## Files to Modify

- `app/api/online/lobbies/[lobbyId]/stream/route.ts`

## Implementation Steps

1. **Wire up the request's `AbortSignal`** to a `closed` flag:
   ```typescript
   export async function GET(request: Request, { params }) {
     const signal = request.signal;
     // ...auth checks...
     
     const stream = new ReadableStream({
       async start(controller) {
         let closed = false;
         
         // Listen to abort signal
         signal.addEventListener("abort", () => {
           closed = true;
           controller.close();
         });
         
         // ... polling loop checks `closed` before each iteration
       },
       cancel() {
         // Stream was cancelled by the client
         // The abort listener already handles cleanup
       },
     });
   }
   ```
2. **Check `closed` at the top of each loop iteration** before calling `getOnlineLobbySnapshot`.
3. **Wrap the `controller.enqueue()` call** in a try-catch to handle the case where the controller is already closed.
4. **Test** by opening a lobby stream in a browser, closing the tab, and verifying server logs show the stream stopped immediately.

## Acceptance Criteria

- Stream stops within one iteration (2s) of client disconnect.
- No errors thrown when client disconnects mid-stream.
- Normal streaming still works for connected clients.
