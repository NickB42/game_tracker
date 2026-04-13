import Link from "next/link";

import { createOnlineLobbyAction } from "@/actions/online";
import { JoinLobbyForm } from "@/components/online/join-lobby-form";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { listOpenOnlineLobbies } from "@/lib/db/online";

export default async function OnlinePlayPage() {
  const user = await requireAuthenticatedUser();
  const lobbies = await listOpenOnlineLobbies();

  return (
    <section className="space-y-6" data-testid="online-play-page">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Online Play</h1>
        <p className="mt-2 text-sm text-zinc-600">Create or join invite-only online Shithead lobbies.</p>

        <form action={createOnlineLobbyAction} className="mt-4">
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Create lobby
          </button>
        </form>
      </div>

      <JoinLobbyForm />

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Open Lobbies</h2>

        {lobbies.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">No open lobbies right now.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {lobbies.map((lobby) => {
              const containsCurrentUser = lobby.players.some((player) => player.userId === user.id);

              return (
                <li key={lobby.id} className="rounded-lg border border-zinc-200 p-3 text-sm">
                  <p className="font-medium text-zinc-900">Code: {lobby.code}</p>
                  <p className="text-zinc-600">Status: {lobby.status}</p>
                  <p className="text-zinc-600">Players: {lobby.playerCount}/5</p>
                  <p className="text-zinc-600">Seats: {lobby.players.map((player) => player.name).join(", ") || "-"}</p>
                  {containsCurrentUser ? (
                    <Link href={`/dashboard/online-play/${lobby.id}`} className="mt-2 inline-block text-sm font-medium text-zinc-900 underline">
                      Reconnect
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
