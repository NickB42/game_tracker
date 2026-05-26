"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useToast } from "@/components/ui/toast";

type FlashToastConfig = {
  title: string;
  description?: string;
  tone?: "success" | "error" | "info";
};

const FLASH_TOASTS: Record<string, FlashToastConfig> = {
  "group-created": { title: "Group created", tone: "success" },
  "group-updated": { title: "Group updated", tone: "success" },
  "player-created": { title: "Player created", tone: "success" },
  "player-updated": { title: "Player updated", tone: "success" },
  "session-created": { title: "Session created", tone: "success" },
  "session-updated": { title: "Session updated", tone: "success" },
  "round-added": { title: "Round added", tone: "success" },
  "round-updated": { title: "Round updated", tone: "success" },
  "match-saved": { title: "Match saved", tone: "success" },
  "match-updated": { title: "Match updated", tone: "success" },
  "user-created": { title: "User created", tone: "success" },
  "password-updated": { title: "Password updated", tone: "success" },
};

export function FlashToast() {
  const { pushToast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastToastRef = useRef<string | null>(null);

  const toastKey = searchParams.get("toast");
  const toastConfig = useMemo(() => (toastKey ? FLASH_TOASTS[toastKey] : undefined), [toastKey]);

  useEffect(() => {
    if (!toastKey || !toastConfig) {
      return;
    }

    if (lastToastRef.current === toastKey) {
      return;
    }

    lastToastRef.current = toastKey;
    pushToast(toastConfig);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("toast");
    const query = params.toString();
    const nextUrl = query ? `${pathname}?${query}` : pathname;

    router.replace(nextUrl, { scroll: false });
  }, [pathname, pushToast, router, searchParams, toastConfig, toastKey]);

  return null;
}
