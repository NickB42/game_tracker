"use client";

import { useActionState, useEffect, useRef } from "react";

import { createPlayerAction, type PlayerFormState, updatePlayerAction } from "@/actions/players";
import { Field, FormSection } from "@/components/ui/form-primitives";
import { useToast } from "@/components/ui/toast";

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
  const { pushToast } = useToast();
  const lastErrorMessageRef = useRef<string | null>(null);

  const initialState: PlayerFormState = {};
  const [state, formAction, isPending] = useActionState(action, initialState);

  const defaults = props.defaultValues;

  useEffect(() => {
    if (!state.message || state.message === lastErrorMessageRef.current) {
      return;
    }

    lastErrorMessageRef.current = state.message;
    pushToast({
      title: "Player action failed",
      description: state.message,
      tone: "error",
    });
  }, [pushToast, state.message]);

  return (
    <form action={formAction} className="app-card space-y-5 p-6">
      <Field id="displayName" label="Display name" error={state.fieldErrors?.displayName}>
        <input
          id="displayName"
          name="displayName"
          type="text"
          maxLength={80}
          defaultValue={defaults?.displayName ?? ""}
          data-testid="player-display-name-input"
          className="app-input"
          required
        />
      </Field>

      <Field id="notes" label="Notes" error={state.fieldErrors?.notes}>
        <textarea id="notes" name="notes" maxLength={500} defaultValue={defaults?.notes ?? ""} rows={4} className="app-textarea" placeholder="Optional context about this player" />
      </Field>

      <FormSection title="Availability" description="Inactive players remain historical but cannot be picked for new participation lists.">
        <label className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input type="checkbox" name="isActive" defaultChecked={defaults?.isActive ?? true} className="size-4 rounded border-[var(--border)]" />
          Active player
        </label>
      </FormSection>

      {state.message ? (
        <div className="app-card-muted border-[color:color-mix(in_srgb,var(--danger)_45%,var(--border))] px-3 py-2 text-sm text-[var(--danger)]">
          {state.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        data-testid="player-submit-button"
        className="app-button app-button-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Saving..." : props.mode === "edit" ? "Save changes" : "Create player"}
      </button>
    </form>
  );
}