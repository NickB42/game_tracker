import { SecurityPasswordForm } from "@/components/settings/security/security-password-form";
import { requireAuthenticatedUser } from "@/lib/auth/guards";

export default async function SecuritySettingsPage() {
  const user = await requireAuthenticatedUser();

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Security</h1>
        <p className="mt-1 text-sm text-zinc-600">Signed in as {user.email}. Change your password below.</p>
      </div>

      <SecurityPasswordForm />
    </section>
  );
}
