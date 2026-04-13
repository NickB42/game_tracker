"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { BlindPlayOverlay } from "@/components/online/table/blind-play-overlay";
import { CardView } from "@/components/online/table/card-view";
import { DiscardPileDropZone, DISCARD_DROP_ZONE_ID } from "@/components/online/table/discard-pile-drop-zone";
import { DrawPile } from "@/components/online/table/draw-pile";
import { GameSidebar } from "@/components/online/table/game-sidebar";
import { MoveActionBar } from "@/components/online/table/move-action-bar";
import { PlayerHand } from "@/components/online/table/player-hand";
import { PlayerSeat } from "@/components/online/table/player-seat";
import { RoundFinishBanner } from "@/components/online/table/round-finish-banner";
import { TurnBanner } from "@/components/online/table/turn-banner";
import { WaitingLobbyView } from "@/components/online/table/waiting-lobby-view";
import { getLatestBlindPlayOutcome, getRoundFinishSummary, getSpecialEffectBadge } from "@/components/online/table/polish-state";
import type { LobbySnapshot, PublicCard } from "@/components/online/types";
import {
  buildCardIndex,
  canDragCard,
  dropIntentAccepted,
  getLegalPlayKeySet,
  getPlayableCardIds,
  getSelectedPlayMove,
  playKey,
  toggleSameRankSelection,
} from "@/lib/online/ui-model";

type OnlineGameTableProps = {
  snapshot: LobbySnapshot;
  viewerUserId: string;
  isRefreshing: boolean;
  isSubmittingMove: boolean;
  error: string | null;
  onSubmitMove: (move: { type: "play"; cardIds: string[] } | { type: "pickup" } | { type: "blind_play" } | { type: "face_up_pickup"; cardId: string }) => Promise<void>;
};

type DraggablePlayableCardProps = {
  card: PublicCard;
  moveIntent: { type: "play"; cardIds: string[] } | null;
  canDrag: boolean;
  isCardDisabled: boolean;
  isSelected: boolean;
  isLegal: boolean;
  onClick: () => void;
  onDragStateChange: (dragging: boolean) => void;
};

const handRankOrder = new Map<string, number>([
  ["4", 0],
  ["5", 1],
  ["6", 2],
  ["7", 3],
  ["8", 4],
  ["9", 5],
  ["J", 6],
  ["Q", 7],
  ["K", 8],
  ["A", 9],
  ["3", 10],
  ["2", 11],
  ["10", 12],
]);

function sortHandCards(cards: PublicCard[]): PublicCard[] {
  return [...cards].sort((a, b) => {
    const rankCmp = (handRankOrder.get(a.rank) ?? 999) - (handRankOrder.get(b.rank) ?? 999);

    if (rankCmp !== 0) {
      return rankCmp;
    }

    return a.id.localeCompare(b.id);
  });
}

function DraggablePlayableCard({ card, moveIntent, canDrag, isCardDisabled, isSelected, isLegal, onClick, onDragStateChange }: DraggablePlayableCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `play-card-${card.id}`,
    disabled: !canDrag || !moveIntent,
    data: {
      moveIntent,
    },
  });

  useEffect(() => {
    onDragStateChange(isDragging);
  }, [isDragging, onDragStateChange]);

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <CardView
        rank={card.rank}
        suit={card.suit}
        isSelected={isSelected}
        isLegal={isLegal}
        isDragging={isDragging}
        isDisabled={isCardDisabled}
        size="md"
        onClick={onClick}
      />
    </div>
  );
}

