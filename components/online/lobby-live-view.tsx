"use client";

import { useEffect, useMemo, useState } from "react";

type LobbySnapshot = {
  lobby: {
    id: string;
    code: string;
    ownerUserId: string;
    status: "WAITING" | "IN_PROGRESS" | "FINISHED" | "CLOSED";
  };
  players: Array<{
    userId: string;
    name: string;
    seatIndex: number;
    readyState: boolean;
    isConnected: boolean;
    isOwner: boolean;
  }>;
  game: null | {
    id: string;
    status: "IN_PROGRESS" | "FINISHED" | "CLOSED";
    moveNumber: number;
    publicState: null | {
      phase: "swap" | "active" | "finished";
      turnNumber: number;
      currentPlayerUserId: string | null;
      drawPileCount: number;
      discardPile: Array<{ id: string; rank: string; suit: string }>;
      discardPileSize: number;
      effectivePile: {
        latestEffectiveRank: string | null;
        sevenRuleActive: boolean;
        resetByTwo: boolean;
      };
      legalMoves: Array<
        | { type: "play"; cardIds: string[] }
        | { type: "pickup" }
        | { type: "blind_play" }
        | { type: "face_up_pickup"; cardId: string }
      >;
      players: Array<{
        userId: string;
        seatIndex: number;
        handCount: number;
        hand?: Array<{ id: string; rank: string; suit: string }>;
        tableFaceUp: Array<{ id: string; rank: string; suit: string }>;
        faceDownCount: number;
        faceDownCards?: Array<{ id: string; rank: string; suit: string }>;
        isOut: boolean;
        isLoser: boolean;
        placement: number | null;
      }>;
      loserUserId: string | null;
      swapLockedUserIds: string[];
    };
  };
  events: Array<{
    id: string;
    type: string;
    actorUserId: string | null;
    createdAt: string | Date;
    payload: unknown;
  }>;
};

type LobbyLiveViewProps = {
  lobbyId: string;
  viewerUserId: string;
  initialSnapshot: LobbySnapshot;
};

function cardLabel(card: { rank: string; suit: string }) {
  return `${card.rank}${card.suit}`;
}

function formatEventTime(value: string | Date): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return `${parsed.toISOString().slice(11, 19)} UTC`;
}

