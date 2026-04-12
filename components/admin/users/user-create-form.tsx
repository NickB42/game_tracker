"use client";

import { useActionState } from "react";

import { createManagedUserAction, type AdminUserFormState } from "@/actions/admin-users";

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

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-zinc-700">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          maxLength={80}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          required
        />
        {state.fieldErrors?.name ? <p className="mt-1 text-sm text-red-600">{state.fieldErrors.name}</p> : null}
      </div>

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          required
        />
        {state.fieldErrors?.email ? <p className="mt-1 text-sm text-red-600">{state.fieldErrors.email}</p> : null}
      </div>

      <div>
        <label htmlFor="role" className="mb-1 block text-sm font-medium text-zinc-700">
          Role
        </label>
        <select
          id="role"
          name="role"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
          defaultValue="MEMBER"
        >
          <option value="MEMBER">Member</option>
          <option value="ADMIN">Admin</option>
        </select>
        {state.fieldErrors?.role ? <p className="mt-1 text-sm text-red-600">{state.fieldErrors.role}</p> : null}
      </div>

      <div>
        <label htmlFor="playerId" className="mb-1 block text-sm font-medium text-zinc-700">
          Linked player (optional)
        </label>
        <select
          id="playerId"
          name="playerId"
          defaultValue=""
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
        >
          <option value="">No linked player</option>
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.displayName}
            </option>
          ))}
        </select>
        {state.fieldErrors?.playerId ? <p className="mt-1 text-sm text-red-600">{state.fieldErrors.playerId}</p> : null}
      </div>

      <div>
        <label htmlFor="temporaryPassword" className="mb-1 block text-sm font-medium text-zinc-700">
          Temporary password
        </label>
        <input
          id="temporaryPassword"
          name="temporaryPassword"
          type="password"
          autoComplete="new-password"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          required
        />
        {state.fieldErrors?.temporaryPassword ? (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.temporaryPassword}</p>
        ) : null}
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          name="mustChangePassword"
          defaultChecked
          className="size-4 rounded border-zinc-300"
        />
        Force password change on next login
      </label>

      {state.message ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Creating..." : "Create user"}
      </button>
    </form>
  );
}
