"use client";

import { AnimatePresence, motion } from "motion/react";

import type { LobbySnapshot } from "@/components/online/types";

type GameEventLogProps = {
  events: LobbySnapshot["events"];
};

function formatEventTime(value: string | Date): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return `${parsed.toISOString().slice(11, 19)} UTC`;
}

export function GameEventLog({ events }: GameEventLogProps) {
  const recent = events.slice(-12);

  return (
    <div className="app-card-muted rounded-xl p-3">
      <p className="app-caption uppercase tracking-wide">Recent events</p>
      <ul className="mt-2 space-y-2">
        <AnimatePresence initial={false}>
          {recent.map((event) => (
            <motion.li
              key={event.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1"
            >
              <p className="text-xs font-semibold text-[var(--text-secondary)]">{event.type}</p>
              <p className="text-[11px] text-[var(--text-muted)]">{formatEventTime(event.createdAt)}</p>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
