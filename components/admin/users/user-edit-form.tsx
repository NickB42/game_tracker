"use client";

import { useActionState } from "react";

import {
  resetManagedUserPasswordAction,
  updateManagedUserAction,
  type AdminResetPasswordFormState,
  type AdminUserFormState,
} from "@/actions/admin-users";

type PlayerOption = {
  id: string;
  displayName: string;
};

type UserEditFormProps = {
  user: {
    id: string;
    email: string;
    name: string;
    role: "ADMIN" | "MEMBER";
    playerId: string | null;
    mustChangePassword: boolean;
  };
  players: PlayerOption[];
};

export function UserEditForm({ user, players }: UserEditFormProps) {
  const updateAction = updateManagedUserAction.bind(null, user.id);
  const resetPasswordAction = resetManagedUserPasswordAction.bind(null, user.id);

  const updateInitialState: AdminUserFormState = {};
  const resetInitialState: AdminResetPasswordFormState = {};

  const [updateState, updateFormAction, isUpdating] = useActionState(updateAction, updateInitialState);
  const [passwordState, passwordFormAction, isResetting] = useActionState(resetPasswordAction, resetInitialState);

  return (
    <div className="space-y-5">
      <form action={updateFormAction} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={user.email}
              disabled
              className="w-full cursor-not-allowed rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-700"
            />
          </div>

          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-zinc-700">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              maxLength={80}
              defaultValue={user.name}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
              required
            />
            {updateState.fieldErrors?.name ? <p className="mt-1 text-sm text-red-600">{updateState.fieldErrors.name}</p> : null}
          </div>

          <div>
            <label htmlFor="role" className="mb-1 block text-sm font-medium text-zinc-700">
              Role
            </label>
            <select
              id="role"
              name="role"
              defaultValue={user.role}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
            {updateState.fieldErrors?.role ? <p className="mt-1 text-sm text-red-600">{updateState.fieldErrors.role}</p> : null}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="playerId" className="mb-1 block text-sm font-medium text-zinc-700">
              Linked player
            </label>
            <select
              id="playerId"
              name="playerId"
              defaultValue={user.playerId ?? ""}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
            >
              <option value="">No linked player</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.displayName}
                </option>
              ))}
            </select>
            {updateState.fieldErrors?.playerId ? <p className="mt-1 text-sm text-red-600">{updateState.fieldErrors.playerId}</p> : null}
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            name="mustChangePassword"
            defaultChecked={user.mustChangePassword}
            className="size-4 rounded border-zinc-300"
          />
          Require password change on next login
        </label>

        {updateState.message ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{updateState.message}</div>
        ) : null}

        {updateState.success ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {updateState.success}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isUpdating}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUpdating ? "Saving..." : "Save user details"}
        </button>
      </form>

      <form action={passwordFormAction} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Reset password</h2>

        <div>
          <label htmlFor="newPassword" className="mb-1 block text-sm font-medium text-zinc-700">
            New temporary password
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            required
          />
          {passwordState.fieldErrors?.newPassword ? (
            <p className="mt-1 text-sm text-red-600">{passwordState.fieldErrors.newPassword}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="confirmNewPassword" className="mb-1 block text-sm font-medium text-zinc-700">
            Confirm new temporary password
          </label>
          <input
            id="confirmNewPassword"
            name="confirmNewPassword"
            type="password"
            autoComplete="new-password"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            required
          />
          {passwordState.fieldErrors?.confirmNewPassword ? (
            <p className="mt-1 text-sm text-red-600">{passwordState.fieldErrors.confirmNewPassword}</p>
          ) : null}
        </div>

        <label className="block text-sm text-zinc-700">
          <input type="checkbox" name="mustChangePassword" defaultChecked className="mr-2 size-4 rounded border-zinc-300" />
          Force password change on next login
        </label>

        <label className="block text-sm text-zinc-700">
          <input type="checkbox" name="revokeExistingSessions" className="mr-2 size-4 rounded border-zinc-300" />
          Revoke active sessions for this user
        </label>

        {passwordState.message ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{passwordState.message}</div>
        ) : null}

        {passwordState.success ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {passwordState.success}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isResetting}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isResetting ? "Updating..." : "Set temporary password"}
        </button>
      </form>
    </div>
  );
}
