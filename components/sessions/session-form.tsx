"use client";

import { useActionState } from "react";

import { createGameSessionAction, type SessionFormState, updateGameSessionAction } from "@/actions/sessions";
import { Field, FormSection } from "@/components/ui/form-primitives";

type SelectablePlayer = {
  id: string;
  displayName: string;
  isActive: boolean;
};

type SelectableGroup = {
  id: string;
  name: string;
};

type SelectableUser = {
  id: string;
  name: string;
  email: string;
};

type SessionFormDefaults = {
  groupId?: string | null;
  title?: string | null;
  playedAt?: string;
  notes?: string | null;
  participantIds?: string[];
  trustedAdminUserIds?: string[];
};

type SessionFormProps =
  | {
      mode: "create";
      selectablePlayers: SelectablePlayer[];
      selectableGroups: SelectableGroup[];
      selectableUsers: SelectableUser[];
      defaultValues?: SessionFormDefaults;
    }
  | {
      mode: "edit";
      gameSessionId: string;
      selectablePlayers: SelectablePlayer[];
      selectableGroups: SelectableGroup[];
      selectableUsers: SelectableUser[];
      defaultValues: SessionFormDefaults;
    };

function toDateTimeLocalInputValue(isoString?: string) {
  if (!isoString) {
    return "";
  }

  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (value: number) => String(value).padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function SessionForm(props: SessionFormProps) {
  const action = props.mode === "edit" ? updateGameSessionAction.bind(null, props.gameSessionId) : createGameSessionAction;
  const initialState: SessionFormState = {};
  const [state, formAction, isPending] = useActionState(action, initialState);

  const defaults = props.defaultValues;
  const selectedParticipantIds = new Set(defaults?.participantIds ?? []);
  const selectedTrustedAdminUserIds = new Set(defaults?.trustedAdminUserIds ?? []);
  const playedAtDefault = defaults?.playedAt ? toDateTimeLocalInputValue(defaults.playedAt) : toDateTimeLocalInputValue(new Date().toISOString());

  return (
    <form action={formAction} className="app-card space-y-5 p-6">
      <Field id="groupId" label="Group" error={state.fieldErrors?.groupId}>
        <select
          id="groupId"
          name="groupId"
          defaultValue={defaults?.groupId ?? ""}
          className="app-select"
        >
          <option value="">No group</option>
          {props.selectableGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </Field>

      <Field id="title" label="Title" error={state.fieldErrors?.title}>
        <input
          id="title"
          name="title"
          type="text"
          maxLength={120}
          defaultValue={defaults?.title ?? ""}
          data-testid="session-title-input"
          className="app-input"
          placeholder="Optional title"
        />
      </Field>

      <Field id="playedAt" label="Played at" error={state.fieldErrors?.playedAt}>
        <input
          id="playedAt"
          name="playedAt"
          type="datetime-local"
          defaultValue={playedAtDefault}
          className="app-input"
          required
        />
      </Field>

      <Field id="notes" label="Notes" error={state.fieldErrors?.notes}>
        <textarea
          id="notes"
          name="notes"
          maxLength={1000}
          defaultValue={defaults?.notes ?? ""}
          rows={4}
          className="app-textarea"
          placeholder="Optional notes"
        />
      </Field>

      <FormSection
        title="Trusted session admins"
        description="Trusted session admins can edit this session and rounds. Group trusted admins are auto-included when a group is selected."
      >
        <div className="max-h-48 space-y-2 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--border)] p-3">
          {props.selectableUsers.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No users available yet.</p>
          ) : (
            props.selectableUsers.map((user) => (
              <label key={user.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-xs)] px-2 py-1 hover:bg-[var(--surface-muted)]">
                <span className="text-sm text-[var(--text-secondary)]">
                  {user.name}
                  {user.email ? <span className="ml-2 text-xs text-[var(--text-muted)]">({user.email})</span> : null}
                </span>
                <input
                  type="checkbox"
                  name="trustedAdminUserIds"
                  value={user.id}
                  defaultChecked={selectedTrustedAdminUserIds.has(user.id)}
                  className="size-4 rounded border-[var(--border)]"
                />
              </label>
            ))
          )}
        </div>
        {state.fieldErrors?.trustedAdminUserIds ? (
          <p className="mt-1 text-xs text-[var(--danger)]">{state.fieldErrors.trustedAdminUserIds}</p>
        ) : null}
      </FormSection>

      <FormSection title="Participants" description="Select the players who actually attended this session. Minimum 2.">
        <div className="max-h-72 space-y-2 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--border)] p-3">
          {props.selectablePlayers.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No players available yet.</p>
          ) : (
            props.selectablePlayers.map((player) => (
              <label key={player.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-xs)] px-2 py-1 hover:bg-[var(--surface-muted)]">
                <span className="text-sm text-[var(--text-secondary)]">
                  {player.displayName}
                  {!player.isActive ? <span className="ml-2 text-xs text-[var(--text-muted)]">(inactive)</span> : null}
                </span>
                <input
                  type="checkbox"
                  name="participantIds"
                  value={player.id}
                  defaultChecked={selectedParticipantIds.has(player.id)}
                  aria-label={player.displayName}
                  className="size-4 rounded border-[var(--border)]"
                />
              </label>
            ))
          )}
        </div>
        {state.fieldErrors?.participantIds ? (
          <p className="mt-1 text-xs text-[var(--danger)]">{state.fieldErrors.participantIds}</p>
        ) : null}
      </FormSection>

      {state.message ? (
        <div className="app-card-muted border-[color:color-mix(in_srgb,var(--danger)_45%,var(--border))] px-3 py-2 text-sm text-[var(--danger)]">{state.message}</div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        data-testid="session-submit-button"
        className="app-button app-button-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Saving..." : props.mode === "edit" ? "Save changes" : "Create session"}
      </button>
    </form>
  );
}
