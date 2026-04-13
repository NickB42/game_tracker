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
    <div className="app-card-muted rounded-xl p-3">
      <p className="app-caption uppercase tracking-wide">Actions</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canPlaySelected || isSubmitting}
          onClick={onPlaySelected}
          className="app-button app-button-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Play selected{selectedCount > 0 ? ` (${selectedCount})` : ""}
        </button>

        <button
          type="button"
          disabled={!canPickup || isSubmitting}
          onClick={onPickup}
          className="app-button app-button-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Pickup pile
        </button>

        {canBlindPlay ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onBlindPlay}
            className="app-button app-button-destructive disabled:cursor-not-allowed disabled:opacity-50"
          >
            Play blind card
          </button>
        ) : null}
      </div>
    </div>
  );
}
