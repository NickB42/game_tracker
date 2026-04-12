"use client";

import { useActionState } from "react";

import { createRoundAction, type RoundFormState, updateRoundAction } from "@/actions/rounds";

type ParticipantOption = {
  sessionParticipantId: string;
  playerDisplayName: string;
  isActive: boolean;
};

type RoundFormDefaults = {
  orderedSessionParticipantIds: string[];
  notes?: string | null;
};

type RoundFormProps =
  | {
      mode: "create";
      gameSessionId: string;
      groupId: string | null;
      participantOptions: ParticipantOption[];
      defaultValues?: RoundFormDefaults;
    }
  | {
      mode: "edit";
      gameSessionId: string;
      roundId: string;
      groupId: string | null;
      participantOptions: ParticipantOption[];
      defaultValues: RoundFormDefaults;
    };

export function RoundForm(props: RoundFormProps) {
  const action =
    props.mode === "edit"
      ? updateRoundAction.bind(null, props.gameSessionId, props.roundId, props.groupId)
      : createRoundAction.bind(null, props.gameSessionId, props.groupId);

  const initialState: RoundFormState = {};
  const [state, formAction, isPending] = useActionState(action, initialState);

  const participantCount = props.participantOptions.length;
  const defaultOrder = props.defaultValues?.orderedSessionParticipantIds ?? props.participantOptions.map((option) => option.sessionParticipantId);

  return (
    <form action={formAction} className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm" data-testid="round-form">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Round finishing order</h2>
        <p className="mt-1 text-sm text-zinc-600">Set every participant exactly once from 1st place to last place.</p>
      </div>

      <div className="space-y-3">
        {Array.from({ length: participantCount }).map((_, index) => (
          <div key={index}>
            <label htmlFor={`position-${index + 1}`} className="mb-1 block text-sm font-medium text-zinc-700">
              Position {index + 1}
            </label>
            <select
              id={`position-${index + 1}`}
              name="orderedSessionParticipantIds"
              defaultValue={defaultOrder[index] ?? ""}
              data-testid={`round-position-select-${index + 1}`}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
              required
            >
              <option value="" disabled>
                Select participant
              </option>
              {props.participantOptions.map((option) => (
                <option key={option.sessionParticipantId} value={option.sessionParticipantId}>
                  {option.playerDisplayName}
                  {!option.isActive ? " (inactive)" : ""}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {state.fieldErrors?.orderedSessionParticipantIds ? (
        <p className="text-sm text-red-600">{state.fieldErrors.orderedSessionParticipantIds}</p>
      ) : null}

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium text-zinc-700">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          maxLength={1000}
          defaultValue={props.defaultValues?.notes ?? ""}
          rows={4}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          placeholder="Optional round notes"
        />
        {state.fieldErrors?.notes ? <p className="mt-1 text-sm text-red-600">{state.fieldErrors.notes}</p> : null}
      </div>

      {state.message ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</div>
      ) : null}

      <button
        type="submit"
        disabled={isPending || participantCount < 2}
        data-testid="round-submit-button"
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Saving..." : props.mode === "edit" ? "Save round" : "Add round"}
      </button>
    </form>
  );
}
