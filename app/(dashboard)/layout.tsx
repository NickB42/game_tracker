import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">{children}</div>
    </div>
  );
}
