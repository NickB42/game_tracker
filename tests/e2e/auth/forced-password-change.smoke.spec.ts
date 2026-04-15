import { test, expect } from "../fixtures/smoke-fixture";
import { login } from "../helpers/auth";
import { requireEnv } from "../helpers/env";
import type { Page } from "@playwright/test";

async function resetForcedPasswordUserForTest(input: {
  email: string;
  name: string;
  password: string;
}) {
  const { hashPassword } = await import("better-auth/crypto");
  const { PrismaClient, Role } = await import("@prisma/client");

  const prisma = new PrismaClient();
  const passwordHash = await hashPassword(input.password);

  try {
    await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      });

      const userId = existingUser
        ? existingUser.id
        : (
            await tx.user.create({
              data: {
                email: input.email,
                name: input.name,
                role: Role.MEMBER,
                emailVerified: true,
                mustChangePassword: true,
              },
              select: { id: true },
            })
          ).id;

      if (existingUser) {
        await tx.user.update({
          where: { id: userId },
          data: {
            name: input.name,
            role: Role.MEMBER,
            emailVerified: true,
            mustChangePassword: true,
          },
        });
      }

      const credentialAccount = await tx.account.findFirst({
        where: {
          userId,
          providerId: "credential",
        },
        select: { id: true },
      });

      if (credentialAccount) {
        await tx.account.update({
          where: { id: credentialAccount.id },
          data: {
            password: passwordHash,
          },
        });
      } else {
        await tx.account.create({
          data: {
            userId,
            accountId: userId,
            providerId: "credential",
            password: passwordHash,
          },
        });
      }

      await tx.session.deleteMany({ where: { userId } });
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function submitPasswordChangeWithRetry(page: Page, currentPassword: string, newPassword: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.getByTestId("security-current-password-input").fill(currentPassword);
    await page.getByTestId("security-new-password-input").fill(newPassword);
    await page.getByTestId("security-confirm-password-input").fill(newPassword);
    await page.getByTestId("security-submit-button").click();

    const serverActionMismatch = page.getByText("Failed to find Server Action", { exact: false });
    let mismatchDetected = false;

    try {
      await expect(serverActionMismatch).toBeVisible({ timeout: 3000 });
      mismatchDetected = true;
    } catch {
      mismatchDetected = false;
    }

    if (!mismatchDetected) {
      return;
    }

    if (attempt === 1) {
      throw new Error("Password change failed due to repeated Server Action manifest mismatch.");
    }

    await page.goto("/force-password-change");
    await expect(page.getByTestId("force-password-change-form")).toBeVisible();
  }
}

test("@smoke forced password user can update password and reach dashboard", async ({ page }: { page: Page }) => {
  const email = requireEnv("E2E_MEMBER_EMAIL");
  const name = process.env.E2E_MEMBER_NAME ?? "E2E Member";
  const currentPassword = requireEnv("E2E_MEMBER_PASSWORD");
  const newPassword = requireEnv("E2E_MEMBER_NEW_PASSWORD");

  await resetForcedPasswordUserForTest({
    email,
    name,
    password: currentPassword,
  });

  await login(page, email, currentPassword);

  await expect(page).toHaveURL(/\/force-password-change/);
  await expect(page.getByTestId("force-password-change-form")).toBeVisible();

  await submitPasswordChangeWithRetry(page, currentPassword, newPassword);

  const successMessage = page.getByTestId("security-success-message");
  let showedSuccessMessage = true;

  try {
    await expect(successMessage).toBeVisible({ timeout: 10000 });
  } catch {
    showedSuccessMessage = false;
  }

  if (showedSuccessMessage) {
    await page.getByTestId("force-password-continue-link").click();
  }

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByTestId("dashboard-heading")).toBeVisible();

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/);
});
