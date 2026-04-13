"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import type { LobbySnapshot } from "@/components/online/types";

const OnlineGameTable = dynamic(
  () => import("@/components/online/table/online-game-table").then((mod) => mod.OnlineGameTable),
  { ssr: false },
);

type LobbyLiveViewProps = {
  lobbyId: string;
  viewerUserId: string;
  initialSnapshot: LobbySnapshot;
};

export function LobbyLiveView({ lobbyId, viewerUserId, initialSnapshot }: LobbyLiveViewProps) {
  const [snapshot, setSnapshot] = useState<LobbySnapshot>(initialSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [isSubmittingMove, setIsSubmittingMove] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchSnapshot = async () => {
      setIsRefreshing(true);

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
      } finally {
        if (!cancelled) {
          setIsRefreshing(false);
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

  async function submitMove(move: { type: "play"; cardIds: string[] } | { type: "pickup" } | { type: "blind_play" } | { type: "face_up_pickup"; cardId: string }) {
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
    <OnlineGameTable
      snapshot={snapshot}
      viewerUserId={viewerUserId}
      isRefreshing={isRefreshing}
      isSubmittingMove={isSubmittingMove}
      error={error}
      onSubmitMove={submitMove}
    />
  );
}
