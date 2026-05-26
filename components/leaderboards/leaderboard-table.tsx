import Link from "next/link";
import type { ActivityType } from "@prisma/client";

import { EmptyState } from "@/components/ui/primitives";
import { ResponsiveList } from "@/components/ui/responsive-list";
import { LeaderboardCard } from "./leaderboard-card";
import type { LeaderboardRow } from "@/lib/db/leaderboards";

type LeaderboardTableProps = {
  rows: LeaderboardRow[];
  activityType: ActivityType;
  scopeLabel?: string;
};

export function LeaderboardTable({ rows, activityType, scopeLabel }: LeaderboardTableProps) {
  const isCard = activityType === "CARD";
  const scopePrefix = scopeLabel ? `${scopeLabel}: ` : "";

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

  const desktopHeaders = (
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
  );

  return (
    <ResponsiveList
      data={rows}
      emptyState={emptyState}
      testId="leaderboard"
      desktopHeaders={desktopHeaders}
      mobile={(row, index) => (
        <LeaderboardCard
          row={row}
          rank={index + 1}
          activityType={activityType}
        />
      )}
      desktop={(row, index) => (
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
      )}
    />
  );
}
