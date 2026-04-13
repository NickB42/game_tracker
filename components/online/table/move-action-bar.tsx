"use client";

type MoveActionBarProps = {
  canPlaySelected: boolean;
  canPickup: boolean;
  canBlindPlay: boolean;
  isSubmitting: boolean;
  selectedCount: number;
  onPlaySelected: () => void;
  onPickup: () => void;
  onBlindPlay: () => void;
};

export function MoveActionBar({
  canPlaySelected,
  canPickup,
  canBlindPlay,
  isSubmitting,
  selectedCount,
  onPlaySelected,
  onPickup,
  onBlindPlay,
}: MoveActionBarProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <p className="text-xs uppercase tracking-wide text-zinc-500">Actions</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canPlaySelected || isSubmitting}
          onClick={onPlaySelected}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Play selected{selectedCount > 0 ? ` (${selectedCount})` : ""}
        </button>

        <button
          type="button"
          disabled={!canPickup || isSubmitting}
          onClick={onPickup}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Pickup pile
        </button>

        {canBlindPlay ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onBlindPlay}
            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Play blind card
          </button>
        ) : null}
      </div>
    </div>
  );
}
