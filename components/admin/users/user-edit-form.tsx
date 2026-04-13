"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  resetManagedUserPasswordAction,
  updateManagedUserAction,
  type AdminResetPasswordFormState,
  type AdminUserFormState,
} from "@/actions/admin-users";
import { Field, FormSection } from "@/components/ui/form-primitives";
import { useToast } from "@/components/ui/toast";

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
  const { pushToast } = useToast();
  const lastFeedbackRef = useRef<string | null>(null);

  const updateInitialState: AdminUserFormState = {};
  const resetInitialState: AdminResetPasswordFormState = {};

  const [updateState, updateFormAction, isUpdating] = useActionState(updateAction, updateInitialState);
  const [passwordState, passwordFormAction, isResetting] = useActionState(resetPasswordAction, resetInitialState);

  useEffect(() => {
    const message = updateState.message ?? passwordState.message;
    const success = updateState.success ?? passwordState.success;

    if (message) {
      const key = `error:${message}`;

      if (key === lastFeedbackRef.current) {
        return;
      }

      lastFeedbackRef.current = key;
      pushToast({ title: "User update failed", description: message, tone: "error" });
      return;
    }

    if (success) {
      const key = `success:${success}`;

      if (key === lastFeedbackRef.current) {
        return;
      }

      lastFeedbackRef.current = key;
      pushToast({ title: "User updated", description: success, tone: "success" });
    }
  }, [passwordState.message, passwordState.success, pushToast, updateState.message, updateState.success]);

  return (
    <div className="space-y-5">
      <form action={updateFormAction} className="app-card space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="email" label="Email" hint="Email is immutable after account creation.">
            <input
              id="email"
              type="email"
              value={user.email}
              disabled
              className="app-input cursor-not-allowed opacity-70"
            />
          </Field>

          <Field id="name" label="Name" error={updateState.fieldErrors?.name}>
            <input
              id="name"
              name="name"
              type="text"
              maxLength={80}
              defaultValue={user.name}
              className="app-input"
              required
            />
          </Field>

          <Field id="role" label="Role" error={updateState.fieldErrors?.role}>
            <select
              id="role"
              name="role"
              defaultValue={user.role}
              className="app-select"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </Field>

          <Field id="playerId" label="Linked player" error={updateState.fieldErrors?.playerId}>
            <select
              id="playerId"
              name="playerId"
              defaultValue={user.playerId ?? ""}
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
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input
            type="checkbox"
            name="mustChangePassword"
            defaultChecked={user.mustChangePassword}
            className="size-4 rounded border-[var(--border)]"
          />
          Require password change on next login
        </label>

        {updateState.message ? (
          <div className="app-card-muted border-[color:color-mix(in_srgb,var(--danger)_45%,var(--border))] px-3 py-2 text-sm text-[var(--danger)]">{updateState.message}</div>
        ) : null}

        {updateState.success ? (
          <div className="rounded-[var(--radius-sm)] border border-[color:color-mix(in_srgb,var(--success)_45%,var(--border))] bg-[color:color-mix(in_srgb,var(--success)_14%,transparent)] px-3 py-2 text-sm text-[var(--success)]">
            {updateState.success}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isUpdating}
          className="app-button app-button-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUpdating ? "Saving..." : "Save user details"}
        </button>
      </form>

      <form action={passwordFormAction} className="app-card space-y-4 p-6">
        <FormSection title="Reset password" description="Set a temporary password and session policy updates.">
          <div />
        </FormSection>

        <Field id="newPassword" label="New temporary password" error={passwordState.fieldErrors?.newPassword}>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            className="app-input"
            required
          />
        </Field>

        <Field id="confirmNewPassword" label="Confirm new temporary password" error={passwordState.fieldErrors?.confirmNewPassword}>
          <input
            id="confirmNewPassword"
            name="confirmNewPassword"
            type="password"
            autoComplete="new-password"
            className="app-input"
            required
          />
        </Field>

        <label className="block text-sm text-[var(--text-secondary)]">
          <input type="checkbox" name="mustChangePassword" defaultChecked className="mr-2 size-4 rounded border-[var(--border)]" />
          Force password change on next login
        </label>

        <label className="block text-sm text-[var(--text-secondary)]">
          <input type="checkbox" name="revokeExistingSessions" className="mr-2 size-4 rounded border-[var(--border)]" />
          Revoke active sessions for this user
        </label>

        {passwordState.message ? (
          <div className="app-card-muted border-[color:color-mix(in_srgb,var(--danger)_45%,var(--border))] px-3 py-2 text-sm text-[var(--danger)]">{passwordState.message}</div>
        ) : null}

        {passwordState.success ? (
          <div className="rounded-[var(--radius-sm)] border border-[color:color-mix(in_srgb,var(--success)_45%,var(--border))] bg-[color:color-mix(in_srgb,var(--success)_14%,transparent)] px-3 py-2 text-sm text-[var(--success)]">
            {passwordState.success}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isResetting}
          className="app-button app-button-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isResetting ? "Updating..." : "Set temporary password"}
        </button>
      </form>
    </div>
  );
}
