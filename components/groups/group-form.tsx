"use client";

import { useActionState, useEffect, useRef } from "react";

import { createGroupAction, type GroupFormState, updateGroupAction } from "@/actions/groups";
import { Field, FormSection } from "@/components/ui/form-primitives";
import { useToast } from "@/components/ui/toast";

type SelectablePlayer = {
  id: string;
  displayName: string;
  isActive: boolean;
};

type SelectableUser = {
  id: string;
  name: string;
  email: string;
};

type GroupFormProps =
  | {
      mode: "create";
      selectablePlayers: SelectablePlayer[];
      selectableUsers: SelectableUser[];
      defaultValues?: {
        name?: string;
        description?: string | null;
        memberPlayerIds?: string[];
        trustedAdminUserIds?: string[];
      };
    }
  | {
      mode: "edit";
      groupId: string;
      selectablePlayers: SelectablePlayer[];
      selectableUsers: SelectableUser[];
      defaultValues: {
        name: string;
        description?: string | null;
        memberPlayerIds: string[];
        trustedAdminUserIds: string[];
      };
    };

export function GroupForm(props: GroupFormProps) {
  const action = props.mode === "edit" ? updateGroupAction.bind(null, props.groupId) : createGroupAction;
  const { pushToast } = useToast();
  const lastErrorMessageRef = useRef<string | null>(null);

  const initialState: GroupFormState = {};
  const [state, formAction, isPending] = useActionState(action, initialState);

  const defaults = props.defaultValues;
  const selectedSet = new Set(defaults?.memberPlayerIds ?? []);
  const selectedTrustedAdminSet = new Set(defaults?.trustedAdminUserIds ?? []);

  useEffect(() => {
    if (!state.message || state.message === lastErrorMessageRef.current) {
      return;
    }

    lastErrorMessageRef.current = state.message;
    pushToast({
      title: "Group action failed",
      description: state.message,
      tone: "error",
    });
  }, [pushToast, state.message]);

  return (
    <form action={formAction} className="app-card space-y-5 p-6">
      <Field id="name" label="Group name" error={state.fieldErrors?.name}>
        <input
          id="name"
          name="name"
          type="text"
          maxLength={80}
          defaultValue={defaults?.name ?? ""}
          className="app-input"
          required
        />
      </Field>

      <Field id="description" label="Description" error={state.fieldErrors?.description}>
        <textarea
          id="description"
          name="description"
          maxLength={500}
          defaultValue={defaults?.description ?? ""}
          rows={4}
          className="app-textarea"
          placeholder="Optional description"
        />
      </Field>

      <FormSection title="Trusted admins" description="Trusted admins can edit this group. Their permissions are copied to linked sessions when those sessions are created or edited.">
        <div className="mt-3 max-h-48 space-y-2 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--border)] p-3">
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
                  defaultChecked={selectedTrustedAdminSet.has(user.id)}
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

      <FormSection title="Members" description="Select existing players to include in this group.">
        <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--border)] p-3">
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
                  name="playerIds"
                  value={player.id}
                  defaultChecked={selectedSet.has(player.id)}
                  className="size-4 rounded border-[var(--border)]"
                />
              </label>
            ))
          )}
        </div>
        {state.fieldErrors?.playerIds ? <p className="mt-1 text-xs text-[var(--danger)]">{state.fieldErrors.playerIds}</p> : null}
      </FormSection>

      {state.message ? (
        <div className="app-card-muted border-[color:color-mix(in_srgb,var(--danger)_45%,var(--border))] px-3 py-2 text-sm text-[var(--danger)]">
          {state.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="app-button app-button-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Saving..." : props.mode === "edit" ? "Save changes" : "Create group"}
      </button>
    </form>
  );
}