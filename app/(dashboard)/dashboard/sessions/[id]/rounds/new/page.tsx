import Link from "next/link";
import { notFound } from "next/navigation";

import { RoundForm } from "@/components/rounds/round-form";
import { requireAdminUser } from "@/lib/auth/guards";
import { getGameSessionById } from "@/lib/db/sessions";

type NewSessionRoundPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function NewSessionRoundPage({ params }: NewSessionRoundPageProps) {
  await requireAdminUser();
  const { id } = await params;

  const gameSession = await getGameSessionById(id);

  if (!gameSession) {
    notFound();
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Add round</h1>
          <p className="mt-1 text-sm text-zinc-600">Record one short game by entering the exact finishing order for all participants.</p>
        </div>
        <Link className="text-sm font-medium text-zinc-900 underline" href={`/dashboard/sessions/${gameSession.id}`}>
          Back to session
        </Link>
      </div>

      {gameSession.participants.length < 2 ? (
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          This session needs at least 2 participants before rounds can be recorded.
        </p>
      ) : (
        <RoundForm
          mode="create"
          gameSessionId={gameSession.id}
          groupId={gameSession.groupId}
          participantOptions={gameSession.participants.map((participant) => ({
            sessionParticipantId: participant.id,
            playerDisplayName: participant.player.displayName,
            isActive: participant.player.isActive,
          }))}
        />
      )}
    </section>
  );
}
