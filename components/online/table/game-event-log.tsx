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
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <p className="text-xs uppercase tracking-wide text-zinc-500">Recent events</p>
      <ul className="mt-2 space-y-2">
        <AnimatePresence initial={false}>
          {recent.map((event) => (
            <motion.li
              key={event.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-lg border border-zinc-100 bg-zinc-50 px-2 py-1"
            >
              <p className="text-xs font-semibold text-zinc-800">{event.type}</p>
              <p className="text-[11px] text-zinc-500">{formatEventTime(event.createdAt)}</p>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
