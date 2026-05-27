import { redirect } from "next/navigation";
import type { ActivityType } from "@prisma/client";

import { SessionForm } from "@/components/sessions/session-form";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { AppButton, PageHeader } from "@/components/ui/primitives";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { canCreateSession } from "@/lib/domain/authorization";
import { getGroupsForSessionForm } from "@/lib/db/groups";
import { getAllPlayers } from "@/lib/db/players";
import { getAssignableUsers } from "@/lib/db/users";
import { buildSessionsHref, parseSessionsActivityFilter } from "@/lib/sessions/filter-state";

type NewSessionPageProps = {
  searchParams: Promise<{
    activity?: string;
    groupId?: string;
  }>;
};

function toActivityType(value: string | undefined): ActivityType | undefined {
  const parsed = parseSessionsActivityFilter(value);

  if (parsed === "ALL") {
    return undefined;
  }

  return parsed;
}

export default async function NewSessionPage({ searchParams }: NewSessionPageProps) {
  const user = await requireAuthenticatedUser();

  const { activity, groupId } = await searchParams;
  const selectedActivity = toActivityType(activity);

  if (!canCreateSession(user)) {
    redirect("/dashboard/sessions");
  }

  const [groups, players, users] = await Promise.all([
    getGroupsForSessionForm(user),
    getAllPlayers({ includeInactive: true }),
    getAssignableUsers(user),
  ]);

  const selectedGroupId = groupId && groups.some((group) => group.id === groupId) ? groupId : undefined;

  const backHref = buildSessionsHref({
    activity: selectedActivity ?? "ALL",
    groupId: selectedGroupId,
  });

  return (
    <section className="space-y-5">
      <PageHeader
        title="Create Game Session"
        actions={
          <AppButton href={backHref} variant="ghost" className="app-icon-button">
            <ArrowLeftIcon />
            <span className="sr-only">Back to sessions</span>
          </AppButton>
        }
      />

      <SessionForm
        mode="create"
        selectableGroups={groups.map((group) => ({
          id: group.id,
          name: group.name,
          playerIds: group.memberships.map((membership) => membership.playerId),
        }))}
        selectableUsers={users.map((entry) => ({
          id: entry.id,
          name: entry.name,
          email: entry.email,
        }))}
        selectablePlayers={players.map((player) => ({
          id: player.id,
          displayName: player.displayName,
          isActive: player.isActive,
        }))}
        defaultValues={{
          activityType: selectedActivity,
          groupId: selectedGroupId,
        }}
      />
    </section>
  );
}
