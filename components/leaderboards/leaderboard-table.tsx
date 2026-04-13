import Link from "next/link";

import { DataTable, EmptyState } from "@/components/ui/primitives";
import type { LeaderboardRow } from "@/lib/db/leaderboards";

type LeaderboardTableProps = {
  rows: LeaderboardRow[];
};

export function LeaderboardTable({ rows }: LeaderboardTableProps) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No rounds recorded yet"
        description="Complete a round in any session to generate rating updates and leaderboard standings."
      />
    );
  }

  return (
    <DataTable>
      <table className="app-table min-w-full" data-testid="leaderboard-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Rating</th>
            <th>Mu</th>
            <th>Sigma</th>
            <th>Round wins</th>
            <th>Match wins</th>
            <th>Rounds played</th>
            <th>Sessions played</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.playerId}>
              <td>{index + 1}</td>
              <td className="font-medium text-[var(--text-primary)]">
                <Link className="app-button app-button-ghost" href={`/dashboard/players/${row.playerId}`}>
                  {row.playerDisplayName}
                </Link>
              </td>
              <td>{row.displayedRating.toFixed(2)}</td>
              <td>{row.mu.toFixed(2)}</td>
              <td>{row.sigma.toFixed(2)}</td>
              <td>{row.roundWins}</td>
              <td>{row.matchWins}</td>
              <td>{row.roundsPlayed}</td>
              <td>{row.sessionsPlayed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DataTable>
  );
}
