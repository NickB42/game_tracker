"use client";

import { useActionState } from "react";
import Link from "next/link";

import { changeOwnPasswordAction, type SecurityFormState } from "@/actions/account-security";

type SecurityPasswordFormProps = {
  isForcedFlow?: boolean;
};

export function SecurityPasswordForm({ isForcedFlow = false }: SecurityPasswordFormProps) {
  const initialState: SecurityFormState = {};
  const [state, formAction, isPending] = useActionState(changeOwnPasswordAction, initialState);

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      data-testid="force-password-change-form"
    >
      <div>
        <label htmlFor="currentPassword" className="mb-1 block text-sm font-medium text-zinc-700">
          Current password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          data-testid="security-current-password-input"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          required
        />
        {state.fieldErrors?.currentPassword ? (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.currentPassword}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="newPassword" className="mb-1 block text-sm font-medium text-zinc-700">
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          data-testid="security-new-password-input"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          required
        />
        {state.fieldErrors?.newPassword ? <p className="mt-1 text-sm text-red-600">{state.fieldErrors.newPassword}</p> : null}
      </div>

      <div>
        <label htmlFor="confirmNewPassword" className="mb-1 block text-sm font-medium text-zinc-700">
          Confirm new password
        </label>
        <input
          id="confirmNewPassword"
          name="confirmNewPassword"
          type="password"
          autoComplete="new-password"
          data-testid="security-confirm-password-input"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          required
        />
        {state.fieldErrors?.confirmNewPassword ? (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.confirmNewPassword}</p>
        ) : null}
      </div>

      {!isForcedFlow ? (
        <label className="block text-sm text-zinc-700">
          <input type="checkbox" name="revokeOtherSessions" className="mr-2 size-4 rounded border-zinc-300" />
          Log out my other sessions
        </label>
      ) : null}

      {state.message ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</div>
      ) : null}

      {state.success ? (
        <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700" data-testid="security-success-message">
          <p>{state.success}</p>
          {isForcedFlow ? (
            <Link href="/dashboard" className="font-medium underline" data-testid="force-password-continue-link">
              Continue to dashboard
            </Link>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        data-testid="security-submit-button"
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Saving..." : "Update password"}
      </button>
    </form>
  );
}
