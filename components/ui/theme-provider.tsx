"use client";

import { useEffect } from "react";

export type ThemeMode = "dark" | "light" | "system";

const STORAGE_KEY = "dreierspoil-theme";

function resolveMode(mode: ThemeMode): "dark" | "light" {
  if (mode === "system") {
    if (typeof window === "undefined") {
      return "dark";
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  return mode;
}

function applyMode(mode: ThemeMode) {
  const root = document.documentElement;
  root.dataset.theme = mode;

  const resolved = resolveMode(mode);
  root.style.colorScheme = resolved;
}

export function getStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "system";
  }

  const value = window.localStorage.getItem(STORAGE_KEY);

  if (value === "dark" || value === "light" || value === "system") {
    return value;
  }

  return "system";
}

export function setThemeMode(mode: ThemeMode) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, mode);
  applyMode(mode);
}

export function ThemeProvider() {
  useEffect(() => {
    const mode = getStoredThemeMode();
    applyMode(mode);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (getStoredThemeMode() === "system") {
        applyMode("system");
      }
    };

    media.addEventListener("change", handleChange);

    return () => {
      media.removeEventListener("change", handleChange);
    };
  }, []);

  return null;
}
