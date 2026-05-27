import Link from "next/link";
import type { ActivityType } from "@prisma/client";

import { DataTable, EmptyState } from "@/components/ui/primitives";
import type { LeaderboardRow } from "@/lib/db/leaderboards";

type LeaderboardTableProps = {
  rows: LeaderboardRow[];
  activityType: ActivityType;
  scopeLabel?: string;
};

export function LeaderboardTable({ rows, activityType, scopeLabel }: LeaderboardTableProps) {
  const isCard = activityType === "CARD";
  const scopePrefix = scopeLabel ? `${scopeLabel}: ` : "";
  const ratingLabel = isCard ? "Rating" : "Elo";
  const playedLabel = isCard ? "Rounds" : "Matches";

  const emptyState = (
    <EmptyState
      title={isCard ? "No rounds recorded yet" : "No matches recorded yet"}
      description={
        isCard
          ? `${scopePrefix}complete a round in a card session to generate rating updates and leaderboard standings.`
          : `${scopePrefix}complete a sports match in this activity to generate Elo updates and leaderboard standings.`
      }
      data-testid="leaderboard-empty-state"
    />
  );

  if (rows.length === 0) {
    return emptyState;
  }

  return (
    <>
      <div className="md:hidden" data-testid="leaderboard-mobile">
        <DataTable>
          <table className="app-table w-full table-fixed text-xs" data-testid="leaderboard-mobile-table">
            <thead>
              <tr>
                <th className="w-[38%] px-2 py-2">Name</th>
                <th className="w-[20%] px-2 py-2 text-right">{ratingLabel}</th>
                <th className="w-[20%] px-2 py-2 text-right">W/L</th>
                <th className="w-[22%] px-2 py-2 text-right">{playedLabel}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const wins = isCard ? row.roundWins : row.matchWins;
                const played = isCard ? row.roundsPlayed : row.matchesPlayed;
                const losses = Math.max(played - wins, 0);

                return (
                  <tr key={row.playerId}>
                    <td className="px-2 py-2">
                      <Link className="block truncate font-medium text-[var(--text-primary)] underline" href={`/dashboard/players/${row.playerId}`}>
                        {row.playerDisplayName}
                      </Link>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{row.displayedRating.toFixed(0)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {wins}/{losses}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{played}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </DataTable>
      </div>

      <div className="hidden md:block" data-testid="leaderboard-desktop">
        <DataTable>
          <table className="app-table w-full" data-testid="leaderboard-table">
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
      </div>
    </>
  );
}
