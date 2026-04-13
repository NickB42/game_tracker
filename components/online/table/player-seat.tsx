"use client";

import { motion } from "motion/react";

import { TableCards } from "@/components/online/table/table-cards";
import type { LobbySnapshot } from "@/components/online/types";

type PublicPlayer = NonNullable<NonNullable<LobbySnapshot["game"]>["publicState"]>["players"][number];

type PlayerSeatProps = {
  player: LobbySnapshot["players"][number];
  publicPlayer: PublicPlayer | null;
  isCurrentViewer: boolean;
  isCurrentTurn: boolean;
};

export function PlayerSeat({ player, publicPlayer, isCurrentViewer, isCurrentTurn }: PlayerSeatProps) {
  const isOut = Boolean(publicPlayer?.isOut);
  const isLoser = Boolean(publicPlayer?.isLoser);

  return (
    <motion.div
      layout
      animate={{
        scale: isCurrentTurn ? 1.01 : 1,
      }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={[
        "rounded-xl border bg-white/95 p-3",
        isCurrentTurn ? "border-emerald-400 shadow-[0_10px_26px_-20px_rgba(5,150,105,0.85)]" : "border-zinc-200",
        isOut ? "opacity-75" : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-900">
          {player.name}
          {isCurrentViewer ? " (you)" : ""}
          {player.isOwner ? " [owner]" : ""}
        </p>
        <div className="flex items-center gap-1">
          <span className={player.isConnected ? "text-xs text-emerald-600" : "text-xs text-zinc-400"}>{player.isConnected ? "online" : "offline"}</span>
          {isLoser ? <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">Shithead</span> : null}
          {isOut && !isLoser ? <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-700">Out</span> : null}
        </div>
      </div>

      <p className="mt-1 text-xs text-zinc-600">Seat {player.seatIndex + 1}</p>

      {publicPlayer ? (
        <div className="mt-2 space-y-2">
          <TableCards faceUpCards={publicPlayer.tableFaceUp} faceDownCount={publicPlayer.faceDownCount} />
        </div>
      ) : null}
    </motion.div>
  );
}
