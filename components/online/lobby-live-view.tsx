"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

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
  const pollBackoffMsRef = useRef(2_000);

  useEffect(() => {
    let cancelled = false;
    let pollTimeout: ReturnType<typeof setTimeout> | null = null;
    let activeController: AbortController | null = null;

    const scheduleNextPoll = () => {
      if (cancelled) {
        return;
      }

      pollTimeout = setTimeout(fetchSnapshot, pollBackoffMsRef.current);
    };

    const fetchSnapshot = async () => {
      activeController = new AbortController();
      setIsRefreshing(true);

      try {
        const response = await fetch(`/api/online/lobbies/${lobbyId}`, {
          cache: "no-store",
          signal: activeController.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to refresh lobby state.");
        }

        const data = (await response.json()) as LobbySnapshot;

        if (!cancelled) {
          setSnapshot(data);
          setError(null);
          pollBackoffMsRef.current = 2_000;
        }
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") {
          return;
        }

        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Failed to refresh.");
          pollBackoffMsRef.current = Math.min(pollBackoffMsRef.current * 2, 30_000);
        }
      } finally {
        if (!cancelled) {
          setIsRefreshing(false);
          scheduleNextPoll();
        }
      }
    };

    fetchSnapshot();

    return () => {
      cancelled = true;
      activeController?.abort();
      if (pollTimeout) {
        clearTimeout(pollTimeout);
      }
    };
  }, [lobbyId]);

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
