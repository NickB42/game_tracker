"use client";

import { motion } from "motion/react";

import { CardView } from "@/components/online/table/card-view";

type CardStackProps = {
  count: number;
  label: string;
  topRank?: string;
  topSuit?: string;
  faceDown?: boolean;
  isDropActive?: boolean;
  isPulseActive?: boolean;
};

export function CardStack({ count, label, topRank, topSuit, faceDown = true, isDropActive = false, isPulseActive = false }: CardStackProps) {
  const hasCards = count > 0;
  const layerCount = Math.min(Math.max(count, 0), 3);

  return (
    <motion.div
      animate={{
        scale: isDropActive ? 1.03 : 1,
        boxShadow: isPulseActive
          ? "0 0 0 3px rgba(16,185,129,0.15), 0 10px 30px -16px rgba(16,185,129,0.8)"
          : "0 8px 20px -18px rgba(24,24,27,0.5)",
      }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className={[
        "rounded-2xl border bg-white/90 p-3",
        isDropActive ? "border-emerald-400" : "border-zinc-300",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-700">{label}</p>
        <p className="text-xs text-zinc-500">{count}</p>
      </div>

      <div className="mt-2 flex min-h-24 items-center justify-center">
        {hasCards ? (
          <div className="relative h-24 w-20">
            {Array.from({ length: layerCount }).map((_, index) => (
              <motion.div
                key={`${label}-layer-${index}`}
                className="absolute inset-0"
                style={{
                  transform: `translate(${index * 2}px, ${index * -2}px)`,
                }}
                initial={{ opacity: 0.4 }}
                animate={{ opacity: 0.45 + index * 0.2 }}
              >
                <CardView rank={topRank} suit={topSuit} isFaceDown={faceDown} isDisabled size="md" />
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            className="flex h-24 w-16 items-center justify-center rounded-xl border border-dashed border-zinc-300 text-[10px] uppercase tracking-wide text-zinc-400"
            animate={{ opacity: [0.55, 0.85, 0.55] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            Empty
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
