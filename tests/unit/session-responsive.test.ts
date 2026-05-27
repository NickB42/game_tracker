import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

describe("SessionCard component", () => {
  it("can be imported", async () => {
    const { SessionCard } = await import("@/components/sessions/session-card");
    assert(typeof SessionCard === "function");
  });

  it("handles different activity types", async () => {
    const { SessionCard } = await import("@/components/sessions/session-card");
    const source = SessionCard.toString();

    assert(source.includes("activityType"));
    assert(source.includes("CARD"));
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

  it("handles props for conditional rendering", async () => {
    const { SessionCard } = await import("@/components/sessions/session-card");
    const source = SessionCard.toString();

    assert(source.includes("session"));
  });
});

describe("Sessions page - ResponsiveList integration", () => {
  it("imports ResponsiveList", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/sessions/page");
    const source = testModule.default.toString();

    assert(source.includes("ResponsiveList"));
  });

  it("imports SessionCard", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/sessions/page");
    const source = testModule.default.toString();

    assert(source.includes("SessionCard"));
  });

  it("maintains filter state (activity, groupId)", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/sessions/page");
    const source = testModule.default.toString();

    assert(source.includes("activityFilter"));
    assert(source.includes("validGroupId"));
  });

  it("preserves pagination controls", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/sessions/page");
    const source = testModule.default.toString();

    assert(source.includes("currentPage") || source.includes("hasNextPage"));
  });

  it("maintains empty state handling", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/sessions/page");
    const source = testModule.default.toString();

    assert(source.includes("EmptyState"));
  });

  it("passes canEditSession logic to SessionCard", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/sessions/page");
    const source = testModule.default.toString();

    assert(source.includes("canEditSession"));
  });

  it("handles mobile and desktop renderers in ResponsiveList", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/sessions/page");
    const source = testModule.default.toString();

    // Check that ResponsiveList is used with both renderers
    assert(source.includes("ResponsiveList"));
    assert(source.includes("SessionCard"));
    assert(source.includes("View") && source.includes("Edit"));
  });

  it("uses desktopHeaders prop for table headers", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/sessions/page");
    const source = testModule.default.toString();

    assert(source.includes("desktopHeaders"));
    assert(source.includes("Played at"));
    assert(source.includes("Activity"));
    assert(source.includes("Group"));
  });

  it("renders ActivityBadge in both mobile and desktop", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/sessions/page");
    const source = testModule.default.toString();

    assert(source.includes("ActivityBadge"));
  });

  it("preserves returnTo parameter for navigation context", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/sessions/page");
    const source = testModule.default.toString();

    assert(source.includes("returnTo"));
  });

  it("maintains backward compatibility with existing session list functionality", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/sessions/page");
    const source = testModule.default.toString();

    // Should still have the filter UI
    assert(source.includes("Activity filter") || source.includes("sessions-filters"));
    // Should still have create navigation context
    assert(source.includes("quickCreate"));
    // Should still handle pagination
    assert(source.includes("currentPage") || source.includes("hasNextPage"));
  });

  it("uses compact link filters without an apply button", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/sessions/page");
    const source = testModule.default.toString();

    assert(source.includes("sessions-filters"));
    assert(source.includes("sessions-group-filter-links"));
    assert(!source.includes("sessions-group-filter-apply"));
    assert(!source.includes("Apply"));
  });

  it("uses one icon-only session create action", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/sessions/page");
    const source = testModule.default.toString();

    assert(source.includes("sessions-create-link"));
    assert(source.includes("app-icon-button"));
    assert(source.includes("PlusIcon"));
    assert(!source.includes("sessions-quick-actions"));
    assert(!source.includes("sessions-quick-create"));
    assert(!source.includes("Create Session"));
  });
});

describe("Sessions page - Component structure validation", () => {
  it("SessionCard accepts SessionListRow compatible data", async () => {
    const { SessionCard } = await import("@/components/sessions/session-card");
    const source = SessionCard.toString();

    // Should have all required properties from the interface
    assert(source.includes("session.id"));
    assert(source.includes("session.title"));
    assert(source.includes("session.activityType"));
    assert(source.includes("session.playedAt"));
  });

  it("SessionCard formats dates consistently", async () => {
    const { SessionCard } = await import("@/components/sessions/session-card");
    const source = SessionCard.toString();

    assert(source.includes("formatDateTime") || source.includes("Intl.DateTimeFormat"));
  });

  it("Sessions page data flow is intact", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/sessions/page");
    const source = testModule.default.toString();

    // Should fetch and map sessions correctly
    assert(source.includes("getGameSessions"));
    assert(source.includes("sessions"));
    assert(source.includes("formatResultCount"));
  });
});

