import Link from "next/link";

import { PlayerForm } from "@/components/players/player-form";
import { requireAdminUser } from "@/lib/auth/guards";

export default async function NewPlayerPage() {
  await requireAdminUser();

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Create player</h1>
          <p className="mt-1 text-sm text-zinc-600">Create a global player record for future group and session usage.</p>
        </div>
        <Link className="text-sm font-medium text-zinc-900 underline" href="/dashboard/players">
          Back to players
        </Link>
      </div>

      <PlayerForm mode="create" />
    </section>
  );
}
