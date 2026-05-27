import type { ReactNode } from "react";
import { Suspense } from "react";

import { FlashToast } from "@/components/ui/flash-toast";
import { InteractionLockProvider } from "@/components/ui/interaction-lock";
import { ToastProvider } from "@/components/ui/toast";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <InteractionLockProvider>
      <ToastProvider>
        <Suspense fallback={null}>
          <FlashToast />
        </Suspense>
        <div className="min-h-screen">
          <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-10">
            {children}
          </main>
        </div>
      </ToastProvider>
    </InteractionLockProvider>
  );
}
