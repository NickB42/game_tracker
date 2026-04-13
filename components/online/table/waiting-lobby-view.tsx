"use client";

import { motion } from "motion/react";

import type { LobbySnapshot } from "@/components/online/types";

type WaitingLobbyViewProps = {
  snapshot: LobbySnapshot;
};

export function WaitingLobbyView({ snapshot }: WaitingLobbyViewProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-[radial-gradient(circle_at_top,#f0fdf4_0%,#ffffff_42%,#f8fafc_100%)] p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Join code</p>
          <h3 className="text-3xl font-black tracking-[0.24em] text-zinc-900">{snapshot.lobby.code}</h3>
          <p className="mt-1 text-sm text-zinc-600">Invite authenticated users with this code.</p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white/90 px-3 py-2 text-sm font-medium text-zinc-700">Players: {snapshot.players.length}/5</div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {snapshot.players.map((player, index) => (
          <motion.div
            key={player.userId}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, type: "spring", stiffness: 240, damping: 20 }}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-zinc-900">{player.name}</p>
              {player.isOwner ? <span className="rounded-md border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-900">Owner</span> : null}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <p className={player.readyState ? "rounded-md bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700" : "rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600"}>
                {player.readyState ? "Ready" : "Not ready"}
              </p>
              <p className={player.isConnected ? "text-xs text-emerald-600" : "text-xs text-zinc-400"}>{player.isConnected ? "Connected" : "Disconnected"}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <p className="mt-4 text-xs text-zinc-500">Use the sidebar controls to ready up, start, leave, or close the lobby.</p>
    </section>
  );
}
