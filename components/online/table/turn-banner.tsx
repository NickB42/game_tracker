"use client";

import { motion } from "motion/react";

type TurnBannerProps = {
  currentPlayerName: string | null;
  isMyTurn: boolean;
  phase: "swap" | "active" | "finished";
  samePlayerAgain?: boolean;
};

export function TurnBanner({ currentPlayerName, isMyTurn, phase, samePlayerAgain = false }: TurnBannerProps) {
  const label = phase === "swap" ? "Swap phase" : phase === "finished" ? "Round finished" : `${currentPlayerName ?? "Unknown"} to play`;

  return (
    <motion.div
      key={label}
      initial={{ opacity: 0, y: -6 }}
      animate={{
        opacity: 1,
        y: 0,
        boxShadow: isMyTurn ? "0 8px 24px -18px rgba(5,150,105,0.7)" : "0 0 0 rgba(0,0,0,0)",
      }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={[
        "rounded-xl border px-3 py-2 text-sm font-semibold",
        isMyTurn ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-zinc-200 bg-white text-zinc-800",
      ].join(" ")}
    >
      {label}
      {isMyTurn && phase === "active" ? " - your turn" : ""}
      {samePlayerAgain ? <span className="ml-2 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">You continue</span> : null}
    </motion.div>
  );
}
