"use client";

import * as Deck from "@letele/playing-cards";
import { motion } from "motion/react";
import { memo, type ComponentType, type SVGProps } from "react";

type CardViewSize = "sm" | "md" | "lg";

type CardViewProps = {
  rank?: string;
  suit?: string;
  isFaceDown?: boolean;
  isSelected?: boolean;
  isLegal?: boolean;
  isDragging?: boolean;
  isDisabled?: boolean;
  size?: CardViewSize;
  label?: string;
  onClick?: () => void;
};

const sizeClassMap: Record<CardViewSize, string> = {
  sm: "w-14",
  md: "w-18",
  lg: "w-24",
};

function toDeckComponentKey(rank: string, suit: string): string {
  const normalizedSuit = suit.toUpperCase();
  const normalizedRank = rank.toUpperCase();

  if (normalizedRank === "A") {
    return `${normalizedSuit}a`;
  }

  if (normalizedRank === "J") {
    return `${normalizedSuit}j`;
  }

  if (normalizedRank === "Q") {
    return `${normalizedSuit}q`;
  }

  if (normalizedRank === "K") {
    return `${normalizedSuit}k`;
  }

  return `${normalizedSuit}${normalizedRank}`;
}

function CardFace(props: { rank?: string; suit?: string; isFaceDown: boolean }) {
  if (props.isFaceDown || !props.rank || !props.suit) {
    const BackCard = (Deck as Record<string, ComponentType<SVGProps<SVGSVGElement>>>).B1;
    return BackCard ? <BackCard style={{ width: "100%", height: "100%" }} /> : <div className="h-full w-full rounded-xl bg-zinc-200" />;
  }

  const deckKey = toDeckComponentKey(props.rank, props.suit);
  const FaceCard = (Deck as Record<string, ComponentType<SVGProps<SVGSVGElement>>>)[deckKey];

  if (!FaceCard) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-xl border border-zinc-400 bg-white text-sm font-semibold text-zinc-800">
        {props.rank}
        {props.suit}
      </div>
    );
  }

  return <FaceCard style={{ width: "100%", height: "100%" }} />;
}

export const CardView = memo(function CardView({
  rank,
  suit,
  isFaceDown = false,
  isSelected = false,
  isLegal = false,
  isDragging = false,
  isDisabled = false,
  size = "md",
  label,
  onClick,
}: CardViewProps) {
  const actionable = Boolean(onClick) && !isDisabled;

  return (
    <motion.button
      type="button"
      layout
      whileHover={actionable ? { y: isSelected ? -14 : -6, rotate: isSelected ? 0 : -1.25 } : undefined}
      whileTap={actionable ? { scale: 0.97, y: isSelected ? -10 : -2 } : undefined}
      animate={{
        y: isSelected ? -12 : 0,
        scale: isDragging ? 1.02 : 1,
        opacity: isDragging ? 0.7 : isDisabled ? 0.5 : 1,
      }}
      transition={{ type: "spring", stiffness: 320, damping: 26, mass: 0.9 }}
      aria-label={label ?? "Card"}
      disabled={!actionable}
      onClick={onClick}
      className={[
        "relative aspect-[5/7] shrink-0 rounded-xl transition-shadow",
        sizeClassMap[size],
        isSelected ? "ring-4 ring-amber-300 shadow-[0_14px_22px_-16px_rgba(180,83,9,0.75)]" : "",
        isLegal && !isDisabled ? "ring-2 ring-emerald-300" : "",
        isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      ].join(" ")}
    >
      {isLegal && !isDisabled ? (
        <span className="pointer-events-none absolute -right-1 -top-1 z-10 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(255,255,255,0.85)]" />
      ) : null}
      <CardFace rank={rank} suit={suit} isFaceDown={isFaceDown} />
    </motion.button>
  );
});