export function OnlineGameTable({ snapshot, viewerUserId, isRefreshing, isSubmittingMove, error, onSubmitMove }: OnlineGameTableProps) {
  const reduceMotion = useReducedMotion();
  const publicState = snapshot.game?.publicState ?? null;
  const isWaitingLobby = snapshot.lobby.status === "WAITING" && !publicState;

  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [dragIntent, setDragIntent] = useState<{ type: "play"; cardIds: string[] } | null>(null);
  const [isDiscardLegalHover, setIsDiscardLegalHover] = useState(false);
  const [blindFxVisible, setBlindFxVisible] = useState(false);
  const [blindFxPhase, setBlindFxPhase] = useState<"launch" | "reveal" | "resolve">("launch");
  const [blindFxOutcome, setBlindFxOutcome] = useState<"success" | "pickup" | null>(null);
  const [blindFxMessage, setBlindFxMessage] = useState<string | null>(null);
  const [blindFxCard, setBlindFxCard] = useState<{ rank: string; suit: string } | null>(null);
  const [blindFxAwaitingResult, setBlindFxAwaitingResult] = useState(false);
  const [blindFxResolvedEventId, setBlindFxResolvedEventId] = useState<string | null>(null);
  const [roundFxVisible, setRoundFxVisible] = useState(false);
  const blindFxTokenRef = useRef(0);
  const roundFxKeyRef = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const myPublicPlayer = useMemo(
    () => publicState?.players.find((player) => player.userId === viewerUserId) ?? null,
    [publicState, viewerUserId],
  );

  const currentPlayer = useMemo(
    () => snapshot.players.find((player) => player.userId === publicState?.currentPlayerUserId) ?? null,
    [publicState?.currentPlayerUserId, snapshot.players],
  );

  const isMyTurn = publicState?.currentPlayerUserId === viewerUserId;
  const legalMoves = publicState?.legalMoves;
  const legalPlayKeys = useMemo(() => getLegalPlayKeySet(legalMoves), [legalMoves]);
  const playableCardIds = useMemo(() => getPlayableCardIds(legalMoves), [legalMoves]);

  const cardsForCurrentTurn: PublicCard[] = useMemo(() => {
    if (!myPublicPlayer) {
      return [];
    }

    if (myPublicPlayer.hand && myPublicPlayer.hand.length > 0) {
      return sortHandCards(myPublicPlayer.hand);
    }

    if (myPublicPlayer.tableFaceUp.length > 0) {
      return myPublicPlayer.tableFaceUp;
    }

    return [];
  }, [myPublicPlayer]);

  const cardsById = useMemo(() => buildCardIndex(cardsForCurrentTurn), [cardsForCurrentTurn]);
  const selectedCardIdsSafe = useMemo(
    () => selectedCardIds.filter((cardId) => cardsById.has(cardId)),
    [selectedCardIds, cardsById],
  );
  const selectedPlayMove = useMemo(
    () => getSelectedPlayMove(selectedCardIdsSafe, legalPlayKeys),
    [selectedCardIdsSafe, legalPlayKeys],
  );
  const selectedRank = selectedCardIdsSafe.length > 0 ? cardsById.get(selectedCardIdsSafe[0])?.rank ?? null : null;
  const legalMovesSafe = legalMoves ?? [];
  const canPickup = legalMovesSafe.some((move) => move.type === "pickup");
  const canBlindPlay = legalMovesSafe.some((move) => move.type === "blind_play");
  const faceUpPickupMoves = legalMovesSafe.filter((move) => move.type === "face_up_pickup");

  const topDiscard = publicState?.discardPile[publicState.discardPile.length - 1];
  const playableSourceLabel = myPublicPlayer?.hand && myPublicPlayer.hand.length > 0 ? "Your hand" : "Your face-up table cards";
  const specialEffectBadge = getSpecialEffectBadge(publicState, snapshot.events);
  const latestBlindOutcome = useMemo(() => getLatestBlindPlayOutcome(snapshot.events), [snapshot.events]);
  const roundFinishSummary = useMemo(() => getRoundFinishSummary(publicState, snapshot.players), [publicState, snapshot.players]);
  const latestMoveEvent = useMemo(
    () => [...snapshot.events].reverse().find((event) => event.type === "move_applied") ?? null,
    [snapshot.events],
  );
  const latestMoveEngineEvents = useMemo(() => {
    if (!latestMoveEvent || !latestMoveEvent.payload || typeof latestMoveEvent.payload !== "object") {
      return [] as string[];
    }

    const value = latestMoveEvent.payload as { events?: string[] };
    return Array.isArray(value.events) ? value.events : [];
  }, [latestMoveEvent]);
  const burnPulse = latestMoveEngineEvents.some((entry) => entry.includes("Pile burned"));
  const samePlayerAgain = Boolean(
    latestMoveEvent?.actorUserId &&
      publicState?.phase === "active" &&
      publicState.currentPlayerUserId === latestMoveEvent.actorUserId &&
      latestMoveEngineEvents.some((entry) => entry.includes("burned") || entry.includes("skipped")),
  );

  const draggingPreviewCards = useMemo(() => {
    if (!draggingCardId) {
      return [] as PublicCard[];
    }

    if (selectedPlayMove && selectedPlayMove.cardIds.includes(draggingCardId)) {
      return selectedPlayMove.cardIds
        .map((cardId) => cardsById.get(cardId))
        .filter((card): card is PublicCard => Boolean(card));
    }

    const single = cardsById.get(draggingCardId);
    return single ? [single] : [];
  }, [cardsById, draggingCardId, selectedPlayMove]);

  useEffect(() => {
    if (!blindFxAwaitingResult || !latestBlindOutcome) {
      return;
    }

    if (blindFxResolvedEventId === latestBlindOutcome.eventId) {
      return;
    }

    const timer = setTimeout(() => {
      setBlindFxResolvedEventId(latestBlindOutcome.eventId);
      setBlindFxAwaitingResult(false);
      setBlindFxOutcome(latestBlindOutcome.status);
      setBlindFxMessage(latestBlindOutcome.message);
      setBlindFxCard(latestBlindOutcome.revealedCard);
      setBlindFxPhase("resolve");
    }, reduceMotion ? 100 : 420);

    return () => clearTimeout(timer);
  }, [blindFxAwaitingResult, blindFxResolvedEventId, latestBlindOutcome, reduceMotion]);

  useEffect(() => {
    if (!blindFxVisible || blindFxAwaitingResult || blindFxPhase !== "resolve") {
      return;
    }

    const hideTimer = setTimeout(
      () => {
        setBlindFxVisible(false);
        setBlindFxOutcome(null);
        setBlindFxMessage(null);
        setBlindFxCard(null);
      },
      reduceMotion ? 1000 : 2300,
    );

    return () => clearTimeout(hideTimer);
  }, [blindFxAwaitingResult, blindFxPhase, blindFxVisible, reduceMotion]);

  useEffect(() => {
    if (!roundFinishSummary || publicState?.phase !== "finished") {
      return;
    }

    const key = `${publicState.turnNumber}:${roundFinishSummary.winnerName}:${roundFinishSummary.loserName}`;

    if (roundFxKeyRef.current === key) {
      return;
    }

    roundFxKeyRef.current = key;

    const showTimer = setTimeout(() => {
      setRoundFxVisible(true);
    }, 0);

    const hideTimer = setTimeout(
      () => {
        setRoundFxVisible(false);
      },
      5000,
    );

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [publicState?.phase, publicState?.turnNumber, reduceMotion, roundFinishSummary]);

  async function submitMove(move: { type: "play"; cardIds: string[] } | { type: "pickup" } | { type: "blind_play" } | { type: "face_up_pickup"; cardId: string }) {
    setSelectedCardIds([]);

    if (move.type === "blind_play") {
      blindFxTokenRef.current += 1;
      const token = blindFxTokenRef.current;

      setBlindFxVisible(true);
      setBlindFxPhase("launch");
      setBlindFxOutcome(null);
      setBlindFxMessage("Reaching for a face-down card...");
      setBlindFxCard(null);
      setBlindFxAwaitingResult(true);

      const revealTimer = setTimeout(
        () => {
          if (blindFxTokenRef.current !== token) {
            return;
          }

          setBlindFxPhase("reveal");
          setBlindFxMessage("Revealing blind card...");
        },
        reduceMotion ? 60 : 220,
      );

      try {
        await onSubmitMove(move);
      } finally {
        clearTimeout(revealTimer);
      }

      return;
    }

    await onSubmitMove(move);
  }

  function getMoveIntentForCard(cardId: string): { type: "play"; cardIds: string[] } | null {
    if (selectedCardIdsSafe.length > 0 && selectedCardIdsSafe.includes(cardId)) {
      return selectedPlayMove;
    }

    const singleKey = playKey([cardId]);

    if (legalPlayKeys.has(singleKey)) {
      return {
        type: "play",
        cardIds: [cardId],
      };
    }

    return null;
  }

  async function onDragEnd(event: DragEndEvent) {
    setDraggingCardId(null);
    setDragIntent(null);
    setIsDiscardLegalHover(false);

    if (!event.over || event.over.id !== DISCARD_DROP_ZONE_ID) {
      return;
    }

    const intent = event.active.data.current?.moveIntent;

    if (!dropIntentAccepted({ intent, legalPlayKeys })) {
      return;
    }

    await submitMove(intent as { type: "play"; cardIds: string[] });
  }

  function onDragStart(event: DragStartEvent) {
    const intent = event.active.data.current?.moveIntent;

    if (dropIntentAccepted({ intent, legalPlayKeys })) {
      setDragIntent(intent as { type: "play"; cardIds: string[] });
    } else {
      setDragIntent(null);
    }
  }

  function onDragOver(event: DragOverEvent) {
    const overDiscard = event.over?.id === DISCARD_DROP_ZONE_ID;
    const accepted = dropIntentAccepted({ intent: dragIntent, legalPlayKeys });
    setIsDiscardLegalHover(Boolean(overDiscard && accepted));
  }

  function onDragCancel() {
    setDraggingCardId(null);
    setDragIntent(null);
    setIsDiscardLegalHover(false);
  }

  if (isWaitingLobby) {
    return <WaitingLobbyView snapshot={snapshot} />;
  }

  if (!publicState) {
    return null;
  }

  return (
    <DndContext
      id={`online-lobby-${snapshot.lobby.id}`}
      sensors={sensors}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragCancel={onDragCancel}
      onDragEnd={(event) => void onDragEnd(event)}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="space-y-4 rounded-2xl border border-zinc-200 bg-[radial-gradient(circle_at_top,#ecfeff,#f8fafc_45%,#ffffff)] p-4 shadow-sm">
          <TurnBanner
            currentPlayerName={currentPlayer?.name ?? null}
            isMyTurn={isMyTurn}
            phase={publicState.phase}
            samePlayerAgain={samePlayerAgain && isMyTurn}
          />

          {roundFinishSummary ? (
            <RoundFinishBanner
              visible
              winnerName={roundFinishSummary.winnerName}
              loserName={roundFinishSummary.loserName}
              reduceMotion={Boolean(reduceMotion)}
            />
          ) : null}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {snapshot.players
              .filter((player) => player.userId !== viewerUserId)
              .map((player) => (
                <PlayerSeat
                  key={player.userId}
                  player={player}
                  publicPlayer={publicState.players.find((entry) => entry.userId === player.userId) ?? null}
                  isCurrentViewer={false}
                  isCurrentTurn={publicState.currentPlayerUserId === player.userId}
                />
              ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DiscardPileDropZone
              count={publicState.discardPileSize}
              topRank={topDiscard?.rank}
              topSuit={topDiscard?.suit}
              enabled={isMyTurn && publicState.phase === "active" && !isSubmittingMove}
              isLegalDragOver={isDiscardLegalHover}
              isPulseActive={burnPulse}
            />
            <DrawPile count={publicState.drawPileCount} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {specialEffectBadge ? (
              <motion.span
                key={specialEffectBadge.label}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className={[
                  "rounded-md border px-2 py-1 text-xs font-semibold",
                  specialEffectBadge.tone === "emerald"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                    : specialEffectBadge.tone === "amber"
                      ? "border-amber-300 bg-amber-50 text-amber-900"
                      : specialEffectBadge.tone === "sky"
                        ? "border-sky-300 bg-sky-50 text-sky-900"
                        : "border-zinc-300 bg-zinc-100 text-zinc-800",
                ].join(" ")}
              >
                {specialEffectBadge.label}
              </motion.span>
            ) : null}
            {burnPulse ? (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-900"
              >
                Pile burned, same player continues
              </motion.span>
            ) : null}
          </div>

          <PlayerSeat
            player={snapshot.players.find((player) => player.userId === viewerUserId) ?? snapshot.players[0]}
            publicPlayer={myPublicPlayer}
            isCurrentViewer
            isCurrentTurn={isMyTurn}
          />

          <PlayerHand
            cards={cardsForCurrentTurn}
            sourceLabel={playableSourceLabel}
            renderCard={(card) => {
              const moveIntent = getMoveIntentForCard(card.id);
              const isLegal = playableCardIds.has(card.id);
              const isHighlighted = selectedRank ? card.rank === selectedRank : isLegal;
              const draggable = canDragCard({
                cardId: card.id,
                isMyTurn,
                isSubmitting: isSubmittingMove,
                selectedCardIds: selectedCardIdsSafe,
                legalPlayKeys,
                playableCardIds,
              });
              const isCardDisabled = !isMyTurn || !isLegal || isSubmittingMove;

              return (
                <DraggablePlayableCard
                  key={card.id}
                  card={card}
                  moveIntent={moveIntent}
                  canDrag={draggable}
                  isCardDisabled={isCardDisabled}
                  isSelected={selectedCardIdsSafe.includes(card.id)}
                  isLegal={isHighlighted}
                  onClick={() => {
                    if (isCardDisabled) {
                      return;
                    }

                    setSelectedCardIds((current) =>
                      toggleSameRankSelection({
                        selectedCardIds: current,
                        clickedCardId: card.id,
                        cardsById,
                      }),
                    );
                  }}
                  onDragStateChange={(dragging) => {
                    setDraggingCardId(dragging ? card.id : null);
                  }}
                />
              );
            }}
          />

          <MoveActionBar
            canPlaySelected={Boolean(selectedPlayMove) && isMyTurn && publicState.phase === "active"}
            canPickup={canPickup && isMyTurn && publicState.phase === "active"}
            canBlindPlay={canBlindPlay && isMyTurn && publicState.phase === "active"}
            isSubmitting={isSubmittingMove}
            selectedCount={selectedCardIdsSafe.length}
            onPlaySelected={() => {
              if (!selectedPlayMove) {
                return;
              }

              void submitMove(selectedPlayMove);
            }}
            onPickup={() => {
              void submitMove({ type: "pickup" });
            }}
            onBlindPlay={() => {
              void submitMove({ type: "blind_play" });
            }}
          />

          {faceUpPickupMoves.length > 0 && isMyTurn ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-900">Face-up fallback pickup</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {faceUpPickupMoves.map((move) => (
                  <button
                    key={move.cardId}
                    type="button"
                    disabled={isSubmittingMove}
                    onClick={() => {
                      void submitMove({ type: "face_up_pickup", cardId: move.cardId });
                    }}
                    className="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs text-amber-900"
                  >
                    Pickup with {move.cardId}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <GameSidebar
          snapshot={snapshot}
          publicState={publicState}
          isRefreshing={isRefreshing}
          isSubmittingMove={isSubmittingMove}
          error={error}
        />
      </div>

      <DragOverlay>
        {draggingPreviewCards.length > 0 ? (
          <motion.div initial={{ scale: 0.94, opacity: 0.85 }} animate={{ scale: 1, opacity: 1 }}>
            <div className="relative h-40 w-28">
              {draggingPreviewCards.map((card, index) => (
                <motion.div
                  key={card.id}
                  className="absolute inset-0"
                  style={{
                    transform: `translate(${index * 9}px, ${index * -5}px) rotate(${index * 2}deg)`,
                  }}
                >
                  <CardView rank={card.rank} suit={card.suit} size="lg" isDragging />
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </DragOverlay>

      <BlindPlayOverlay
        visible={blindFxVisible}
        phase={blindFxPhase}
        outcome={blindFxOutcome}
        message={blindFxMessage}
        revealedCard={blindFxCard}
        reduceMotion={Boolean(reduceMotion)}
      />

      <AnimatePresence>
        {roundFxVisible && roundFinishSummary ? (
          <motion.div
            key="round-finish-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center bg-emerald-950/15 px-4"
          >
            <motion.div
              initial={reduceMotion ? { opacity: 0.95 } : { opacity: 0, y: 24, scale: 0.92 }}
              animate={
                reduceMotion
                  ? { opacity: 1 }
                  : {
                      opacity: 1,
                      y: 0,
                      scale: 1,
                    }
              }
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 220, damping: 20 }}
              className="w-full max-w-lg rounded-2xl border border-emerald-300 bg-[linear-gradient(135deg,#ecfdf5_0%,#dcfce7_50%,#f8fafc_100%)] px-5 py-4 shadow-2xl"
            >
              <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Round Winner</p>
              <p className="mt-2 text-center text-2xl font-black text-emerald-900">{roundFinishSummary.winnerName}</p>
              <p className="mt-1 text-center text-sm text-zinc-700">
                Safe this round. <span className="font-semibold text-red-700">{roundFinishSummary.loserName}</span> is Shithead.
              </p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </DndContext>
  );
}
