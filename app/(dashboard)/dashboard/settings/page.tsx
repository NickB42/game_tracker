import { SecurityPasswordForm } from "@/components/settings/security/security-password-form";
import { PageHeader, SectionCard, StatusBadge } from "@/components/ui/primitives";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { requireAuthenticatedUser } from "@/lib/auth/guards";

export default async function SettingsPage() {
  const user = await requireAuthenticatedUser();

  return (
    <section className="space-y-6">
      <PageHeader
        title="Settings"
        description={`Signed in as ${user.email}. Manage appearance and account security.`}
      />

      <SectionCard
        title="Appearance"
        description="Choose how the app looks on this device."
        actions={<StatusBadge>Local preference</StatusBadge>}
      >
        <ThemeToggle />
      </SectionCard>

      <section className="space-y-3" aria-labelledby="settings-security-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="settings-security-title" className="app-section-title">
            Security
          </h2>
          <StatusBadge>Account protection</StatusBadge>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">Change your password and optionally revoke other active sessions.</p>
        <SecurityPasswordForm />
      </section>
    </section>
  );
}