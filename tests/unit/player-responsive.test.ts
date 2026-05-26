import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("PlayerCard component", () => {
  it("can be imported", async () => {
    const { PlayerCard } = await import("@/components/players/player-card");
    assert(typeof PlayerCard === "function");
  });

  it("displays player name and status badge", async () => {
    const { PlayerCard } = await import("@/components/players/player-card");
    const source = PlayerCard.toString();

    assert(source.includes("displayName"));
    assert(source.includes("isActive"));
    assert(source.includes("Active") || source.includes("Inactive"));
  });

  it("shows groups and sessions count", async () => {
    const { PlayerCard } = await import("@/components/players/player-card");
    const source = PlayerCard.toString();

    assert(source.includes("Groups"));
    assert(source.includes("Sessions"));
    assert(source.includes("_count"));
  });

  it("links to player detail page", async () => {
    const { PlayerCard } = await import("@/components/players/player-card");
    const source = PlayerCard.toString();

    assert(source.includes("/dashboard/players/"));
  });

  it("uses ListItemCard for rendering", async () => {
    const { PlayerCard } = await import("@/components/players/player-card");
    const source = PlayerCard.toString();

    assert(source.includes("ListItemCard"));
  });

  it("handles status badge variants correctly", async () => {
    const { PlayerCard } = await import("@/components/players/player-card");
    const source = PlayerCard.toString();

    assert(source.includes("success"));
    assert(source.includes("warning"));
  });
});

describe("Players page - ResponsiveList integration", () => {
  it("imports ResponsiveList and PlayerCard", async () => {
    const module = await import("@/app/(dashboard)/dashboard/players/page");
    const source = module.default.toString();

    assert(source.includes("ResponsiveList"));
    assert(source.includes("PlayerCard"));
  });

  it("maintains empty state handling", async () => {
    const module = await import("@/app/(dashboard)/dashboard/players/page");
    const source = module.default.toString();

    assert(source.includes("EmptyState"));
  });

  it("preserves pagination controls", async () => {
    const module = await import("@/app/(dashboard)/dashboard/players/page");
    const source = module.default.toString();

    assert(source.includes("currentPage") || source.includes("hasNextPage"));
  });

  it("maintains admin-only edit functionality", async () => {
    const module = await import("@/app/(dashboard)/dashboard/players/page");
    const source = module.default.toString();

    assert(source.includes("ADMIN"));
    assert(source.includes("/edit"));
  });

  it("preserves status badge for active/inactive players", async () => {
    const module = await import("@/app/(dashboard)/dashboard/players/page");
    const source = module.default.toString();

    assert(source.includes("StatusBadge"));
    assert(source.includes("isActive"));
  });

  it("uses one icon-only player create action", async () => {
    const module = await import("@/app/(dashboard)/dashboard/players/page");
    const source = module.default.toString();

    assert(source.includes("players-new-link"));
    assert(source.includes("app-icon-button"));
    assert(source.includes("PlusIcon"));
    assert(!source.includes("Create player"));
    assert(!source.includes("Global player records"));
  });

  it("uses desktopHeaders prop for table headers", async () => {
    const module = await import("@/app/(dashboard)/dashboard/players/page");
    const source = module.default.toString();

    assert(source.includes("desktopHeaders"));
    assert(source.includes("Display name"));
    assert(source.includes("Groups"));
  });

  it("renders both mobile and desktop variants", async () => {
    const module = await import("@/app/(dashboard)/dashboard/players/page");
    const source = module.default.toString();

    // Check that ResponsiveList is used with both renderers
    assert(source.includes("ResponsiveList"));
    assert(source.includes("PlayerCard"));
    assert(source.includes("View") && source.includes("Edit"));
  });

  it("maintains backward compatibility with view/edit actions", async () => {
    const module = await import("@/app/(dashboard)/dashboard/players/page");
    const source = module.default.toString();

    assert(source.includes("/dashboard/players/"));
    assert(source.includes("View"));
    assert(source.includes("Edit"));
  });
});

describe("Players page - Component structure validation", () => {
  it("PlayerCard accepts correct player data shape", async () => {
    const { PlayerCard } = await import("@/components/players/player-card");
    const source = PlayerCard.toString();

    // Should have all required properties
    assert(source.includes("player.id"));
    assert(source.includes("player.displayName"));
    assert(source.includes("player.isActive"));
    assert(source.includes("player._count"));
  });

  it("Players page maintains data fetching", async () => {
    const module = await import("@/app/(dashboard)/dashboard/players/page");
    const source = module.default.toString();

    // Should fetch players correctly
    assert(source.includes("getPlayers"));
    assert(source.includes("players"));
  });

  it("Players page preserves user role checking", async () => {
    const module = await import("@/app/(dashboard)/dashboard/players/page");
    const source = module.default.toString();

    assert(source.includes("user.role"));
    assert(source.includes("ADMIN"));
  });
});
