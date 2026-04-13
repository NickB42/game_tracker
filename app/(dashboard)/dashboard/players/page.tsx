import Link from "next/link";

import { AppButton, DataTable, EmptyState, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { getPlayers } from "@/lib/db/players";

export default async function PlayersPage() {
  const user = await requireAuthenticatedUser();
  const players = await getPlayers({ includeInactive: true });

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
    </section>
  );
}