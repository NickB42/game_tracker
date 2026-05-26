"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { AppButton } from "@/components/ui/primitives";

type FormSubmitButtonProps = {
  label: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  className?: string;
  disabled?: boolean;
  "data-testid"?: string;
  children?: ReactNode;
};

export function FormSubmitButton({
  label,
  pendingLabel = "Saving...",
  variant = "primary",
  className,
  disabled,
  "data-testid": dataTestId,
  children,
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();
  const content = children ?? (pending ? pendingLabel : label);

  return (
    <AppButton
      type="submit"
      variant={variant}
      disabled={disabled || pending}
      className={className}
      data-testid={dataTestId}
    >
      <span className="inline-flex items-center gap-2">
        {pending ? <span className="app-spinner" aria-hidden="true" /> : null}
        <span>{content}</span>
      </span>
    </AppButton>
  );
}
