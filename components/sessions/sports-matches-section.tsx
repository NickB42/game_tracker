import Link from "next/link";

import { deleteSportsMatchAction } from "@/actions/matches";
import { AppButton, EmptyState, SectionCard, StatusBadge } from "@/components/ui/primitives";

type SportsMatchView = {
  id: string;
  sequenceNumber: number;
  notes: string | null;
  participants: Array<{
    id: string;
    sideNumber: number | null;
    player: {
      id: string;
      displayName: string;
      isActive: boolean;
    };
  }>;
  result: {
    winningSideNumber: number | null;
    scoreLines: Array<{
      id: string;
      sequenceNumber: number;
      sideNumber: number;
      score: number;
    }>;
  } | null;
};

type SportsMatchesSectionProps = {
  gameSessionId: string;
  activityType: "SQUASH" | "PADEL";
  canManageSession: boolean;
  matches: SportsMatchView[];
};

function getSidePlayers(match: SportsMatchView, sideNumber: number) {
  return match.participants.filter((participant) => participant.sideNumber === sideNumber);
}

function renderScoreSummary(match: SportsMatchView) {
  if (!match.result || match.result.scoreLines.length === 0) {
    return "No score recorded";
  }

  const setsBySequence = new Map<number, { sideOne?: number; sideTwo?: number }>();

  for (const line of match.result.scoreLines) {
    const set = setsBySequence.get(line.sequenceNumber) ?? {};

    if (line.sideNumber === 1) {
      set.sideOne = line.score;
    }

    if (line.sideNumber === 2) {
      set.sideTwo = line.score;
    }

    setsBySequence.set(line.sequenceNumber, set);
  }

  return [...setsBySequence.entries()]
    .sort((a, b) => a[0] - b[0])
    .map((entry) => {
      const sideOne = entry[1].sideOne ?? "-";
      const sideTwo = entry[1].sideTwo ?? "-";
      return `${sideOne}-${sideTwo}`;
    })
    .join(", ");
}

export function SportsMatchesSection({ gameSessionId, activityType, canManageSession, matches }: SportsMatchesSectionProps) {
  return (
    <SectionCard
      title={activityType === "SQUASH" ? "Squash matches" : "Padel matches"}
      description="Manual sports results are tracked per match."
      actions={
        canManageSession ? (
          <AppButton href={`/dashboard/sessions/${gameSessionId}/matches/new`}>
            Add match
          </AppButton>
        ) : null
      }
    >
      {matches.length === 0 ? (
        <EmptyState
          title="No matches yet"
          description={
            activityType === "SQUASH"
              ? "Add the first squash result for this session."
              : "Add the first padel result for this session."
          }
        />
      ) : (
        <ul className="space-y-2">
          {matches.map((match) => {
            const sideOnePlayers = getSidePlayers(match, 1);
            const sideTwoPlayers = getSidePlayers(match, 2);

            return (
              <li key={match.id} className="app-card-muted space-y-3 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-[var(--text-primary)]">Match #{match.sequenceNumber}</p>
                    {match.result?.winningSideNumber ? (
                      <StatusBadge tone="success">Winner: Side {match.result.winningSideNumber}</StatusBadge>
                    ) : (
                      <StatusBadge>Winner pending</StatusBadge>
                    )}
                  </div>

                  {canManageSession ? (
                    <div className="flex items-center gap-2">
                      <Link className="app-button app-button-ghost" href={`/dashboard/sessions/${gameSessionId}/matches/${match.id}/edit`}>
                        Edit
                      </Link>
                      <form action={deleteSportsMatchAction.bind(null, gameSessionId, match.id)}>
                        <button type="submit" className="app-button app-button-destructive">
                          Delete
                        </button>
                      </form>
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Side 1</p>
                    <p className="text-[var(--text-secondary)]">{sideOnePlayers.map((entry) => entry.player.displayName).join(" / ") || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Side 2</p>
                    <p className="text-[var(--text-secondary)]">{sideTwoPlayers.map((entry) => entry.player.displayName).join(" / ") || "-"}</p>
                  </div>
                </div>

                <p className="text-[var(--text-secondary)]">Score: {renderScoreSummary(match)}</p>
                {match.notes ? <p className="text-[var(--text-muted)]">{match.notes}</p> : null}
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
