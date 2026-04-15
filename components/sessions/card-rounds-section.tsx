import Link from "next/link";

import { deleteRoundAction } from "@/actions/rounds";
import { EmptyState, SectionCard, StatusBadge } from "@/components/ui/primitives";

type RoundView = {
  id: string;
  sequenceNumber: number;
  notes: string | null;
  placements: Array<{
    id: string;
    sessionParticipant: {
      player: {
        id: string;
        displayName: string;
      };
    };
  }>;
};

type CardRoundsSectionProps = {
  gameSessionId: string;
  groupId: string | null;
  rounds: RoundView[];
  canManageSession: boolean;
};

export function CardRoundsSection({ gameSessionId, groupId, rounds, canManageSession }: CardRoundsSectionProps) {
  return (
    <SectionCard title="Rounds" className="space-y-3" data-testid="session-rounds-section">
      {rounds.length === 0 ? (
        <EmptyState title="No rounds yet" description="No rounds have been recorded for this session yet." />
      ) : (
        <ul className="space-y-2">
          {rounds.map((round) => (
            <li key={round.id} className="app-card-muted space-y-2 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <span className="font-medium text-[var(--text-primary)]">Round #{round.sequenceNumber}</span>
                  <StatusBadge>{round.placements.length} placements</StatusBadge>
                </div>

                {canManageSession ? (
                  <div className="flex items-center gap-2">
                    <Link className="app-button app-button-ghost" href={`/dashboard/sessions/${gameSessionId}/rounds/${round.id}/edit`}>
                      Edit
                    </Link>
                    <form action={deleteRoundAction.bind(null, gameSessionId, round.id, groupId)}>
                      <button type="submit" className="app-button app-button-destructive">
                        Delete
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>

              <ol className="list-decimal space-y-1 pl-5 text-[var(--text-secondary)]">
                {round.placements.map((placement) => (
                  <li key={placement.id}>
                    <Link className="underline" href={`/dashboard/players/${placement.sessionParticipant.player.id}`}>
                      {placement.sessionParticipant.player.displayName}
                    </Link>
                  </li>
                ))}
              </ol>

              {round.notes ? <p className="text-[var(--text-muted)]">{round.notes}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
