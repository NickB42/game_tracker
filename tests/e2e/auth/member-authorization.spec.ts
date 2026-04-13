import type { Page } from "@playwright/test";

import { test, expect } from "../fixtures/smoke-fixture";
import { createGroupViaUI, createPlayerViaUI, createSessionViaUI } from "../helpers/admin-flows";
import { loginAsAdmin, loginAsMember } from "../helpers/auth";

async function logout(page: Page) {
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/);
}

function extractIdFromUrl(url: string): string {
  const segments = new URL(url).pathname.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? "";
}

test("member can create and manage owned group/session", async ({ page, makeName }: { page: Page; makeName: (prefix: string) => string }) => {
  await loginAsAdmin(page);

  const playerOne = makeName("E2E Member Own P1");
  const playerTwo = makeName("E2E Member Own P2");

  await createPlayerViaUI(page, playerOne);
  await createPlayerViaUI(page, playerTwo);

  await logout(page);
  await loginAsMember(page);

  const groupName = makeName("E2E Member Group");
  await createGroupViaUI(page, groupName, [playerOne]);

  const groupId = extractIdFromUrl(page.url());
  await expect(page.getByRole("link", { name: "Edit group" })).toBeVisible();

  const sessionTitle = makeName("E2E Member Session");
  await createSessionViaUI(page, sessionTitle, [playerOne, playerTwo]);

  await expect(page.getByRole("link", { name: "Edit session" })).toBeVisible();
  await expect(page.getByTestId("session-add-round-link")).toBeVisible();

  await page.goto("/dashboard/leaderboards/global");
  await expect(page.getByTestId("global-leaderboard-heading")).toBeVisible();

  await page.goto(`/dashboard/leaderboards/groups/${groupId}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(groupName);
});

test("member cannot see unrelated admin-owned groups/sessions", async ({ page, makeName }: { page: Page; makeName: (prefix: string) => string }) => {
  await loginAsAdmin(page);

  const playerOne = makeName("E2E Admin Own P1");
  const playerTwo = makeName("E2E Admin Own P2");
  const groupName = makeName("E2E Admin Group");
  const sessionTitle = makeName("E2E Admin Session");

  await createPlayerViaUI(page, playerOne);
  await createPlayerViaUI(page, playerTwo);

  await createGroupViaUI(page, groupName, [playerOne]);
  const adminGroupId = extractIdFromUrl(page.url());

  await createSessionViaUI(page, sessionTitle, [playerOne, playerTwo]);

  await logout(page);
  await loginAsMember(page);

  await page.goto("/dashboard/groups");
  await expect(page.getByText(groupName)).toHaveCount(0);

  await page.goto("/dashboard/sessions");
  await expect(page.getByText(sessionTitle)).toHaveCount(0);

  await page.goto(`/dashboard/leaderboards/groups/${adminGroupId}`);
  await expect(page.getByText("This page could not be found.")).toBeVisible();
});
