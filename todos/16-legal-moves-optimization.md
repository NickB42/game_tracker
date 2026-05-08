# 16 — Optimize `getLegalMoves` Computation

## Problem

`cardCombinationsByRank` generates ALL subset combinations of cards grouped by rank. After a pile pickup (20+ cards), this generates hundreds of combinations. It runs on every SSE tick via `buildPublicStateForViewer`.

## Files to Modify

- `lib/online/shithead-engine.ts` (lines 404-435, 549-618)
- `lib/online/ui-model.ts` (if it consumes legal moves)

## Implementation Steps

1. **Limit combination depth** — for the public state viewer, only generate singles and pairs (most common plays). Full combinations are only needed for move validation:
   ```typescript
   export function getLegalMovesForDisplay(state: GameState, playerId: string): LegalMove[] {
     // Only singles and pairs for UI display
     return getLegalMoves(state, playerId, { maxCombinationSize: 2 });
   }
   ```
2. **Add a `maxCombinationSize` option** to `cardCombinationsByRank`:
   ```typescript
   function cardCombinationsByRank(cards: Card[], maxSize?: number): Card[][] {
     // If maxSize is set, skip generating combinations larger than maxSize
   }
   ```
3. **Keep full combination generation** only in `applyMove` validation (where correctness matters).
4. **Cache legal moves** within a single snapshot computation — if the game state hasn't changed (same `moveNumber`), reuse the previous result.

## Acceptance Criteria

- Snapshot computation is measurably faster for players with large hands (10+ cards).
- UI still shows valid plays (singles and pairs cover >95% of actual moves in Shithead).
- Move validation still accepts all valid multi-card plays.
