"use client";

import { useActionState } from "react";

import { createGroupAction, type GroupFormState, updateGroupAction } from "@/actions/groups";

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

  const initialState: GroupFormState = {};
  const [state, formAction, isPending] = useActionState(action, initialState);

  const defaults = props.defaultValues;
  const selectedSet = new Set(defaults?.memberPlayerIds ?? []);
  const selectedTrustedAdminSet = new Set(defaults?.trustedAdminUserIds ?? []);

  return (
    <form action={formAction} className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-zinc-700">
          Group name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          maxLength={80}
          defaultValue={defaults?.name ?? ""}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          required
        />
        {state.fieldErrors?.name ? <p className="mt-1 text-sm text-red-600">{state.fieldErrors.name}</p> : null}
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-zinc-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          maxLength={500}
          defaultValue={defaults?.description ?? ""}
          rows={4}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          placeholder="Optional description"
        />
        {state.fieldErrors?.description ? (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.description}</p>
        ) : null}
      </div>

      <section>
        <h2 className="text-sm font-medium text-zinc-900">Trusted admins</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Trusted admins can edit this group. Their permissions are copied to linked sessions when those sessions are
          created or edited.
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
                  defaultChecked={selectedTrustedAdminSet.has(user.id)}
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
        <h2 className="text-sm font-medium text-zinc-900">Members</h2>
        <p className="mt-1 text-sm text-zinc-600">Select existing players to include in this group.</p>

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
                  name="playerIds"
                  value={player.id}
                  defaultChecked={selectedSet.has(player.id)}
                  className="size-4 rounded border-zinc-300"
                />
              </label>
            ))
          )}
        </div>
        {state.fieldErrors?.playerIds ? <p className="mt-1 text-sm text-red-600">{state.fieldErrors.playerIds}</p> : null}
      </section>

      {state.message ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Saving..." : props.mode === "edit" ? "Save changes" : "Create group"}
      </button>
    </form>
  );
}