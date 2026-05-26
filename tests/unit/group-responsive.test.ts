import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("GroupCard component", () => {
  it("can be imported", async () => {
    const { GroupCard } = await import("@/components/groups/group-card");
    assert(typeof GroupCard === "function");
  });

  it("displays group name and activity badge", async () => {
    const { GroupCard } = await import("@/components/groups/group-card");
    const source = GroupCard.toString();

    assert(source.includes("group.name"));
    assert(source.includes("activityType"));
    assert(source.includes("badge"));
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
    const module = await import("@/app/(dashboard)/dashboard/groups/page");
    const source = module.default.toString();

    assert(source.includes("ResponsiveList"));
    assert(source.includes("GroupCard"));
  });

  it("maintains empty state handling", async () => {
    const module = await import("@/app/(dashboard)/dashboard/groups/page");
    const source = module.default.toString();

    assert(source.includes("EmptyState"));
  });

  it("preserves activity badge display", async () => {
    const module = await import("@/app/(dashboard)/dashboard/groups/page");
    const source = module.default.toString();

    assert(source.includes("ActivityBadge"));
  });

  it("maintains authorization checks for edit functionality", async () => {
    const module = await import("@/app/(dashboard)/dashboard/groups/page");
    const source = module.default.toString();

    assert(source.includes("canEditGroup"));
    assert(source.includes("isOwner"));
    assert(source.includes("isTrustedAdmin"));
  });

  it("preserves group creation controls", async () => {
    const module = await import("@/app/(dashboard)/dashboard/groups/page");
    const source = module.default.toString();

    assert(source.includes("canCreateGroup"));
  });

  it("uses desktopHeaders prop for table headers", async () => {
    const module = await import("@/app/(dashboard)/dashboard/groups/page");
    const source = module.default.toString();

    assert(source.includes("desktopHeaders"));
    assert(source.includes("Activity"));
    assert(source.includes("Members"));
  });

  it("renders both mobile and desktop variants", async () => {
    const module = await import("@/app/(dashboard)/dashboard/groups/page");
    const source = module.default.toString();

    // Check that ResponsiveList is used with both renderers
    assert(source.includes("ResponsiveList"));
    assert(source.includes("GroupCard"));
    assert(source.includes("View") && source.includes("Edit"));
  });

  it("maintains backward compatibility with view/edit actions", async () => {
    const module = await import("@/app/(dashboard)/dashboard/groups/page");
    const source = module.default.toString();

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
    assert(source.includes("group.activityType"));
    assert(source.includes("group._count"));
  });

  it("Groups page maintains data fetching", async () => {
    const module = await import("@/app/(dashboard)/dashboard/groups/page");
    const source = module.default.toString();

    // Should fetch groups correctly
    assert(source.includes("getGroups"));
    assert(source.includes("groups"));
  });

  it("Groups page preserves authorization checking", async () => {
    const module = await import("@/app/(dashboard)/dashboard/groups/page");
    const source = module.default.toString();

    assert(source.includes("canCreateGroup"));
    assert(source.includes("canEditGroup"));
  });
});
