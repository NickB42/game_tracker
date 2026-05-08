import Link from "next/link";

import { AppButton, DataTable, EmptyState, PageHeader, StatusBadge } from "@/components/ui/primitives";
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
        description="Global player records used across all groups and future game sessions."
        actions={
          user.role === "ADMIN" ? (
            <AppButton href="/dashboard/players/new" data-testid="players-new-link">
              New player
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
          action={user.role === "ADMIN" ? <AppButton href="/dashboard/players/new">Create player</AppButton> : null}
        />
      ) : (
        <DataTable>
          <table className="app-table min-w-full">
            <thead>
              <tr>
                <th>Display name</th>
                <th>Status</th>
                <th>Groups</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
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
              ))}
            </tbody>
          </table>
        </DataTable>
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