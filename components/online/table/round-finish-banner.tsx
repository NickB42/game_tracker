"use client";

import { AnimatePresence, motion } from "motion/react";

type RoundFinishBannerProps = {
  visible: boolean;
  winnerName: string;
  loserName: string;
  reduceMotion: boolean;
};

export function RoundFinishBanner({ visible, winnerName, loserName, reduceMotion }: RoundFinishBannerProps) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="round-finish-banner"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ type: "spring", stiffness: 250, damping: 20 }}
          className="rounded-xl border border-emerald-300 bg-[linear-gradient(135deg,#ecfdf5_0%,#f0fdf4_45%,#ffffff_100%)] px-4 py-3"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Round finished</p>
          <p className="mt-1 text-sm text-emerald-900">
            <span className="font-black">{winnerName}</span> is safe. <span className="font-black text-red-700">{loserName}</span> is Shithead.
          </p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
