import Link from "next/link";

import { PlayerCard } from "@/components/players/player-card";
import { PlusIcon } from "@/components/ui/icons";
import { AppButton, EmptyState, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { ResponsiveList } from "@/components/ui/responsive-list";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { getPlayers } from "@/lib/db/players";

export default async function PlayersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requireAuthenticatedUser();
  const { page: pageParam } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const { players, hasNextPage } = await getPlayers({ includeInactive: true, page: currentPage });

  return (
    <section className="space-y-6">
      <PageHeader
        title="Players"
        actions={
          user.role === "ADMIN" ? (
            <AppButton href="/dashboard/players/new" className="app-icon-button" data-testid="players-new-link">
              <PlusIcon />
              <span className="sr-only">New player</span>
            </AppButton>
          ) : (
            <StatusBadge>Read only</StatusBadge>
          )
        }
      />

      {players.length === 0 ? (
        <EmptyState
          title="No players yet"
          description="Create a player to use in groups, sessions, and online play exports."
        />
      ) : (
        <ResponsiveList
          data={players}
          testId="players-list"
          desktopHeaders={
            <tr>
              <th>Display name</th>
              <th>Status</th>
              <th>Groups</th>
              <th>Actions</th>
            </tr>
          }
          mobile={(player) => (
            <PlayerCard player={player} />
          )}
          desktop={(player) => (
            <tr key={player.id}>
              <td className="font-medium text-[var(--text-primary)]">{player.displayName}</td>
              <td>
                <StatusBadge tone={player.isActive ? "success" : "warning"}>{player.isActive ? "Active" : "Inactive"}</StatusBadge>
              </td>
              <td>{player._count.groupMemberships}</td>
              <td>
                <div className="flex flex-wrap gap-2">
                  <Link className="app-button app-button-ghost" href={`/dashboard/players/${player.id}`}>
                    View
                  </Link>
                  {user.role === "ADMIN" ? (
                    <Link className="app-button app-button-secondary" href={`/dashboard/players/${player.id}/edit`}>
                      Edit
                    </Link>
                  ) : null}
                </div>
              </td>
            </tr>
          )}
        />
      )}

      {(currentPage > 1 || hasNextPage) && (
        <div className="flex items-center justify-between pt-2">
          {currentPage > 1 ? (
            <Link className="app-button app-button-secondary" href={`/dashboard/players?page=${currentPage - 1}`}>
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-[var(--text-muted)]">Page {currentPage}</span>
          {hasNextPage ? (
            <Link className="app-button app-button-secondary" href={`/dashboard/players?page=${currentPage + 1}`}>
              Next
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </section>
  );
}
