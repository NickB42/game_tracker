"use client";

import { createContext, useContext, useEffect, useId, useMemo, useState, type ReactNode } from "react";

type InteractionLock = {
  id: string;
  label: string;
};

type InteractionLockContextValue = {
  setLock: (lock: InteractionLock) => void;
  clearLock: (id: string) => void;
};

const InteractionLockContext = createContext<InteractionLockContextValue | null>(null);

export function InteractionLockProvider({ children }: { children: ReactNode }) {
  const [locks, setLocks] = useState<InteractionLock[]>([]);
  const activeLock = locks.at(-1);

  useEffect(() => {
    if (!activeLock) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [activeLock]);

  const value = useMemo<InteractionLockContextValue>(
    () => ({
      setLock(lock) {
        setLocks((current) => {
          const next = current.filter((entry) => entry.id !== lock.id);
          return [...next, lock];
        });
      },
      clearLock(id) {
        setLocks((current) => current.filter((entry) => entry.id !== id));
      },
    }),
    [],
  );

  return (
    <InteractionLockContext.Provider value={value}>
      {children}
      {activeLock ? (
        <div className="app-interaction-lock" role="status" aria-live="assertive" aria-label={activeLock.label}>
          <div className="app-interaction-lock-panel">
            <span className="app-spinner app-interaction-lock-spinner" aria-hidden="true" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">{activeLock.label}</span>
          </div>
        </div>
      ) : null}
    </InteractionLockContext.Provider>
  );
}

export function PendingInteractionLock({ active, label = "Saving..." }: { active: boolean; label?: string }) {
  const lock = useContext(InteractionLockContext);
  const id = useId();

  useEffect(() => {
    if (!lock) {
      return;
    }

    if (active) {
      lock.setLock({ id, label });
      return () => {
        lock.clearLock(id);
      };
    }

    lock.clearLock(id);
  }, [active, id, label, lock]);

  return null;
}
