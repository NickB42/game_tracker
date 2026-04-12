import { redirect } from "next/navigation";

import { SecurityPasswordForm } from "@/components/settings/security/security-password-form";
import { requireUserWithPendingPasswordChange } from "@/lib/auth/guards";

export default async function ForcePasswordChangePage() {
  const user = await requireUserWithPendingPasswordChange();

  if (!user.mustChangePassword) {
    redirect("/dashboard");
  }

  return (
    <section className="w-full space-y-5 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Change your password</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Your admin requires a password update before you can access the dashboard.
        </p>
      </div>

      <SecurityPasswordForm isForcedFlow />
    </section>
  );
}
