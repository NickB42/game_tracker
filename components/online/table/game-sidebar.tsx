"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";

import type { LobbySnapshot } from "@/components/online/types";
import { summarizeLobbyEvent, toneClasses } from "@/components/online/table/polish-state";

type PublicState = NonNullable<NonNullable<LobbySnapshot["game"]>["publicState"]>;

type GameSidebarProps = {
  snapshot: LobbySnapshot;
  publicState: PublicState | null;
  isRefreshing: boolean;
  isSubmittingMove: boolean;
  error: string | null;
};

export function GameSidebar({ snapshot, publicState, isRefreshing, isSubmittingMove, error }: GameSidebarProps) {
  const effectiveRank = publicState?.effectivePile.latestEffectiveRank ?? "none";
  const playersById = useMemo(() => new Map(snapshot.players.map((player) => [player.userId, player.name])), [snapshot.players]);
  const highlights = useMemo(
    () => snapshot.events.slice(-5).map((event) => summarizeLobbyEvent(event, playersById)).reverse(),
    [snapshot.events, playersById],
  );

  return (
    <aside className="space-y-3">
      <div className="rounded-xl border border-zinc-200 bg-white p-3">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Lobby</p>
        <p className="mt-1 text-lg font-semibold text-zinc-900">{snapshot.lobby.code}</p>
        <p className="text-sm text-zinc-600">Status: {snapshot.lobby.status}</p>
        <p className="text-sm text-zinc-600">Move: {snapshot.game?.moveNumber ?? 0}</p>
        <p className="text-sm text-zinc-600">Effective pile rank: {effectiveRank}</p>
        <p className="text-sm text-zinc-600">Seven rule: {publicState?.effectivePile.sevenRuleActive ? "active" : "off"}</p>
        <p className="text-sm text-zinc-600">2 reset: {publicState?.effectivePile.resetByTwo ? "active" : "off"}</p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-3">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Connection</p>
        <p className={isRefreshing ? "mt-1 text-sm text-amber-700" : "mt-1 text-sm text-emerald-700"}>
          {isRefreshing ? "Refreshing..." : "Live updates active"}
        </p>
        {isSubmittingMove ? <p className="text-sm text-zinc-600">Submitting move...</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-3">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Lobby leaderboard</p>
        <p className="mt-1 text-sm text-zinc-700">Rounds played: {snapshot.lobbyRoundsPlayed}</p>
        <p className="text-sm text-zinc-700">
          Last winner: {snapshot.lobbyLastWinner ? snapshot.lobbyLastWinner.name : "-"}
        </p>

        {snapshot.lobbyLeaderboard.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No finished rounds yet.</p>
        ) : (
          <ol className="mt-2 space-y-2">
            {snapshot.lobbyLeaderboard.map((entry, index) => (
              <li key={entry.userId} className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-2 py-1">
                <div>
                  <p className="text-sm font-medium text-zinc-800">
                    {index + 1}. {entry.name}
                  </p>
                  <p className="text-xs text-zinc-500">Win rate: {entry.winRate.toFixed(1)}%</p>
                </div>
                <p className="text-xs font-semibold text-zinc-600">{entry.wins} wins</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-3">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Recent highlights</p>
        {highlights.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No events yet.</p>
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
    </aside>
  );
}