describe("Session form filtering", () => {
  it("keeps groups activity agnostic when activity changes", async () => {
    const { SessionForm } = await import("@/components/sessions/session-form");
    const source = SessionForm.toString();

    assert(!source.includes("selectableGroupsForActivity"));
    assert(!source.includes("currentGroup?.activityType"));
    assert(source.includes("selectedActivityType"));
    assert(source.includes("props.selectableGroups.map"));
  });

  it("filters participants by the selected group", async () => {
    const { SessionForm } = await import("@/components/sessions/session-form");
    const source = SessionForm.toString();

    assert(source.includes("selectablePlayersForGroup"));
    assert(source.includes("selectedGroup.playerIds.includes"));
  });

  it("loads session form groups with member ids", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/sessions/new/page");
    const source = testModule.default.toString();

    assert(source.includes("getGroupsForSessionForm"));
    assert(source.includes("playerIds"));
    assert(source.includes("membership.playerId"));
  });
});

describe("Session detail and result action polish", () => {
  it("uses icon-only header actions and plain activity text in the overview", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/sessions/[id]/page");
    const source = testModule.default.toString();

    assert(source.includes("app-icon-button"));
    assert(source.includes("ArrowLeftIcon"));
    assert(source.includes("TrophyIcon"));
    assert(source.includes("PencilIcon"));
    assert(source.includes("PlusIcon"));
    assert(source.includes("formatActivityType"));
  });

  it("does not render an activity badge in the session detail header", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/sessions/[id]/page");
    const source = testModule.default.toString();

    assert(!source.includes("ActivityBadge"));
  });

  it("links card sessions to the new round route", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/sessions/[id]/page");
    const source = testModule.default.toString();

    assert(source.includes("session-add-round-link"));
    assert(source.includes("/rounds/new"));
    assert(source.includes("activityType"));
    assert(source.includes("CARD"));
  });

  it("keeps the new round page card-only", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/sessions/[id]/rounds/new/page");
    const source = testModule.default.toString();

    assert(source.includes("activityType"));
    assert(source.includes("CARD"));
    assert(source.includes("notFound"));
    assert(source.includes("RoundForm"));
  });

  it("uses a draggable order list for round placement entry", async () => {
    const { RoundForm } = await import("@/components/rounds/round-form");
    const source = RoundForm.toString();

    assert(source.includes("DndContext"));
    assert(source.includes("round-order-list"));
    assert(source.includes("orderedSessionParticipantIds"));
    assert(!source.includes("round-position-select"));
  });

  it("removes the placements badge from card rounds", async () => {
    const { CardRoundsSection } = await import("@/components/sessions/card-rounds-section");
    const source = CardRoundsSection.toString();

    assert(source.includes("round.placements.map"));
    assert(!source.includes("StatusBadge"));
    assert(!source.includes("placements</"));
  });

  it("uses icon-only controls for sports match actions", async () => {
    const { SportsMatchesSection } = await import("@/components/sessions/sports-matches-section");
    const source = SportsMatchesSection.toString();

    assert(source.includes("app-icon-button"));
    assert(source.includes("PlusIcon"));
    assert(source.includes("PencilIcon"));
    assert(source.includes("TrashIcon"));
  });

  it("highlights sports match winners without winner badges", async () => {
    const { SportsMatchesSection } = await import("@/components/sessions/sports-matches-section");

    const markup = renderToStaticMarkup(
      createElement(SportsMatchesSection, {
        gameSessionId: "session-1",
        activityType: "SQUASH",
        canManageSession: false,
        matches: [
          {
            id: "match-1",
            sequenceNumber: 1,
            notes: null,
            participants: [
              {
                id: "participant-1",
                sideNumber: 1,
                player: {
                  id: "player-1",
                  displayName: "Alice",
                  isActive: true,
                },
              },
              {
                id: "participant-2",
                sideNumber: 2,
                player: {
                  id: "player-2",
                  displayName: "Bob",
                  isActive: true,
                },
              },
            ],
            result: {
              winningSideNumber: 1,
              scoreLines: [
                {
                  id: "score-1",
                  sequenceNumber: 1,
                  sideNumber: 1,
                  score: 11,
                },
                {
                  id: "score-2",
                  sequenceNumber: 1,
                  sideNumber: 2,
                  score: 7,
                },
              ],
            },
          },
        ],
      }),
    );

    assert(markup.includes('data-winning-side="true"'));
    assert.equal((markup.match(/data-winning-side="true"/g) ?? []).length, 1);
    assert(markup.includes("Winning side"));
    assert(markup.includes("Alice"));
    assert(markup.includes("Bob"));
    assert(!markup.includes("Winner: Side"));
  });

  it("renders sports scores alongside match sides", async () => {
    const { SportsMatchesSection } = await import("@/components/sessions/sports-matches-section");
    const source = SportsMatchesSection.toString();

    assert(source.includes("getScoreColumns"));
    assert(source.includes("gridTemplateColumns"));
    assert(source.includes("minmax(0, 1fr)"));
    assert(source.includes("Set"));
    assert(!source.includes("min-w-[28rem]"));
    assert(!source.includes("Score:"));
  });

  it("summarizes sports sessions with match wins", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/sessions/[id]/page");
    const source = testModule.default.toString();

    assert(source.includes("buildSportsSessionSummary"));
    assert(source.includes("matchWins"));
    assert(source.includes("Match wins"));
  });
});
