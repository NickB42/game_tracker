import { expect, type Page } from "@playwright/test";

export async function createPlayerViaUI(page: Page, displayName: string) {
  await page.goto("/dashboard/players");
  await page.getByTestId("players-new-link").click();

  await page.getByTestId("player-display-name-input").fill(displayName);
  await page.getByTestId("player-submit-button").click();

  await expect(page).toHaveURL(/\/dashboard\/players\/.+/);
  await expect(page.getByTestId("player-detail-heading")).toContainText(displayName);
}

export async function createSessionViaUI(page: Page, sessionTitle: string, participantNames: string[]) {
  await page.goto("/dashboard/sessions/new");

  await page.getByTestId("session-title-input").fill(sessionTitle);

  for (const participantName of participantNames) {
    await page.getByLabel(participantName, { exact: true }).check();
  }

  await page.getByTestId("session-submit-button").click();

  await expect(page).toHaveURL(/\/dashboard\/sessions\/.+/);
  await expect(page.getByTestId("session-detail-heading")).toContainText(sessionTitle);
}

export async function createGroupViaUI(page: Page, groupName: string, memberNames?: string[]) {
  await page.goto("/dashboard/groups/new");

  await page.getByLabel("Group name", { exact: true }).fill(groupName);

  for (const memberName of memberNames ?? []) {
    await page.getByLabel(memberName, { exact: true }).check();
  }

  await page.getByRole("button", { name: "Create group" }).click();

  await expect(page).toHaveURL(/\/dashboard\/groups\/.+/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(groupName);
}
