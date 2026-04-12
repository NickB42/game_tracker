import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-100">
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6">
        {children}
      </main>
    </div>
  );
}
