# 17 — Reduce Snapshot Payload Size

## Problem

`buildPublicStateForViewer` includes `burnedPileHistory` (every pile ever burned in the game) in every snapshot. In long games this grows without bound, and the full payload (50-100KB+) is sent every 2 seconds per client.

## Files to Modify

- `lib/db/online.ts` (around line 209 in `buildPublicStateForViewer`)
- `lib/online/ui-model.ts` (if it references burned pile history)
- `components/online/table/online-game-table.tsx` (if it renders the history)

## Implementation Steps

1. **Remove `burnedPileHistory` from the real-time snapshot**:
   ```typescript
   // In buildPublicStateForViewer, omit burnedPileHistory
   return {
     ...publicState,
     burnedPileHistory: undefined, // or just don't include it
     burnedPileCount: state.burnedPileHistory.length, // send count only
   };
   ```
2. **If the UI needs burn history** (e.g., for an event log), serve it from a separate endpoint or only include the last N burns:
   ```typescript
   lastBurnedPiles: state.burnedPileHistory.slice(-3), // last 3 burns
   ```
3. **Audit other large fields** in the snapshot:
   - `discardPile` — could be truncated to top N cards (only visible cards matter for gameplay)
   - `events` — already limited to last 50, which is fine
4. **Consider gzip** — ensure the API response has `Content-Encoding: gzip` for the JSON payload.

## Acceptance Criteria

- Snapshot payload is under 10KB for a typical mid-game state.
- UI still functions correctly (burn animations, event log).
- No gameplay regression from the reduced payload.
