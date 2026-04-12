import Link from "next/link";

import type { LeaderboardRow } from "@/lib/db/leaderboards";

type LeaderboardTableProps = {
  rows: LeaderboardRow[];
};

export function LeaderboardTable({ rows }: LeaderboardTableProps) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600" data-testid="leaderboard-empty-state">
        No rounds recorded yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200" data-testid="leaderboard-table">
      <table className="min-w-full divide-y divide-zinc-200 text-sm">
        <thead className="bg-zinc-50 text-left text-zinc-700">
          <tr>
            <th className="px-4 py-3 font-medium">Rank</th>
            <th className="px-4 py-3 font-medium">Player</th>
            <th className="px-4 py-3 font-medium">Rating</th>
            <th className="px-4 py-3 font-medium">Mu</th>
            <th className="px-4 py-3 font-medium">Sigma</th>
            <th className="px-4 py-3 font-medium">Round wins</th>
            <th className="px-4 py-3 font-medium">Match wins</th>
            <th className="px-4 py-3 font-medium">Rounds played</th>
            <th className="px-4 py-3 font-medium">Sessions played</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 bg-white text-zinc-800">
          {rows.map((row, index) => (
            <tr key={row.playerId}>
              <td className="px-4 py-3">{index + 1}</td>
              <td className="px-4 py-3 font-medium">
                <Link className="underline" href={`/dashboard/players/${row.playerId}`}>
                  {row.playerDisplayName}
                </Link>
              </td>
              <td className="px-4 py-3">{row.displayedRating.toFixed(2)}</td>
              <td className="px-4 py-3">{row.mu.toFixed(2)}</td>
              <td className="px-4 py-3">{row.sigma.toFixed(2)}</td>
              <td className="px-4 py-3">{row.roundWins}</td>
              <td className="px-4 py-3">{row.matchWins}</td>
              <td className="px-4 py-3">{row.roundsPlayed}</td>
              <td className="px-4 py-3">{row.sessionsPlayed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
