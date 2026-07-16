import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/ui/app-shell";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { measureAsync } from "@/lib/server/timing";

export default async function DashboardProtectedLayout({ children }: { children: ReactNode }) {
  const user = await measureAsync("dashboard.layout.auth", () => requireAuthenticatedUser());

  if (user.mustChangePassword) {
    redirect("/force-password-change");
  }

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
      }}
    >
      {children}
    </AppShell>
  );
}
