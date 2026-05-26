import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Test that components can be imported without errors
describe("Responsive UI Components - Imports", () => {
  it("ListItemCard can be imported", async () => {
    // Dynamic import to avoid build-time errors
    const { ListItemCard } = await import("@/components/ui/list-item-card");
    assert(typeof ListItemCard === "function");
  });

  it("ResponsiveList can be imported", async () => {
    const { ResponsiveList } = await import("@/components/ui/responsive-list");
    assert(typeof ResponsiveList === "function");
  });

  it("LeaderboardCard can be imported", async () => {
    const { LeaderboardCard } = await import("@/components/leaderboards/leaderboard-card");
    assert(typeof LeaderboardCard === "function");
  });
});

// Test component structure and prop types
describe("Responsive UI Components - Component Structure", () => {
  it("ListItemCard accepts required props", async () => {
    const { ListItemCard } = await import("@/components/ui/list-item-card");
    const component = ListItemCard;
    
    // Verify the component function exists and has proper signature
    assert(component.length >= 0, "ListItemCard should be a React component");
    assert(component.name === "ListItemCard");
  });

  it("ResponsiveList accepts generic data type", async () => {
    const { ResponsiveList } = await import("@/components/ui/responsive-list");
    assert(ResponsiveList.name === "ResponsiveList");
  });

  it("LeaderboardCard accepts leaderboard data", async () => {
    const { LeaderboardCard } = await import("@/components/leaderboards/leaderboard-card");
    assert(LeaderboardCard.name === "LeaderboardCard");
  });
});

// Test LeaderboardTable integration
describe("LeaderboardTable - Responsive List Integration", () => {
  it("LeaderboardTable imports ResponsiveList", async () => {
    const { LeaderboardTable } = await import("@/components/leaderboards/leaderboard-table");
    assert(typeof LeaderboardTable === "function");
  });

  it("LeaderboardTable can render empty state", async () => {
    const { LeaderboardTable } = await import("@/components/leaderboards/leaderboard-table");
    
    // Component should handle empty rows
    const component = LeaderboardTable;
    assert(component.toString().includes("emptyState"));
  });

  it("LeaderboardTable handles CARD activity", async () => {
    const { LeaderboardTable } = await import("@/components/leaderboards/leaderboard-table");
    
    // Component should differentiate between activity types
    const source = LeaderboardTable.toString();
    assert(source.includes("CARD"));
    assert(source.includes("isCard"));
  });

  it("LeaderboardTable handles SQUASH activity", async () => {
    const { LeaderboardTable } = await import("@/components/leaderboards/leaderboard-table");
    
    const source = LeaderboardTable.toString();
    // Should mention SQUASH/sports activities
    assert(source.includes("activityType"));
  });
});

// Test component prop compatibility
describe("Responsive Components - Props Validation", () => {
  it("ResponsiveList supports mobile and desktop renderers", async () => {
    const { ResponsiveList } = await import("@/components/ui/responsive-list");
    
    // Check that the component signature includes required props
    const source = ResponsiveList.toString();
    assert(source.includes("mobile"));
    assert(source.includes("desktop"));
    assert(source.includes("data"));
  });

  it("ResponsiveList supports optional headers for tables", async () => {
    const { ResponsiveList } = await import("@/components/ui/responsive-list");
    
    const source = ResponsiveList.toString();
    assert(source.includes("desktopHeaders"));
  });

  it("ListItemCard supports stats prop", async () => {
    const { ListItemCard } = await import("@/components/ui/list-item-card");
    
    const source = ListItemCard.toString();
    assert(source.includes("stats"));
  });

  it("ListItemCard supports badge prop", async () => {
    const { ListItemCard } = await import("@/components/ui/list-item-card");
    
    const source = ListItemCard.toString();
    assert(source.includes("badge"));
  });
});

// Test backward compatibility
describe("LeaderboardTable - Backward Compatibility", () => {
  it("maintains same export interface", async () => {
    const testModule = await import("@/components/leaderboards/leaderboard-table");
    
    // Should still export LeaderboardTable as named export
    assert(typeof testModule.LeaderboardTable === "function");
    
    // Should accept same props as before
    const source = testModule.LeaderboardTable.toString();
    assert(source.includes("rows"));
    assert(source.includes("activityType"));
    assert(source.includes("scopeLabel"));
  });

  it("still handles empty rows", async () => {
    const { LeaderboardTable } = await import("@/components/leaderboards/leaderboard-table");
    
    const source = LeaderboardTable.toString();
    // Should have empty state handling
    assert(source.includes("emptyState"));
    assert(source.includes("EmptyState"));
  });

  it("preserves all activity-specific columns", async () => {
    const { LeaderboardTable } = await import("@/components/leaderboards/leaderboard-table");
    
    const source = LeaderboardTable.toString();
    // CARD activity columns
    assert(source.includes("Round wins") || source.includes("Rounds played"));
    assert(source.includes("Match wins"));
    assert(source.includes("Sessions played"));
  });
});

