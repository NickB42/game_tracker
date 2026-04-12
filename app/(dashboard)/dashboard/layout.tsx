import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { requireAuthenticatedUser } from "@/lib/auth/guards";

export default async function DashboardProtectedLayout({ children }: { children: ReactNode }) {
  const user = await requireAuthenticatedUser();

  if (user.mustChangePassword) {
    redirect("/force-password-change");
  }

  return children;
}
