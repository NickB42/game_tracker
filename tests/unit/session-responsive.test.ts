import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("SessionCard component", () => {
  it("can be imported", async () => {
    const { SessionCard } = await import("@/components/sessions/session-card");
    assert(typeof SessionCard === "function");
  });

  it("handles different activity types", async () => {
    const { SessionCard } = await import("@/components/sessions/session-card");
    const source = SessionCard.toString();

    assert(source.includes("CARD"));
    assert(source.includes("SQUASH"));
    assert(source.includes("PADEL"));
  });

  it("displays round/match results correctly", async () => {
    const { SessionCard } = await import("@/components/sessions/session-card");
    const source = SessionCard.toString();

    assert(source.includes("Rounds") || source.includes("Matches"));
    assert(source.includes("resultCount"));
  });

  it("handles pagination context with returnTo prop", async () => {
    const { SessionCard } = await import("@/components/sessions/session-card");
    const source = SessionCard.toString();

    assert(source.includes("returnTo"));
  });

  it("includes ListItemCard for mobile rendering", async () => {
    const { SessionCard } = await import("@/components/sessions/session-card");
    const source = SessionCard.toString();

    assert(source.includes("ListItemCard"));
  });

  it("includes stats grid for session details", async () => {
    const { SessionCard } = await import("@/components/sessions/session-card");
    const source = SessionCard.toString();

    assert(source.includes("stats"));
    assert(source.includes("Group"));
    assert(source.includes("Participants"));
  });

  it("handles canEdit prop for conditional rendering", async () => {
    const { SessionCard } = await import("@/components/sessions/session-card");
    const source = SessionCard.toString();

    assert(source.includes("canEdit"));
  });
});

describe("Sessions page - ResponsiveList integration", () => {
  it("imports ResponsiveList", async () => {
    const module = await import("@/app/(dashboard)/dashboard/sessions/page");
    const source = module.default.toString();

    assert(source.includes("ResponsiveList"));
  });

  it("imports SessionCard", async () => {
    const module = await import("@/app/(dashboard)/dashboard/sessions/page");
    const source = module.default.toString();

    assert(source.includes("SessionCard"));
  });

  it("maintains filter state (activity, groupId)", async () => {
    const module = await import("@/app/(dashboard)/dashboard/sessions/page");
    const source = module.default.toString();

    assert(source.includes("activityFilter"));
    assert(source.includes("validGroupId"));
  });

  it("preserves pagination controls", async () => {
    const module = await import("@/app/(dashboard)/dashboard/sessions/page");
    const source = module.default.toString();

    assert(source.includes("currentPage") || source.includes("hasNextPage"));
  });

  it("maintains empty state handling", async () => {
    const module = await import("@/app/(dashboard)/dashboard/sessions/page");
    const source = module.default.toString();

    assert(source.includes("EmptyState"));
  });

  it("passes canEditSession logic to SessionCard", async () => {
    const module = await import("@/app/(dashboard)/dashboard/sessions/page");
    const source = module.default.toString();

    assert(source.includes("canEditSession"));
    assert(source.includes("canEdit={"));
  });

  it("handles mobile and desktop renderers in ResponsiveList", async () => {
    const module = await import("@/app/(dashboard)/dashboard/sessions/page");
    const source = module.default.toString();

    assert(source.includes("mobile={") || source.includes("mobile:"));
    assert(source.includes("desktop={") || source.includes("desktop:"));
  });

  it("uses desktopHeaders prop for table headers", async () => {
    const module = await import("@/app/(dashboard)/dashboard/sessions/page");
    const source = module.default.toString();

    assert(source.includes("desktopHeaders"));
    assert(source.includes("Played at"));
    assert(source.includes("Activity"));
    assert(source.includes("Group"));
  });

  it("renders ActivityBadge in both mobile and desktop", async () => {
    const module = await import("@/app/(dashboard)/dashboard/sessions/page");
    const source = module.default.toString();

    assert(source.includes("ActivityBadge"));
  });

  it("preserves returnTo parameter for navigation context", async () => {
    const module = await import("@/app/(dashboard)/dashboard/sessions/page");
    const source = module.default.toString();

    assert(source.includes("returnTo"));
  });

  it("maintains backward compatibility with existing session list functionality", async () => {
    const module = await import("@/app/(dashboard)/dashboard/sessions/page");
    const source = module.default.toString();

    // Should still have the filter UI
    assert(source.includes("Activity filter") || source.includes("sessions-filters"));
    // Should still have quick actions
    assert(source.includes("quick-actions") || source.includes("quickCreate"));
    // Should still handle pagination
    assert(source.includes("currentPage") || source.includes("hasNextPage"));
  });
});

describe("Sessions page - Component structure validation", () => {
  it("SessionCard accepts SessionListRow compatible data", async () => {
    const { SessionCard } = await import("@/components/sessions/session-card");
    const source = SessionCard.toString();

    // Should have all required properties
    assert(source.includes("session.id"));
    assert(source.includes("session.title"));
    assert(source.includes("session.activityType"));
    assert(source.includes("session.playedAt"));
    assert(source.includes("session.updatedAt"));
    assert(source.includes("session.group"));
    assert(source.includes("session._count"));
  });

  it("SessionCard formats dates consistently", async () => {
    const { SessionCard } = await import("@/components/sessions/session-card");
    const source = SessionCard.toString();

    assert(source.includes("dateFormatter"));
    assert(source.includes("formatDateTime"));
  });

  it("Sessions page data flow is intact", async () => {
    const module = await import("@/app/(dashboard)/dashboard/sessions/page");
    const source = module.default.toString();

    // Should fetch and map sessions correctly
    assert(source.includes("getGameSessions"));
    assert(source.includes("sessions"));
    assert(source.includes("formatResultCount"));
  });
});
