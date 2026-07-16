import Link from "next/link";

import { deleteSportsMatchAction } from "@/actions/matches";
import { DeleteActionButton } from "@/components/ui/delete-action-button";
import { PencilIcon, PlusIcon, TrashIcon, TrophyIcon } from "@/components/ui/icons";
import { AppButton, EmptyState, SectionCard } from "@/components/ui/primitives";

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
  eloChanges?: Array<{
    playerId: string;
    delta: number;
  }>;
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

function getScoreColumns(match: SportsMatchView) {
  if (!match.result || match.result.scoreLines.length === 0) {
    return [];
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

  return [...setsBySequence.entries()].sort((a, b) => a[0] - b[0]);
}

function getSideEloDelta(match: SportsMatchView, sideNumber: number) {
  const sidePlayerIds = new Set(getSidePlayers(match, sideNumber).map((participant) => participant.player.id));
  return match.eloChanges?.find((change) => sidePlayerIds.has(change.playerId))?.delta ?? null;
}

function formatEloDelta(delta: number) {
  const roundedDelta = Math.round(delta);
  return `${roundedDelta > 0 ? "+" : ""}${roundedDelta}`;
}

function renderSidePlayers(match: SportsMatchView, sideNumber: number, winningSideNumber: number | null) {
  const players = getSidePlayers(match, sideNumber);

  if (players.length === 0) {
    return <span>-</span>;
  }

  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {winningSideNumber === sideNumber ? (
        <>
          <TrophyIcon className="size-4 text-[var(--success)]" />
          <span className="sr-only">Winning side</span>
        </>
      ) : null}
      <span>{players.map((entry) => entry.player.displayName).join(" / ")}</span>
    </span>
  );
}

export function SportsMatchesSection({ gameSessionId, activityType, canManageSession, matches }: SportsMatchesSectionProps) {
  return (
    <SectionCard
      title={activityType === "SQUASH" ? "Squash matches" : "Padel matches"}
      actions={
        canManageSession ? (
          <AppButton href={`/dashboard/sessions/${gameSessionId}/matches/new`} className="app-icon-button">
            <PlusIcon />
            <span className="sr-only">Add match</span>
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
            const winningSideNumber = match.result?.winningSideNumber ?? null;
            const scoreColumns = getScoreColumns(match);
            const hasEloChanges = (match.eloChanges?.length ?? 0) > 0;

            return (
              <li key={match.id} className="app-card-muted space-y-3 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-[var(--text-primary)]">Match #{match.sequenceNumber}</p>
                    {!winningSideNumber ? <span className="text-xs text-[var(--text-muted)]">Winner pending</span> : null}
                  </div>

                  {canManageSession ? (
                    <div className="flex items-center gap-2">
                      <Link className="app-button app-button-ghost app-icon-button" href={`/dashboard/sessions/${gameSessionId}/matches/${match.id}/edit`}>
                        <PencilIcon />
                        <span className="sr-only">Edit match</span>
                      </Link>
                      <DeleteActionButton
                        action={deleteSportsMatchAction.bind(null, gameSessionId, match.id)}
                        label="Delete match"
                        className="app-icon-button"
                      >
                        <TrashIcon />
                      </DeleteActionButton>
                    </div>
                  ) : null}
                </div>

                <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--border)]">
                  <div
                    className="grid items-center bg-[var(--surface-muted)] text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]"
                    style={{ gridTemplateColumns: `minmax(0, 1fr) repeat(${Math.max(scoreColumns.length, 1)}, minmax(2rem, max-content))${hasEloChanges ? " minmax(3.5rem, max-content)" : ""}` }}
                  >
                    <div className="px-3 py-2">Side</div>
                    {scoreColumns.length > 0 ? (
                      scoreColumns.map(([sequenceNumber]) => (
                        <div key={sequenceNumber} className="px-2 py-2 text-center">
                          {activityType === "SQUASH" ? "Pts" : `Set ${sequenceNumber}`}
                        </div>
                      ))
                    ) : (
                      <div className="px-2 py-2 text-center">Score</div>
                    )}
                    {hasEloChanges ? <div className="px-2 py-2 text-center">Elo</div> : null}
                  </div>

                  {[1, 2].map((sideNumber) => {
                    const eloDelta = getSideEloDelta(match, sideNumber);

                    return (
                      <div
                        key={sideNumber}
                        data-winning-side={winningSideNumber === sideNumber ? "true" : undefined}
                        className={
                          winningSideNumber === sideNumber
                            ? "grid items-center border-t border-[var(--border)] bg-[color:color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--text-secondary)]"
                            : "grid items-center border-t border-[var(--border)] text-[var(--text-secondary)]"
                        }
                        style={{ gridTemplateColumns: `minmax(0, 1fr) repeat(${Math.max(scoreColumns.length, 1)}, minmax(2rem, max-content))${hasEloChanges ? " minmax(3.5rem, max-content)" : ""}` }}
                      >
                        <div className="px-3 py-3">{renderSidePlayers(match, sideNumber, winningSideNumber)}</div>
                        {scoreColumns.length > 0 ? (
                          scoreColumns.map(([sequenceNumber, score]) => (
                            <div key={sequenceNumber} className="px-2 py-3 text-center font-semibold text-[var(--text-primary)]">
                              {sideNumber === 1 ? (score.sideOne ?? "-") : (score.sideTwo ?? "-")}
                            </div>
                          ))
                        ) : (
                          <div className="px-2 py-3 text-center text-[var(--text-muted)]">-</div>
                        )}
                        {hasEloChanges ? (
                          <div
                            className={
                              eloDelta !== null && eloDelta > 0
                                ? "px-2 py-3 text-center font-semibold tabular-nums text-[var(--success)]"
                                : "px-2 py-3 text-center font-semibold tabular-nums text-[var(--danger)]"
                            }
                          >
                            {eloDelta === null ? "-" : formatEloDelta(eloDelta)}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                {match.notes ? <p className="text-[var(--text-muted)]">{match.notes}</p> : null}
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