export function LobbyLiveView({ lobbyId, viewerUserId, initialSnapshot }: LobbyLiveViewProps) {
  const [snapshot, setSnapshot] = useState<LobbySnapshot>(initialSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [isSubmittingMove, setIsSubmittingMove] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchSnapshot = async () => {
      try {
        const response = await fetch(`/api/online/lobbies/${lobbyId}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to refresh lobby state.");
        }

        const data = (await response.json()) as LobbySnapshot;

        if (!cancelled) {
          setSnapshot(data);
          setError(null);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Failed to refresh.");
        }
      }
    };

    fetchSnapshot();
    const poll = setInterval(fetchSnapshot, 2_000);

    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [lobbyId]);

  const publicState = snapshot.game?.publicState ?? null;
  const isMyTurn = publicState?.currentPlayerUserId === viewerUserId;
  const legalMoves = publicState?.legalMoves ?? [];

  const myView = useMemo(
    () => publicState?.players.find((player) => player.userId === viewerUserId) ?? null,
    [publicState, viewerUserId],
  );

  async function submitMove(move: unknown) {
    setIsSubmittingMove(true);
    setError(null);

    try {
      const response = await fetch(`/api/online/lobbies/${lobbyId}/move`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ move }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message ?? "Move rejected.");
      }

      const snapshotResponse = await fetch(`/api/online/lobbies/${lobbyId}`, { cache: "no-store" });
      const latest = (await snapshotResponse.json()) as LobbySnapshot;
      setSnapshot(latest);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Move failed.");
    } finally {
      setIsSubmittingMove(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Lobby {snapshot.lobby.code}</h2>
        <p className="mt-1 text-sm text-zinc-600">Status: {snapshot.lobby.status}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {snapshot.players.map((player) => (
            <div key={player.userId} className="rounded-lg border border-zinc-200 p-3 text-sm">
              <p className="font-medium text-zinc-900">
                Seat {player.seatIndex + 1}: {player.name}
                {player.isOwner ? " (owner)" : ""}
              </p>
              <p className="text-zinc-600">Ready: {player.readyState ? "Yes" : "No"}</p>
              <p className="text-zinc-600">Connected: {player.isConnected ? "Yes" : "No"}</p>
            </div>
          ))}
        </div>
      </div>

      {publicState ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-zinc-900">Game Table</h3>
          <p className="mt-1 text-sm text-zinc-600">Phase: {publicState.phase}</p>
          <p className="text-sm text-zinc-600">Turn: {publicState.turnNumber}</p>
          <p className="text-sm text-zinc-600">Draw pile: {publicState.drawPileCount}</p>
          <p className="text-sm text-zinc-600">Discard pile: {publicState.discardPileSize}</p>
          <p className="text-sm text-zinc-600">Effective rank: {publicState.effectivePile.latestEffectiveRank ?? "none"}</p>
          <p className="text-sm text-zinc-600">Seven rule: {publicState.effectivePile.sevenRuleActive ? "active" : "inactive"}</p>
          <p className="text-sm text-zinc-600">2 reset: {publicState.effectivePile.resetByTwo ? "yes" : "no"}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {publicState.discardPile.map((card) => (
              <span key={card.id} className="rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs text-zinc-700">
                {cardLabel(card)}
              </span>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {publicState.players.map((player) => (
              <div key={player.userId} className="rounded-lg border border-zinc-200 p-3 text-sm">
                <p className="font-medium text-zinc-900">
                  Seat {player.seatIndex + 1}
                  {player.userId === viewerUserId ? " (you)" : ""}
                </p>
                <p className="text-zinc-600">Hand count: {player.handCount}</p>
                <p className="text-zinc-600">Face-down count: {player.faceDownCount}</p>
                {player.userId === viewerUserId && player.faceDownCards ? (
                  <p className="text-zinc-600">Your face-down cards: {player.faceDownCards.map((card) => cardLabel(card)).join(", ") || "-"}</p>
                ) : null}
                <p className="text-zinc-600">Face-up: {player.tableFaceUp.map((card) => cardLabel(card)).join(", ") || "-"}</p>
                <p className="text-zinc-600">Status: {player.isLoser ? "Loser" : player.isOut ? "Out" : "Active"}</p>
                {player.userId === viewerUserId && player.hand ? (
                  <p className="text-zinc-600">Your hand: {player.hand.map((card) => cardLabel(card)).join(", ") || "-"}</p>
                ) : null}
              </div>
            ))}
          </div>

          {isMyTurn && publicState.phase === "active" ? (
            <div className="mt-6 space-y-2">
              <p className="text-sm font-medium text-zinc-800">Your legal actions</p>
              <div className="flex flex-wrap gap-2">
                {legalMoves.map((move, index) => (
                  <button
                    key={`${move.type}-${index}`}
                    type="button"
                    disabled={isSubmittingMove}
                    onClick={() => {
                      void submitMove(move);
                    }}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
                  >
                    {move.type === "play"
                      ? `Play ${move.cardIds.join(", ")}`
                      : move.type === "blind_play"
                        ? "Blind play (random)"
                        : move.type === "face_up_pickup"
                          ? `Face-up pickup (${move.cardId})`
                          : "Pickup"}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {publicState.phase === "swap" && myView?.hand ? (
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Swap phase is active. Use the swap controls on this page, then owner can begin turns.
            </div>
          ) : null}

          {publicState.phase === "finished" ? (
            <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              Game finished. Loser: {publicState.loserUserId ?? "unknown"}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-zinc-900">Recent Events</h3>
        <ul className="mt-3 space-y-2 text-sm text-zinc-700">
          {snapshot.events.slice(-20).map((event) => (
            <li key={event.id} className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
              <p className="font-medium">{event.type}</p>
              <p className="text-xs text-zinc-500">{formatEventTime(event.createdAt)}</p>
            </li>
          ))}
        </ul>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
