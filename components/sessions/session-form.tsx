"use client";

import { useActionState } from "react";

import { createGameSessionAction, type SessionFormState, updateGameSessionAction } from "@/actions/sessions";

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
    <form action={formAction} className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div>
        <label htmlFor="groupId" className="mb-1 block text-sm font-medium text-zinc-700">
          Group
        </label>
        <select
          id="groupId"
          name="groupId"
          defaultValue={defaults?.groupId ?? ""}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        >
          <option value="">No group</option>
          {props.selectableGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
        {state.fieldErrors?.groupId ? <p className="mt-1 text-sm text-red-600">{state.fieldErrors.groupId}</p> : null}
      </div>

      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-medium text-zinc-700">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          maxLength={120}
          defaultValue={defaults?.title ?? ""}
          data-testid="session-title-input"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          placeholder="Optional title"
        />
        {state.fieldErrors?.title ? <p className="mt-1 text-sm text-red-600">{state.fieldErrors.title}</p> : null}
      </div>

      <div>
        <label htmlFor="playedAt" className="mb-1 block text-sm font-medium text-zinc-700">
          Played at
        </label>
        <input
          id="playedAt"
          name="playedAt"
          type="datetime-local"
          defaultValue={playedAtDefault}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          required
        />
        {state.fieldErrors?.playedAt ? <p className="mt-1 text-sm text-red-600">{state.fieldErrors.playedAt}</p> : null}
      </div>

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium text-zinc-700">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          maxLength={1000}
          defaultValue={defaults?.notes ?? ""}
          rows={4}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          placeholder="Optional notes"
        />
        {state.fieldErrors?.notes ? <p className="mt-1 text-sm text-red-600">{state.fieldErrors.notes}</p> : null}
      </div>

      <section>
        <h2 className="text-sm font-medium text-zinc-900">Trusted session admins</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Trusted session admins can edit this session and rounds. Group trusted admins are auto-included when a group is selected.
        </p>

        <div className="mt-3 max-h-48 space-y-2 overflow-y-auto rounded-lg border border-zinc-200 p-3">
          {props.selectableUsers.length === 0 ? (
            <p className="text-sm text-zinc-600">No users available yet.</p>
          ) : (
            props.selectableUsers.map((user) => (
              <label key={user.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-1 hover:bg-zinc-50">
                <span className="text-sm text-zinc-800">
                  {user.name}
                  {user.email ? <span className="ml-2 text-xs text-zinc-500">({user.email})</span> : null}
                </span>
                <input
                  type="checkbox"
                  name="trustedAdminUserIds"
                  value={user.id}
                  defaultChecked={selectedTrustedAdminUserIds.has(user.id)}
                  className="size-4 rounded border-zinc-300"
                />
              </label>
            ))
          )}
        </div>
        {state.fieldErrors?.trustedAdminUserIds ? (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.trustedAdminUserIds}</p>
        ) : null}
      </section>

      <section>
        <h2 className="text-sm font-medium text-zinc-900">Participants</h2>
        <p className="mt-1 text-sm text-zinc-600">Select the players who actually attended this session. Minimum 2.</p>

        <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-lg border border-zinc-200 p-3">
          {props.selectablePlayers.length === 0 ? (
            <p className="text-sm text-zinc-600">No players available yet.</p>
          ) : (
            props.selectablePlayers.map((player) => (
              <label key={player.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-1 hover:bg-zinc-50">
                <span className="text-sm text-zinc-800">
                  {player.displayName}
                  {!player.isActive ? <span className="ml-2 text-xs text-zinc-500">(inactive)</span> : null}
                </span>
                <input
                  type="checkbox"
                  name="participantIds"
                  value={player.id}
                  defaultChecked={selectedParticipantIds.has(player.id)}
                  aria-label={player.displayName}
                  className="size-4 rounded border-zinc-300"
                />
              </label>
            ))
          )}
        </div>
        {state.fieldErrors?.participantIds ? (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.participantIds}</p>
        ) : null}
      </section>

      {state.message ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        data-testid="session-submit-button"
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Saving..." : props.mode === "edit" ? "Save changes" : "Create session"}
      </button>
    </form>
  );
}
