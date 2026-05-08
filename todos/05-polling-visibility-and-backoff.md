# 05 — Add Visibility Check and Backoff to Polling

## Problem

Polling intervals run continuously with no regard for browser tab visibility, game completion state, or errors. Background tabs generate continuous server load indefinitely.

## Files to Modify

- `components/online/lobby-live-view.tsx` (line 79)

## Implementation Steps

1. **Add a `document.visibilitychange` listener** that pauses/resumes the polling interval:
   ```typescript
   useEffect(() => {
     const handleVisibility = () => {
       if (document.hidden) {
         clearInterval(intervalRef.current);
       } else {
         // Resume polling immediately with a fetch, then restart interval
         fetchSnapshot();
         intervalRef.current = setInterval(fetchSnapshot, 2000);
       }
     };
     document.addEventListener("visibilitychange", handleVisibility);
     return () => document.removeEventListener("visibilitychange", handleVisibility);
   }, []);
   ```
2. **Stop polling when the lobby is in a terminal state** (`FINISHED` or `CLOSED`):
   ```typescript
   if (snapshot.lobby.status === "FINISHED" || snapshot.lobby.status === "CLOSED") {
     clearInterval(intervalRef.current);
   }
   ```
3. **Add exponential backoff on fetch errors**:
   - Start with 2s interval
   - On error, double the interval (cap at 30s)
   - On success, reset to 2s
4. **Use `useRef`** for the interval ID to avoid stale closures.

## Acceptance Criteria

- Polling pauses when the browser tab is hidden and resumes when visible.
- Polling stops entirely when the lobby status is FINISHED or CLOSED.
- Network errors trigger backoff rather than hammering the server at 2s.
- Normal gameplay polling remains at 2s when healthy and visible.
