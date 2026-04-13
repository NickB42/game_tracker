# Online Play (v1) Architecture

This document explains the first implementation of real-time online multiplayer lobbies for Shithead.

## Goals in v1

- Keep all game state server-authoritative and persisted in Postgres.
- Integrate with existing auth, Prisma, and dashboard structure.
- Prioritize correctness and safe incremental rollout over visual polish.

## Main building blocks

- Pure rules engine:
  - `lib/online/shithead-engine.ts`
  - Deterministic helper functions for legal move checks and move application.
  - Handles special cards `2`, `3`, `7`, `8`, `10`, pile burn rules, refill, pickup, and elimination.

- Persisted online domain:
  - `lib/db/online.ts`
  - Lobby lifecycle, ownership transfer, reconnect handling, game state persistence, event append, and optional export.

- Server actions:
  - `actions/online.ts`
  - Create/join/leave/start/close lobbies, swap submit, begin turns, export game.

- API routes:
  - `app/api/online/lobbies/[lobbyId]/route.ts` (snapshot)
  - `app/api/online/lobbies/[lobbyId]/move/route.ts` (authoritative move endpoint)
  - `app/api/online/lobbies/[lobbyId]/events/route.ts` (event polling)
  - `app/api/online/lobbies/[lobbyId]/stream/route.ts` (SSE stream)

- UI pages/components:
  - `app/(dashboard)/dashboard/online-play/page.tsx`
  - `app/(dashboard)/dashboard/online-play/[lobbyId]/page.tsx`
  - `components/online/*`

## Data model summary

Prisma models added:

- `OnlineLobby`
- `OnlineLobbyPlayer`
- `OnlineGame`
- `OnlineGamePlayer`
- `OnlineGameEvent`

Also added:

- `GameSession.source` enum (`MANUAL` | `ONLINE`) for downstream distinction.

## Realtime approach

- Snapshot polling from client every 2s.
- SSE endpoint emits periodic snapshots for near-live updates.
- All authoritative transitions still happen in DB transactions.

This avoids in-memory-only state and stays compatible with serverless deployment.

## Security model

- Endpoints require authenticated users.
- Lobby membership is checked before returning lobby snapshots/events.
- Move legality is validated server-side using the pure engine before any state write.
- Hidden cards live in persisted private JSON state; viewer responses only include allowed visibility.

## Optional export to tracker

When a game finishes, users can export to existing tracker sessions:

- Creates `GameSession` with `source = ONLINE`.
- Writes participants and one round using final elimination order.
- Requires all participating users to be linked to existing `Player` rows.

## Known v1 limitations

- Swap UX currently provides a "lock current cards" flow (full arbitrary swap UI is pending).
- SSE stream implementation is short-lived and intended as a compatibility baseline; polling remains primary.
- Event payload schemas are intentionally loose (`Json`) to keep iteration speed high.
- No separate integration test suite yet for lobby race conditions.

## Suggested v2 improvements

- Add rich swap UI with drag/drop between hand and face-up cards.
- Add robust long-lived event stream strategy and backoff/replay cursors.
- Add explicit DB-level row locking strategy for high-contention joins/moves.
- Add full integration tests for reconnect/race/owner-transfer/timeouts.
- Add a dedicated online match history page and filters.
