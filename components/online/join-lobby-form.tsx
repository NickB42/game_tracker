"use client";

import { useActionState } from "react";

import { joinOnlineLobbyAction, type OnlineLobbyFormState } from "@/actions/online";

export function JoinLobbyForm() {
  const initialState: OnlineLobbyFormState = {};
  const [state, formAction, isPending] = useActionState(joinOnlineLobbyAction, initialState);

  return (
    <form action={formAction} className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">Join Lobby</h2>
      <label htmlFor="code" className="block text-sm font-medium text-zinc-700">
        Join code
      </label>
      <input
        id="code"
        name="code"
        type="text"
        maxLength={6}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm uppercase outline-none focus:border-zinc-500"
        placeholder="ABC123"
        required
      />

      {state.fieldErrors?.code ? <p className="text-sm text-red-600">{state.fieldErrors.code}</p> : null}
      {state.message ? <p className="text-sm text-red-600">{state.message}</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
      >
        {isPending ? "Joining..." : "Join lobby"}
      </button>
    </form>
  );
}
