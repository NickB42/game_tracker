import { SecurityPasswordForm } from "@/components/settings/security/security-password-form";
import { PageHeader, StatusBadge } from "@/components/ui/primitives";
import { requireAuthenticatedUser } from "@/lib/auth/guards";

export default async function SecuritySettingsPage() {
  const user = await requireAuthenticatedUser();

  return (
    <section className="space-y-6">
      <PageHeader
        title="Security"
        description={`Signed in as ${user.email}. Manage password and session safety.`}
        actions={<StatusBadge tone="accent">Account</StatusBadge>}
      />

      <SecurityPasswordForm />
    </section>
  );
}
