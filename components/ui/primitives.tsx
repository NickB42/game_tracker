import type { ComponentPropsWithoutRef, ReactNode } from "react";
import Link from "next/link";

type ClassValue = string | false | null | undefined;

function cx(...parts: ClassValue[]) {
  return parts.filter(Boolean).join(" ");
}

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: string;
};

export function PageHeader({ title, description, actions, eyebrow }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-2">
        {eyebrow ? <p className="app-caption uppercase tracking-[0.12em]">{eyebrow}</p> : null}
        <h1 className="app-page-title">{title}</h1>
        {description ? <p className="max-w-3xl text-sm text-[var(--text-muted)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

type AppCardProps = {
  children: ReactNode;
  className?: string;
} & ComponentPropsWithoutRef<"section">;

export function AppCard({ children, className, ...props }: AppCardProps) {
  return (
    <section className={cx("app-card p-6", className)} {...props}>
      {children}
    </section>
  );
}

type SectionCardProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
} & ComponentPropsWithoutRef<"section">;

export function SectionCard({ title, description, actions, children, className, ...props }: SectionCardProps) {
  return (
    <section className={cx("app-card p-6", className)} {...props}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="app-section-title">{title}</h2>
          {description ? <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "accent" | "success" | "warning";
};

export function StatCard({ label, value, hint, tone = "default" }: StatCardProps) {
  const toneClass =
    tone === "accent"
      ? "border-[color:color-mix(in_srgb,var(--accent)_38%,var(--border))]"
      : tone === "success"
        ? "border-[color:color-mix(in_srgb,var(--success)_38%,var(--border))]"
        : tone === "warning"
          ? "border-[color:color-mix(in_srgb,var(--warning)_38%,var(--border))]"
          : "";

  return (
    <article className={cx("app-card-muted p-4", toneClass)}>
      <p className="app-caption uppercase tracking-[0.1em]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p> : null}
    </article>
  );
}

type StatusBadgeProps = {
  children: ReactNode;
  tone?: "accent" | "success" | "warning" | "danger" | "neutral";
};

export function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  const toneClass =
    tone === "accent"
      ? "app-badge-accent"
      : tone === "success"
        ? "app-badge-success"
        : tone === "warning"
          ? "app-badge-warning"
          : tone === "danger"
            ? "app-badge-danger"
            : "";

  return <span className={cx("app-badge", toneClass)}>{children}</span>;
}

type AppButtonProps = {
  children: ReactNode;
  href?: string;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  className?: string;
  disabled?: boolean;
  "data-testid"?: string;
};

export function AppButton({
  children,
  href,
  type = "button",
  variant = "primary",
  className,
  disabled,
  "data-testid": dataTestId,
}: AppButtonProps) {
  const variantClass =
    variant === "primary"
      ? "app-button-primary"
      : variant === "secondary"
        ? "app-button-secondary"
        : variant === "destructive"
          ? "app-button-destructive"
          : "app-button-ghost";

  const classes = cx("app-button", variantClass, disabled ? "cursor-not-allowed opacity-60" : "", className);

  if (href) {
    return (
      <Link href={href} className={classes} data-testid={dataTestId}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} disabled={disabled} data-testid={dataTestId}>
      {children}
    </button>
  );
}

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="app-empty">
      <p className="text-sm font-semibold text-[var(--text-secondary)]">{title}</p>
      <p className="mt-1 text-sm">{description}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

type InfoRowProps = {
  label: string;
  value: ReactNode;
};

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="text-right text-[var(--text-secondary)]">{value}</dd>
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cx("app-divider", className)} />;
}

export function DataTable({ children }: { children: ReactNode }) {
  return <div className="app-table-wrap">{children}</div>;
}
