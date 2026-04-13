import { expect, type Page } from "@playwright/test";

import { requireEnv } from "./env";

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");

  await page.getByTestId("login-email-input").fill(email);
  await page.getByTestId("login-password-input").fill(password);
  await page.getByTestId("login-submit-button").click();
}

export async function loginAsAdmin(page: Page) {
  await login(page, requireEnv("E2E_ADMIN_EMAIL"), requireEnv("E2E_ADMIN_PASSWORD"));
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByTestId("dashboard-heading")).toBeVisible();
}

export async function loginAsForcedPasswordUser(page: Page) {
  await login(page, requireEnv("E2E_MEMBER_EMAIL"), requireEnv("E2E_MEMBER_PASSWORD"));
  await expect(page).toHaveURL(/\/force-password-change/);
  await expect(page.getByTestId("force-password-change-form")).toBeVisible();
}

export async function loginAsMember(page: Page) {
  const email = requireEnv("E2E_MEMBER_EMAIL");
  const currentPassword = requireEnv("E2E_MEMBER_PASSWORD");
  const newPassword = process.env.E2E_MEMBER_NEW_PASSWORD;

  await login(page, email, currentPassword);

  if (page.url().includes("/dashboard")) {
    await expect(page.getByTestId("dashboard-heading")).toBeVisible();
    return;
  }

  if (page.url().includes("/force-password-change")) {
    if (!newPassword) {
      throw new Error("Missing required env var: E2E_MEMBER_NEW_PASSWORD");
    }

    await page.getByTestId("security-current-password-input").fill(currentPassword);
    await page.getByTestId("security-new-password-input").fill(newPassword);
    await page.getByTestId("security-confirm-password-input").fill(newPassword);
    await page.getByTestId("security-submit-button").click();
    await expect(page.getByTestId("security-success-message")).toBeVisible();
    await page.getByTestId("force-password-continue-link").click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByTestId("dashboard-heading")).toBeVisible();
    return;
  }

  if (!newPassword) {
    throw new Error("Member login did not reach dashboard and E2E_MEMBER_NEW_PASSWORD is not configured.");
  }

  await login(page, email, newPassword);
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByTestId("dashboard-heading")).toBeVisible();
}
