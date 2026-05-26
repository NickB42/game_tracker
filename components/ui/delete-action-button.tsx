"use client";

import type { ReactNode } from "react";
import { useActionState, useEffect, useRef } from "react";

import { AppButton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";

type DeleteActionState = {
  message?: string;
  success?: string;
};

type DeleteActionButtonProps = {
  action: (prevState: DeleteActionState, formData: FormData) => Promise<DeleteActionState>;
  label: string;
  pendingLabel?: string;
  className?: string;
  children: ReactNode;
};

export function DeleteActionButton({
  action,
  label,
  pendingLabel = "Deleting...",
  className,
  children,
}: DeleteActionButtonProps) {
  const { pushToast } = useToast();
  const lastFeedbackRef = useRef<string | null>(null);
  const [state, formAction, isPending] = useActionState(action, {});

  useEffect(() => {
    if (state.message) {
      const key = `error:${state.message}`;

      if (lastFeedbackRef.current === key) {
        return;
      }

      lastFeedbackRef.current = key;
      pushToast({ title: "Delete failed", description: state.message, tone: "error" });
      return;
    }

    if (state.success) {
      const key = `success:${state.success}`;

      if (lastFeedbackRef.current === key) {
        return;
      }

      lastFeedbackRef.current = key;
      pushToast({ title: state.success, tone: "success" });
    }
  }, [pushToast, state.message, state.success]);

  return (
    <form action={formAction} aria-busy={isPending}>
      <AppButton
        type="submit"
        variant="destructive"
        className={className}
        disabled={isPending}
      >
        {isPending ? <span className="app-spinner" aria-hidden="true" /> : children}
        <span className="sr-only">{isPending ? pendingLabel : label}</span>
      </AppButton>
    </form>
  );
}
