import Link from "next/link";
import { notFound } from "next/navigation";

import { PlayerForm } from "@/components/players/player-form";
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
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Edit player</h1>
          <p className="mt-1 text-sm text-zinc-600">Update display info for this global player.</p>
        </div>
        <Link className="text-sm font-medium text-zinc-900 underline" href={`/dashboard/players/${player.id}`}>
          Back to player
        </Link>
      </div>

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
