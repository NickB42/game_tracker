"use client";

import { motion } from "motion/react";

import type { LobbySnapshot } from "@/components/online/types";
import { StatusBadge } from "@/components/ui/primitives";

type WaitingLobbyViewProps = {
  snapshot: LobbySnapshot;
};

export function WaitingLobbyView({ snapshot }: WaitingLobbyViewProps) {
  return (
    <section className="app-card rounded-2xl bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--accent-soft)_65%,transparent)_0%,var(--surface)_42%,var(--surface-muted)_100%)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="app-caption uppercase tracking-wide">Join code</p>
          <h3 className="text-3xl font-black tracking-[0.24em] text-[var(--text-primary)]">{snapshot.lobby.code}</h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Invite authenticated users with this code.</p>
        </div>

        <StatusBadge tone="accent">Players: {snapshot.players.length}/5</StatusBadge>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {snapshot.players.map((player, index) => (
          <motion.div
            key={player.userId}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, type: "spring", stiffness: 240, damping: 20 }}
            className="app-card-muted rounded-lg px-3 py-2"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{player.name}</p>
              {player.isOwner ? <StatusBadge tone="accent">Owner</StatusBadge> : null}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge tone={player.readyState ? "success" : "warning"}>{player.readyState ? "Ready" : "Not ready"}</StatusBadge>
              <StatusBadge tone={player.isConnected ? "success" : "neutral"}>{player.isConnected ? "Connected" : "Disconnected"}</StatusBadge>
            </div>
          </motion.div>
        ))}
      </div>

      <p className="mt-4 text-xs text-[var(--text-muted)]">Use the sidebar controls to ready up, start, leave, or close the lobby.</p>
    </section>
  );
}
