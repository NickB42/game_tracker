"use client";

import { useActionState } from "react";

import { createPlayerAction, type PlayerFormState, updatePlayerAction } from "@/actions/players";

type PlayerFormProps =
  | {
      mode: "create";
      defaultValues?: {
        displayName?: string;
        notes?: string | null;
        isActive?: boolean;
      };
    }
  | {
      mode: "edit";
      playerId: string;
      defaultValues: {
        displayName: string;
        notes?: string | null;
        isActive: boolean;
      };
    };

export function PlayerForm(props: PlayerFormProps) {
  const action = props.mode === "edit" ? updatePlayerAction.bind(null, props.playerId) : createPlayerAction;

  const initialState: PlayerFormState = {};
  const [state, formAction, isPending] = useActionState(action, initialState);

  const defaults = props.defaultValues;

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div>
        <label htmlFor="displayName" className="mb-1 block text-sm font-medium text-zinc-700">
          Display name
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          maxLength={80}
          defaultValue={defaults?.displayName ?? ""}
          data-testid="player-display-name-input"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          required
        />
        {state.fieldErrors?.displayName ? (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.displayName}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium text-zinc-700">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          maxLength={500}
          defaultValue={defaults?.notes ?? ""}
          rows={4}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          placeholder="Optional context about this player"
        />
        {state.fieldErrors?.notes ? <p className="mt-1 text-sm text-red-600">{state.fieldErrors.notes}</p> : null}
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={defaults?.isActive ?? true}
          className="size-4 rounded border-zinc-300"
        />
        Active player
      </label>

      {state.message ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        data-testid="player-submit-button"
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Saving..." : props.mode === "edit" ? "Save changes" : "Create player"}
      </button>
    </form>
  );
}