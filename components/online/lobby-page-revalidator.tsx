"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type LobbyPageRevalidatorProps = {
  enabled: boolean;
  intervalMs?: number;
};

export function LobbyPageRevalidator({ enabled, intervalMs = 2000 }: LobbyPageRevalidatorProps) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const timer = setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [enabled, intervalMs, router]);

  return null;
}
