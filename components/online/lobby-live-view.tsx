"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

import type { LobbySnapshot } from "@/components/online/types";
import { useToast } from "@/components/ui/toast";

const OnlineGameTable = dynamic(
  () => import("@/components/online/table/online-game-table").then((mod) => mod.OnlineGameTable),
  { ssr: false },
);

type LobbyLiveViewProps = {
  lobbyId: string;
  viewerUserId: string;
  initialSnapshot: LobbySnapshot;
  markReadyAction: (formData: FormData) => void | Promise<void>;
  markNotReadyAction: (formData: FormData) => void | Promise<void>;
  leaveLobbyAction: (formData: FormData) => void | Promise<void>;
  startGameAction: (formData: FormData) => void | Promise<void>;
  beginTurnsAction: (formData: FormData) => void | Promise<void>;
  closeLobbyAction: (formData: FormData) => void | Promise<void>;
  exportGameAction: (formData: FormData) => void | Promise<void>;
};

export function LobbyLiveView({
  lobbyId,
  viewerUserId,
  initialSnapshot,
  markReadyAction,
  markNotReadyAction,
  leaveLobbyAction,
  startGameAction,
  beginTurnsAction,
  closeLobbyAction,
  exportGameAction,
}: LobbyLiveViewProps) {
  const { pushToast } = useToast();
  const [snapshot, setSnapshot] = useState<LobbySnapshot>(initialSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [isSubmittingMove, setIsSubmittingMove] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastErrorRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const backoffRef = useRef(2_000);

  const isTerminal = snapshot.lobby.status === "FINISHED" || snapshot.lobby.status === "CLOSED";

  const fetchSnapshot = useCallback(async () => {
    setIsRefreshing(true);

    try {
      const response = await fetch(`/api/online/lobbies/${lobbyId}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to refresh lobby state.");
      }

      const data = (await response.json()) as LobbySnapshot;
      setSnapshot(data);
      setError(null);
      backoffRef.current = 2_000;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to refresh.");
      backoffRef.current = Math.min(backoffRef.current * 2, 30_000);
    } finally {
      setIsRefreshing(false);
    }
  }, [lobbyId]);

  useEffect(() => {
    if (isTerminal) return;

    function startPolling() {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(fetchSnapshot, backoffRef.current);
    }

    function stopPolling() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    function handleVisibility() {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchSnapshot();
        startPolling();
      }
    }

    fetchSnapshot();
    startPolling();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [lobbyId, isTerminal, fetchSnapshot]);

  useEffect(() => {
    if (!error || error === lastErrorRef.current) {
      return;
    }

    lastErrorRef.current = error;
    pushToast({ title: "Online action failed", description: error, tone: "error" });
  }, [error, pushToast]);

  async function submitMove(move: { type: "play"; cardIds: string[] } | { type: "pickup" } | { type: "blind_play" }) {
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
      markReadyAction={markReadyAction}
      markNotReadyAction={markNotReadyAction}
      leaveLobbyAction={leaveLobbyAction}
      startGameAction={startGameAction}
      beginTurnsAction={beginTurnsAction}
      closeLobbyAction={closeLobbyAction}
      exportGameAction={exportGameAction}
    />
  );
}
