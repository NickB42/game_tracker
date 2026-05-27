import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("GroupCard component", () => {
  it("can be imported", async () => {
    const { GroupCard } = await import("@/components/groups/group-card");
    assert(typeof GroupCard === "function");
  });

  it("displays group name without an activity badge", async () => {
    const { GroupCard } = await import("@/components/groups/group-card");
    const source = GroupCard.toString();

    assert(source.includes("group.name"));
    assert(!source.includes("activityType"));
    assert(!source.includes("badge"));
  });

  it("shows members and sessions count", async () => {
    const { GroupCard } = await import("@/components/groups/group-card");
    const source = GroupCard.toString();

    assert(source.includes("Members"));
    assert(source.includes("Sessions"));
    assert(source.includes("_count"));
  });

  it("links to group detail page", async () => {
    const { GroupCard } = await import("@/components/groups/group-card");
    const source = GroupCard.toString();

    assert(source.includes("/dashboard/groups/"));
  });

  it("uses ListItemCard for rendering", async () => {
    const { GroupCard } = await import("@/components/groups/group-card");
    const source = GroupCard.toString();

    assert(source.includes("ListItemCard"));
  });
});

describe("Groups page - ResponsiveList integration", () => {
  it("imports ResponsiveList and GroupCard", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/groups/page");
    const source = testModule.default.toString();

    assert(source.includes("ResponsiveList"));
    assert(source.includes("GroupCard"));
  });

  it("maintains empty state handling", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/groups/page");
    const source = testModule.default.toString();

    assert(source.includes("EmptyState"));
  });

  it("does not render group activity badges", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/groups/page");
    const source = testModule.default.toString();

    assert(!source.includes("ActivityBadge"));
  });

  it("maintains authorization checks for edit functionality", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/groups/page");
    const source = testModule.default.toString();

    assert(source.includes("canEditGroup"));
    assert(source.includes("isOwner"));
    assert(source.includes("isTrustedAdmin"));
  });

  it("preserves group creation controls", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/groups/page");
    const source = testModule.default.toString();

    assert(source.includes("canCreateGroup"));
  });

  it("uses one icon-only group create action", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/groups/page");
    const source = testModule.default.toString();

    assert(source.includes("groups-create-link"));
    assert(source.includes("app-icon-button"));
    assert(source.includes("PlusIcon"));
    assert(!source.includes("Create group"));
  });

  it("uses desktopHeaders prop for table headers", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/groups/page");
    const source = testModule.default.toString();

    assert(source.includes("desktopHeaders"));
    assert(source.includes("Members"));
  });

  it("renders both mobile and desktop variants", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/groups/page");
    const source = testModule.default.toString();

    // Check that ResponsiveList is used with both renderers
    assert(source.includes("ResponsiveList"));
    assert(source.includes("GroupCard"));
    assert(source.includes("View") && source.includes("Edit"));
  });

  it("maintains backward compatibility with view/edit actions", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/groups/page");
    const source = testModule.default.toString();

    assert(source.includes("/dashboard/groups/"));
    assert(source.includes("View"));
    assert(source.includes("Edit"));
  });
});

describe("Groups page - Component structure validation", () => {
  it("GroupCard accepts correct group data shape", async () => {
    const { GroupCard } = await import("@/components/groups/group-card");
    const source = GroupCard.toString();

    // Should have all required properties
    assert(source.includes("group.id"));
    assert(source.includes("group.name"));
    assert(source.includes("group._count"));
  });

  it("Groups page maintains data fetching", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/groups/page");
    const source = testModule.default.toString();

    // Should fetch groups correctly
    assert(source.includes("getGroups"));
    assert(source.includes("groups"));
  });

  it("Groups page preserves authorization checking", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/groups/page");
    const source = testModule.default.toString();

    assert(source.includes("canCreateGroup"));
    assert(source.includes("canEditGroup"));
  });
});

describe("Group detail page - mobile layout", () => {
  it("does not render group activity in the header or summary", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/groups/[id]/page");
    const source = testModule.default.toString();

    assert(!source.includes("ActivityBadge"));
    assert(!source.includes("formatActivityType"));
    assert(!source.includes('label="Activity"'));
  });

  it("hides stat cards on mobile", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/groups/[id]/page");
    const source = testModule.default.toString();

    assert(source.includes("hidden md:grid"));
    assert(source.includes("StatCard"));
  });

  it("keeps trusted admins as desktop supporting content", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/groups/[id]/page");
    const source = testModule.default.toString();

    assert(source.includes("hidden md:block"));
    assert(source.includes("Trusted admins"));
  });

  it("keeps members visible as primary group content", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/groups/[id]/page");
    const source = testModule.default.toString();

    assert(source.includes("Members"));
    assert(source.includes("groupRecord.memberships.map"));
  });

  it("uses icon-only header actions", async () => {
    const testModule = await import("@/app/(dashboard)/dashboard/groups/[id]/page");
    const source = testModule.default.toString();

    assert(source.includes("app-icon-button"));
    assert(source.includes("ArrowLeftIcon"));
    assert(source.includes("TrophyIcon"));
    assert(source.includes("PencilIcon"));
    assert(!source.includes("formatActivityType"));
  });
});
