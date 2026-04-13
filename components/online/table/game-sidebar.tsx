"use client";

import { AnimatePresence, motion } from "motion/react";
import { type FormEvent, useMemo, useState } from "react";

import type { LobbySnapshot } from "@/components/online/types";
import { summarizeLobbyEvent, toneClasses } from "@/components/online/table/polish-state";
import { StatusBadge } from "@/components/ui/primitives";

type PublicState = NonNullable<NonNullable<LobbySnapshot["game"]>["publicState"]>;

type GameSidebarProps = {
  snapshot: LobbySnapshot;
  publicState: PublicState | null;
  isRefreshing: boolean;
  isSubmittingMove: boolean;
  error: string | null;
  viewerUserId: string;
  markReadyAction: (formData: FormData) => void | Promise<void>;
  markNotReadyAction: (formData: FormData) => void | Promise<void>;
  leaveLobbyAction: (formData: FormData) => void | Promise<void>;
  startGameAction: (formData: FormData) => void | Promise<void>;
  beginTurnsAction: (formData: FormData) => void | Promise<void>;
  closeLobbyAction: (formData: FormData) => void | Promise<void>;
  exportGameAction: (formData: FormData) => void | Promise<void>;
};

export function GameSidebar({
  snapshot,
  publicState,
  isRefreshing,
  isSubmittingMove,
  error,
  viewerUserId,
  markReadyAction,
  markNotReadyAction,
  leaveLobbyAction,
  startGameAction,
  beginTurnsAction,
  closeLobbyAction,
  exportGameAction,
}: GameSidebarProps) {
  const [chatDraft, setChatDraft] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const me = snapshot.players.find((player) => player.userId === viewerUserId) ?? null;
  const isOwner = snapshot.lobby.ownerUserId === viewerUserId;
  const allActivePlayersReady = snapshot.players.length >= 2 && snapshot.players.every((player) => player.readyState);
  const swapLockedUserIds = publicState?.swapLockedUserIds ?? [];
  const allPlayersLockedSwap = snapshot.players.length > 0 && snapshot.players.every((player) => swapLockedUserIds.includes(player.userId));
  const canStartRound = isOwner && (snapshot.lobby.status === "WAITING" || snapshot.lobby.status === "FINISHED");
  const canBeginTurns = isOwner && publicState?.phase === "swap";
  const canExport = snapshot.game?.status === "FINISHED";
  const playersById = useMemo(() => new Map(snapshot.players.map((player) => [player.userId, player.name])), [snapshot.players]);
  const highlights = useMemo(
    () =>
      snapshot.events
        .filter((event) => event.type !== "chat_message")
        .slice(-5)
        .map((event) => summarizeLobbyEvent(event, playersById))
        .reverse(),
    [snapshot.events, playersById],
  );
  const chatMessages = useMemo(() => {
    return snapshot.events
      .filter((event) => event.type === "chat_message")
      .slice(-20)
      .map((event) => {
        const payload = event.payload as { message?: unknown };
        const text = typeof payload?.message === "string" ? payload.message.trim() : "";

        return {
          id: event.id,
          sender: event.actorUserId ? (playersById.get(event.actorUserId) ?? "Player") : "System",
          text,
        };
      })
      .filter((entry) => entry.text.length > 0);
  }, [playersById, snapshot.events]);

  async function submitChatMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = chatDraft.trim();

    if (!message || isSendingChat) {
      return;
    }

    setIsSendingChat(true);
    setChatError(null);

    try {
      const response = await fetch(`/api/online/lobbies/${snapshot.lobby.id}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message ?? "Could not send chat message.");
      }

      setChatDraft("");
    } catch (cause) {
      setChatError(cause instanceof Error ? cause.message : "Could not send chat message.");
    } finally {
      setIsSendingChat(false);
    }
  }

  return (
    <aside className="min-w-0 space-y-3">
      <div className="app-card-muted rounded-xl p-3">
        <p className="app-caption uppercase tracking-wide">Lobby</p>
        <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{snapshot.lobby.code}</p>
        <p className="text-xs text-[var(--text-muted)]">Use these lobby actions.</p>

        <div className="mt-3 grid gap-2">
          {me ? (
            <form action={me.readyState ? markNotReadyAction : markReadyAction}>
              <button
                type="submit"
                className={[
                  "w-full app-button active:scale-[0.98]",
                  me.readyState
                    ? "app-button-destructive"
                    : "app-button-primary",
                ].join(" ")}
              >
                {me.readyState ? "Mark not ready" : "Mark ready"}
              </button>
            </form>
          ) : null}

          <form action={leaveLobbyAction}>
            <button
              type="submit"
              className="w-full app-button app-button-secondary active:scale-[0.98]"
            >
              Leave lobby
            </button>
          </form>

          {canStartRound ? (
            <form action={startGameAction}>
              <button
                type="submit"
                disabled={!allActivePlayersReady}
                className="w-full app-button app-button-primary active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {snapshot.lobby.status === "FINISHED" ? "Start next round" : "Start game"}
              </button>
            </form>
          ) : null}

          {canBeginTurns ? (
            <form action={beginTurnsAction}>
              <button
                type="submit"
                disabled={!allPlayersLockedSwap}
                className="w-full app-button app-button-secondary active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Begin turns
              </button>
            </form>
          ) : null}

          {isOwner ? (
            <form action={closeLobbyAction}>
              <button
                type="submit"
                className="w-full app-button app-button-destructive active:scale-[0.98]"
              >
                Close lobby
              </button>
            </form>
          ) : null}

          {canExport ? (
            <form action={exportGameAction}>
              <button
                type="submit"
                className="w-full app-button app-button-primary active:scale-[0.98]"
              >
                Export to tracker
              </button>
            </form>
          ) : null}
        </div>

        {canStartRound && !allActivePlayersReady ? (
          <p className="mt-2 text-xs text-[var(--warning)]">All players must be ready before starting a round.</p>
        ) : null}

        {canBeginTurns && !allPlayersLockedSwap ? (
          <p className="mt-2 text-xs text-[var(--warning)]">Every player must save 3 face-up cards before turns can begin.</p>
        ) : null}
      </div>

      <div className="app-card-muted rounded-xl p-3">
        <p className="app-caption uppercase tracking-wide">Connection</p>
        <p className={isRefreshing ? "mt-1 text-sm text-[var(--warning)]" : "mt-1 text-sm text-[var(--success)]"}>
          {isRefreshing ? "Refreshing..." : "Live updates active"}
        </p>
        {isSubmittingMove ? <p className="text-sm text-[var(--text-muted)]">Submitting move...</p> : null}
        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      </div>

      <div className="app-card-muted rounded-xl p-3">
        <p className="app-caption uppercase tracking-wide">Lobby leaderboard</p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Rounds played: {snapshot.lobbyRoundsPlayed}</p>
        <p className="text-sm text-[var(--text-secondary)]">
          Last winner: {snapshot.lobbyLastWinner ? snapshot.lobbyLastWinner.name : "-"}
        </p>

        {snapshot.lobbyLeaderboard.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--text-muted)]">No finished rounds yet.</p>
        ) : (
          <ol className="mt-2 space-y-2">
            {snapshot.lobbyLeaderboard.map((entry, index) => (
              <li key={entry.userId} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1">
                <div>
                  <p className="text-sm font-medium text-[var(--text-secondary)]">
                    {index + 1}. {entry.name}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">Win rate: {entry.winRate.toFixed(1)}%</p>
                </div>
                <StatusBadge tone="accent">{entry.wins} wins</StatusBadge>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="app-card-muted rounded-xl p-3">
        <p className="app-caption uppercase tracking-wide">Recent highlights</p>
        {highlights.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--text-muted)]">No events yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            <AnimatePresence initial={false}>
              {highlights.map((item, index) => (
                <motion.li
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className={[
                    "rounded-lg border px-2 py-1.5",
                    toneClasses(item.tone),
                    index === 0 && item.important ? "ring-1 ring-amber-300" : "",
                  ].join(" ")}
                >
                  <p className="text-xs font-semibold">{item.title}</p>
                  <p className="text-[11px] opacity-90">{item.detail}</p>
                  <p className="text-[10px] opacity-70">{item.timestamp} UTC</p>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <div className="app-card-muted rounded-xl p-3">
        <p className="app-caption uppercase tracking-wide">Lobby chat</p>
        <p className="mt-1 text-[11px] text-[var(--text-muted)]">Temporary chat for this lobby session.</p>

        <div className="mt-2 max-h-44 space-y-1 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2">
          {chatMessages.length > 0 ? (
            chatMessages.map((message) => (
              <div key={message.id} className="rounded-md bg-[var(--surface-muted)] px-2 py-1">
                <p className="text-[11px] font-semibold text-[var(--text-secondary)]">{message.sender}</p>
                <p className="text-xs text-[var(--text-primary)]">{message.text}</p>
              </div>
            ))
          ) : (
            <p className="text-xs text-[var(--text-muted)]">No chat messages yet.</p>
          )}
        </div>

        <form onSubmit={submitChatMessage} className="mt-2 flex gap-2">
          <input
            type="text"
            value={chatDraft}
            onChange={(entry) => setChatDraft(entry.target.value)}
            maxLength={240}
            placeholder="Write a message"
            className="app-input min-w-0 flex-1"
          />
          <button
            type="submit"
            disabled={isSendingChat || chatDraft.trim().length === 0}
            className="app-button app-button-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </form>

        {chatError ? <p className="mt-1 text-xs text-[var(--danger)]">{chatError}</p> : null}
      </div>
    </aside>
  );
}
