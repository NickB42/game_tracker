"use client";

import { useActionState, useEffect, useRef } from "react";

import { createManagedUserAction, type AdminUserFormState } from "@/actions/admin-users";
import { Field } from "@/components/ui/form-primitives";
import { useToast } from "@/components/ui/toast";

type PlayerOption = {
  id: string;
  displayName: string;
};

type UserCreateFormProps = {
  players: PlayerOption[];
};

export function UserCreateForm({ players }: UserCreateFormProps) {
  const initialState: AdminUserFormState = {};
  const [state, formAction, isPending] = useActionState(createManagedUserAction, initialState);
  const { pushToast } = useToast();
  const lastErrorMessageRef = useRef<string | null>(null);

  useEffect(() => {
    if (!state.message || state.message === lastErrorMessageRef.current) {
      return;
    }

    lastErrorMessageRef.current = state.message;
    pushToast({ title: "User creation failed", description: state.message, tone: "error" });
  }, [pushToast, state.message]);

  return (
    <form action={formAction} className="app-card space-y-4 p-6">
      <Field id="name" label="Name" error={state.fieldErrors?.name}>
        <input
          id="name"
          name="name"
          type="text"
          maxLength={80}
          className="app-input"
          required
        />
      </Field>

      <Field id="email" label="Email" error={state.fieldErrors?.email}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className="app-input"
          required
        />
      </Field>

      <Field id="role" label="Role" error={state.fieldErrors?.role}>
        <select
          id="role"
          name="role"
          className="app-select"
          defaultValue="MEMBER"
        >
          <option value="MEMBER">Member</option>
          <option value="ADMIN">Admin</option>
        </select>
      </Field>

      <Field id="playerId" label="Linked player (optional)" error={state.fieldErrors?.playerId}>
        <select
          id="playerId"
          name="playerId"
          defaultValue=""
          className="app-select"
        >
          <option value="">No linked player</option>
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.displayName}
            </option>
          ))}
        </select>
      </Field>

      <Field id="temporaryPassword" label="Temporary password" error={state.fieldErrors?.temporaryPassword}>
        <input
          id="temporaryPassword"
          name="temporaryPassword"
          type="password"
          autoComplete="new-password"
          className="app-input"
          required
        />
      </Field>

      <label className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <input
          type="checkbox"
          name="mustChangePassword"
          defaultChecked
          className="size-4 rounded border-[var(--border)]"
        />
        Force password change on next login
      </label>

      {state.message ? (
        <div className="app-card-muted border-[color:color-mix(in_srgb,var(--danger)_45%,var(--border))] px-3 py-2 text-sm text-[var(--danger)]">{state.message}</div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="app-button app-button-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Creating..." : "Create user"}
      </button>
    </form>
  );
}
