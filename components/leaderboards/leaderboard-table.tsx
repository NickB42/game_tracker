import Link from "next/link";
import type { ActivityType } from "@prisma/client";

import { DataTable, EmptyState } from "@/components/ui/primitives";
import type { LeaderboardRow } from "@/lib/db/leaderboards";

type LeaderboardTableProps = {
  rows: LeaderboardRow[];
  activityType: ActivityType;
};

export function LeaderboardTable({ rows, activityType }: LeaderboardTableProps) {
  const isCard = activityType === "CARD";

  if (rows.length === 0) {
    return (
      <EmptyState
        title={isCard ? "No rounds recorded yet" : "No matches recorded yet"}
        description={
          isCard
            ? "Complete a round in any card session to generate rating updates and leaderboard standings."
            : "Complete a sports match in this activity to generate Elo updates and leaderboard standings."
        }
        data-testid="leaderboard-empty-state"
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
            <th>{isCard ? "OpenSkill" : "Elo"}</th>
            {isCard ? (
              <>
                <th>Mu</th>
                <th>Sigma</th>
              </>
            ) : null}
            {isCard ? <th>Round wins</th> : null}
            <th>Match wins</th>
            {isCard ? <th>Rounds played</th> : <th>Matches played</th>}
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
              {isCard ? (
                <>
                  <td>{row.mu.toFixed(2)}</td>
                  <td>{row.sigma.toFixed(2)}</td>
                </>
              ) : null}
              {isCard ? <td>{row.roundWins}</td> : null}
              <td>{row.matchWins}</td>
              <td>{isCard ? row.roundsPlayed : row.matchesPlayed}</td>
              <td>{row.sessionsPlayed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DataTable>
  );
}
