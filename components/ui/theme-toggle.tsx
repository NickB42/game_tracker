"use client";

import { useEffect, useState } from "react";

import { getStoredThemeMode, setThemeMode, type ThemeMode } from "@/components/ui/theme-provider";

const OPTIONS: Array<{ value: ThemeMode; label: string }> = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
];

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    setMode(getStoredThemeMode());
  }, []);

  return (
    <label className="app-field-label">
      Theme
      <select
        className="app-select mt-1 min-w-28"
        value={mode}
        onChange={(event) => {
          const nextMode = event.target.value as ThemeMode;
          setMode(nextMode);
          setThemeMode(nextMode);
        }}
        aria-label="Theme mode"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
