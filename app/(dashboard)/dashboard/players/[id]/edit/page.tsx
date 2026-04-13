import Link from "next/link";
import { notFound } from "next/navigation";

import { PlayerForm } from "@/components/players/player-form";
import { PageHeader } from "@/components/ui/primitives";
import { requireAdminUser } from "@/lib/auth/guards";
import { getPlayerById } from "@/lib/db/players";

type EditPlayerPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditPlayerPage({ params }: EditPlayerPageProps) {
  await requireAdminUser();
  const { id } = await params;
  const player = await getPlayerById(id);

  if (!player) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Edit player"
        description="Update display info for this global player."
        actions={
          <Link className="app-button app-button-secondary" href={`/dashboard/players/${player.id}`}>
            Back to player
          </Link>
        }
      />

      <PlayerForm
        mode="edit"
        playerId={player.id}
        defaultValues={{
          displayName: player.displayName,
          notes: player.notes,
          isActive: player.isActive,
        }}
      />
    </section>
  );
}
