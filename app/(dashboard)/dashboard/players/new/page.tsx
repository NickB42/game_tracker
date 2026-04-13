import Link from "next/link";

import { PlayerForm } from "@/components/players/player-form";
import { PageHeader } from "@/components/ui/primitives";
import { requireAdminUser } from "@/lib/auth/guards";

export default async function NewPlayerPage() {
  await requireAdminUser();

  return (
    <section className="space-y-6">
      <PageHeader
        title="Create player"
        description="Create a global player record for future group and session usage."
        actions={
          <Link className="app-button app-button-secondary" href="/dashboard/players">
            Back to players
          </Link>
        }
      />

      <PlayerForm mode="create" />
    </section>
  );
}
