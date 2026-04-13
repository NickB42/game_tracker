"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";

import { changeOwnPasswordAction, type SecurityFormState } from "@/actions/account-security";
import { Field } from "@/components/ui/form-primitives";
import { useToast } from "@/components/ui/toast";

type SecurityPasswordFormProps = {
  isForcedFlow?: boolean;
};

export function SecurityPasswordForm({ isForcedFlow = false }: SecurityPasswordFormProps) {
  const initialState: SecurityFormState = {};
  const [state, formAction, isPending] = useActionState(changeOwnPasswordAction, initialState);
  const { pushToast } = useToast();
  const lastFeedbackRef = useRef<string | null>(null);

  useEffect(() => {
    if (state.message) {
      const key = `error:${state.message}`;

      if (key === lastFeedbackRef.current) {
        return;
      }

      lastFeedbackRef.current = key;
      pushToast({ title: "Password update failed", description: state.message, tone: "error" });
      return;
    }

    if (state.success) {
      const key = `success:${state.success}`;

      if (key === lastFeedbackRef.current) {
        return;
      }

      lastFeedbackRef.current = key;
      pushToast({ title: "Password updated", description: state.success, tone: "success" });
    }
  }, [pushToast, state.message, state.success]);

  return (
    <form
      action={formAction}
      className="app-card space-y-4 p-6"
      data-testid="force-password-change-form"
    >
      <Field id="currentPassword" label="Current password" error={state.fieldErrors?.currentPassword}>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          data-testid="security-current-password-input"
          className="app-input"
          required
        />
      </Field>

      <Field id="newPassword" label="New password" error={state.fieldErrors?.newPassword}>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          data-testid="security-new-password-input"
          className="app-input"
          required
        />
      </Field>

      <Field id="confirmNewPassword" label="Confirm new password" error={state.fieldErrors?.confirmNewPassword}>
        <input
          id="confirmNewPassword"
          name="confirmNewPassword"
          type="password"
          autoComplete="new-password"
          data-testid="security-confirm-password-input"
          className="app-input"
          required
        />
      </Field>

      {!isForcedFlow ? (
        <label className="block text-sm text-[var(--text-secondary)]">
          <input type="checkbox" name="revokeOtherSessions" className="mr-2 size-4 rounded border-[var(--border)]" />
          Log out my other sessions
        </label>
      ) : null}

      {state.message ? (
        <div className="app-card-muted border-[color:color-mix(in_srgb,var(--danger)_45%,var(--border))] px-3 py-2 text-sm text-[var(--danger)]">{state.message}</div>
      ) : null}

      {state.success ? (
        <div className="space-y-2 rounded-[var(--radius-sm)] border border-[color:color-mix(in_srgb,var(--success)_45%,var(--border))] bg-[color:color-mix(in_srgb,var(--success)_14%,transparent)] px-3 py-2 text-sm text-[var(--success)]" data-testid="security-success-message">
          <p>{state.success}</p>
          {isForcedFlow ? (
            <Link href="/dashboard" className="app-button app-button-secondary" data-testid="force-password-continue-link">
              Continue to dashboard
            </Link>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        data-testid="security-submit-button"
        className="app-button app-button-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Saving..." : "Update password"}
      </button>
    </form>
  );
}
