import type { ReactNode } from "react";

type FieldProps = {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
  hint?: string;
};

export function Field({ id, label, error, children, hint }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="app-field-label mb-1.5">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p> : null}
      {error ? <p className="mt-1 text-xs text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}

export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="app-card-muted p-4">
      <h2 className="app-section-title text-base">{title}</h2>
      {description ? <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}
