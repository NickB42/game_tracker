import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-10">
        {children}
      </main>
    </div>
  );
}
