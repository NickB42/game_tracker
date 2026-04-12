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
