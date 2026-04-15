import Link from "next/link";

import { createOnlineLobbyAction } from "@/actions/online";
import { JoinLobbyForm } from "@/components/online/join-lobby-form";
import { EmptyState, PageHeader, SectionCard, StatusBadge } from "@/components/ui/primitives";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { listOpenOnlineLobbies } from "@/lib/db/online";

type OpenLobbyView = Awaited<ReturnType<typeof listOpenOnlineLobbies>>[number];

export default async function OnlinePlayPage() {
  const user = await requireAuthenticatedUser();
  const lobbies = await listOpenOnlineLobbies();

  return (
    <section className="space-y-6" data-testid="online-play-page">
      <PageHeader
        title="Online Play"
        description="Card-only online mode: create and join private Shithead lobbies with reconnect support and live state sync."
        actions={<StatusBadge tone="accent">{lobbies.length} Open</StatusBadge>}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Create Lobby" description="Start a fresh private lobby and share the invite code with players.">
          <form action={createOnlineLobbyAction} className="space-y-4">
            {user.role === "ADMIN" ? (
              <label className="app-card-muted flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)]">
                <input type="checkbox" name="debugShortDeck" value="1" className="size-4 rounded border-[var(--border)]" />
                Use short deck (faster debug rounds)
              </label>
            ) : null}
            <button type="submit" className="app-button app-button-primary">
              Create lobby
            </button>
          </form>
        </SectionCard>

        <JoinLobbyForm />
      </div>

      <SectionCard title="Open Lobbies" description="Available rooms you can join or reconnect to.">
        {lobbies.length === 0 ? (
          <EmptyState
            title="No open lobbies"
            description="Create a lobby to start online play, then share the join code."
          />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {lobbies.map((lobby) => {
              const containsCurrentUser = lobby.players.some((player) => player.userId === user.id);

              return (
                <li key={lobby.id} className="app-card-muted space-y-3 p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold tracking-[0.08em] text-[var(--text-primary)]">{lobby.code}</p>
                    <StatusBadge tone="accent">{lobby.status}</StatusBadge>
                  </div>

                  <p className="text-[var(--text-muted)]">Players: {lobby.playerCount}/5</p>
                  <p className="text-[var(--text-muted)]">Seats: {lobby.players.map((player) => player.name).join(", ") || "-"}</p>

                  {containsCurrentUser ? (
                    <Link href={`/dashboard/online-play/${lobby.id}`} className="app-button app-button-secondary">
                      Reconnect
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </section>
  );
}
