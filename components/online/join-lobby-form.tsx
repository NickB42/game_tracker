"use client";

import { useActionState, useEffect, useRef } from "react";

import { joinOnlineLobbyAction, type OnlineLobbyFormState } from "@/actions/online";
import { useToast } from "@/components/ui/toast";

export function JoinLobbyForm() {
  const initialState: OnlineLobbyFormState = {};
  const [state, formAction, isPending] = useActionState(joinOnlineLobbyAction, initialState);
  const { pushToast } = useToast();
  const lastErrorMessageRef = useRef<string | null>(null);

  useEffect(() => {
    const message = state.message ?? state.fieldErrors?.code;

    if (!message || message === lastErrorMessageRef.current) {
      return;
    }

    lastErrorMessageRef.current = message;
    pushToast({ title: "Could not join lobby", description: message, tone: "error" });
  }, [pushToast, state.fieldErrors?.code, state.message]);

  return (
    <form action={formAction} className="app-card space-y-3 p-6">
      <h2 className="app-section-title">Join Lobby</h2>
      <label htmlFor="code" className="app-field-label block">
        Join code
      </label>
      <input
        id="code"
        name="code"
        type="text"
        maxLength={6}
        className="app-input uppercase tracking-[0.06em]"
        placeholder="ABC123"
        required
      />

      {state.fieldErrors?.code ? <p className="text-xs text-[var(--danger)]">{state.fieldErrors.code}</p> : null}
      {state.message ? <p className="text-xs text-[var(--danger)]">{state.message}</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className="app-button app-button-secondary disabled:opacity-60"
      >
        {isPending ? "Joining..." : "Join lobby"}
      </button>
    </form>
  );
}
