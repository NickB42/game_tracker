import { expect, type Page } from "@playwright/test";

export async function createPlayerViaUI(page: Page, displayName: string) {
  await page.goto("/dashboard/players");
  await page.getByTestId("players-new-link").click();

  await page.getByTestId("player-display-name-input").fill(displayName);
  await page.getByTestId("player-submit-button").click();

  await expect(page).toHaveURL(/\/dashboard\/players\/.+/);
  await expect(page.getByTestId("player-detail-heading")).toContainText(displayName);
}

export async function createSessionViaUI(
  page: Page,
  sessionTitle: string,
  participantNames: string[],
  options?: { activityType?: "CARD" | "SQUASH" | "PADEL" },
) {
  await page.goto("/dashboard/sessions/new");

  await page.getByLabel("Activity", { exact: true }).selectOption(options?.activityType ?? "CARD");

  await page.getByTestId("session-title-input").fill(sessionTitle);

  for (const participantName of participantNames) {
    await page.getByLabel(participantName, { exact: true }).check();
  }

  await page.getByTestId("session-submit-button").click();

  await expect(page).toHaveURL(/\/dashboard\/sessions\/.+/);
  await expect(page.getByTestId("session-detail-heading")).toContainText(sessionTitle);
}

export async function createSquashMatchViaUI(page: Page, players: [string, string], score: [number, number]) {
  await page.getByRole("link", { name: "Add Match" }).click();
  await expect(page).toHaveURL(/\/dashboard\/sessions\/.+\/matches\/new/);

  await page.getByLabel("Side 1 player", { exact: true }).selectOption({ label: players[0] });
  await page.getByLabel("Side 2 player", { exact: true }).selectOption({ label: players[1] });
  await page.getByLabel("Side 1 score", { exact: true }).fill(String(score[0]));
  await page.getByLabel("Side 2 score", { exact: true }).fill(String(score[1]));

  await page.getByRole("button", { name: "Add match" }).click();
  await expect(page).toHaveURL(/\/dashboard\/sessions\/.+/);
}

export async function createPadelMatchViaUI(
  page: Page,
  sideOnePlayers: [string, string],
  sideTwoPlayers: [string, string],
  setScores: Array<[number, number]>,
) {
  await page.getByRole("link", { name: "Add Match" }).click();
  await expect(page).toHaveURL(/\/dashboard\/sessions\/.+\/matches\/new/);

  await page.getByLabel("Side 1 player 1", { exact: true }).selectOption({ label: sideOnePlayers[0] });
  await page.getByLabel("Side 1 player 2", { exact: true }).selectOption({ label: sideOnePlayers[1] });
  await page.getByLabel("Side 2 player 1", { exact: true }).selectOption({ label: sideTwoPlayers[0] });
  await page.getByLabel("Side 2 player 2", { exact: true }).selectOption({ label: sideTwoPlayers[1] });

  const sideOneGamesInputs = page.getByLabel("Side 1 games");
  const sideTwoGamesInputs = page.getByLabel("Side 2 games");

  for (let index = 0; index < setScores.length; index += 1) {
    await sideOneGamesInputs.nth(index).fill(String(setScores[index][0]));
    await sideTwoGamesInputs.nth(index).fill(String(setScores[index][1]));
  }

  await page.getByRole("button", { name: "Add match" }).click();
  await expect(page).toHaveURL(/\/dashboard\/sessions\/.+/);
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
