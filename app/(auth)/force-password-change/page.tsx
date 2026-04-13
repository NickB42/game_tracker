import { redirect } from "next/navigation";

import { SecurityPasswordForm } from "@/components/settings/security/security-password-form";
import { requireUserWithPendingPasswordChange } from "@/lib/auth/guards";

export default async function ForcePasswordChangePage() {
  const user = await requireUserWithPendingPasswordChange();

  if (!user.mustChangePassword) {
    redirect("/dashboard");
  }

  return (
    <section className="w-full space-y-5">
      <div className="app-card p-6">
        <h1 className="app-page-title text-2xl">Change your password</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Your admin requires a password update before you can access the dashboard.
        </p>
      </div>

      <SecurityPasswordForm isForcedFlow />
    </section>
  );
}
