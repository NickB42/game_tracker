# 01 — Remove Duplicate Polling in Online Lobby Page

## Problem

Two independent 2-second polling loops run simultaneously for every lobby viewer:
1. `LobbyPageRevalidator` calls `router.refresh()` every 2000ms
2. `LobbyLiveView` fetches `/api/online/lobbies/${lobbyId}` every 2000ms via `setInterval`

This doubles network traffic and server load.

## Files to Modify

- `app/(dashboard)/dashboard/online-play/[lobbyId]/page.tsx`
- `components/online/lobby-page-revalidator.tsx`
- `components/online/lobby-live-view.tsx`

## Implementation Steps

1. **Remove `LobbyPageRevalidator`** from `app/(dashboard)/dashboard/online-play/[lobbyId]/page.tsx` — delete its usage and import.
2. **Delete `components/online/lobby-page-revalidator.tsx`** entirely (it only exists for this purpose).
3. **Keep only the client-side fetch** in `LobbyLiveView` as the single source of real-time updates.
4. **Verify** the `LobbyLiveView` component correctly handles initial server-rendered data and seamlessly transitions to client-side polling.
5. **Test** that the lobby page still shows live updates (player joins, game state changes) with only one polling mechanism.

## Acceptance Criteria

- Only one network request per 2-second interval per lobby viewer.
- Lobby live updates still work (player joins, game moves, chat).
- No `router.refresh()` calls on the lobby page.
