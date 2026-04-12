import { hashPassword } from "better-auth/crypto";
import { PrismaClient, Role } from "@prisma/client";
import { adminSeedEnvSchema, parseBooleanFromEnv } from "../lib/validation/seed";

const prisma = new PrismaClient();

type CredentialSeedUser = {
  email: string;
  name: string;
  password: string;
  role: Role;
  mustChangePassword: boolean;
};

function assertCredentialsPresent(email: string | undefined, password: string | undefined, label: string) {
  if ((email && !password) || (!email && password)) {
    throw new Error(`${label} requires both email and password when configured.`);
  }
}

async function upsertCredentialUser(tx: PrismaClient, input: CredentialSeedUser) {
  const passwordHash = await hashPassword(input.password);

  const existingUser = await tx.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (!existingUser) {
    const created = await tx.user.create({
      data: {
        email: input.email,
        name: input.name,
        role: input.role,
        mustChangePassword: input.mustChangePassword,
        emailVerified: true,
      },
      select: { id: true },
    });

    await tx.account.create({
      data: {
        userId: created.id,
        accountId: created.id,
        providerId: "credential",
        password: passwordHash,
      },
    });

    return "created" as const;
  }

  await tx.user.update({
    where: { id: existingUser.id },
    data: {
      name: input.name,
      role: input.role,
      mustChangePassword: input.mustChangePassword,
      emailVerified: true,
    },
  });

  const credentialAccount = await tx.account.findFirst({
    where: {
      userId: existingUser.id,
      providerId: "credential",
    },
    select: {
      id: true,
    },
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
        userId: existingUser.id,
        accountId: existingUser.id,
        providerId: "credential",
        password: passwordHash,
      },
    });
  }

  return "updated" as const;
}

async function main() {
  const env = adminSeedEnvSchema.parse(process.env);
  assertCredentialsPresent(env.E2E_ADMIN_EMAIL, env.E2E_ADMIN_PASSWORD, "E2E admin user");
  assertCredentialsPresent(env.E2E_MEMBER_EMAIL, env.E2E_MEMBER_PASSWORD, "E2E member user");

  const adminMustChangePassword = parseBooleanFromEnv(env.ADMIN_MUST_CHANGE_PASSWORD, true);
  const e2eAdminMustChangePassword = parseBooleanFromEnv(env.E2E_ADMIN_MUST_CHANGE_PASSWORD, false);
  const e2eMemberMustChangePassword = parseBooleanFromEnv(env.E2E_MEMBER_MUST_CHANGE_PASSWORD, true);

  const existingUser = await prisma.user.findUnique({
    where: { email: env.ADMIN_EMAIL },
    select: { id: true },
  });

  if (existingUser) {
    console.log(`Admin user already exists for ${env.ADMIN_EMAIL}.`);
    return;
  }

  const passwordHash = await hashPassword(env.ADMIN_PASSWORD);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: env.ADMIN_EMAIL,
        name: env.ADMIN_NAME,
        role: Role.ADMIN,
        mustChangePassword: adminMustChangePassword,
        emailVerified: true,
      },
      select: { id: true },
    });

    await tx.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: passwordHash,
      },
    });
  });

  console.log(`Created initial admin user for ${env.ADMIN_EMAIL}.`);

  if (env.E2E_ADMIN_EMAIL && env.E2E_ADMIN_PASSWORD) {
    const result = await upsertCredentialUser(prisma, {
      email: env.E2E_ADMIN_EMAIL,
      password: env.E2E_ADMIN_PASSWORD,
      name: env.E2E_ADMIN_NAME ?? "E2E Admin",
      role: Role.ADMIN,
      mustChangePassword: e2eAdminMustChangePassword,
    });

    console.log(`${result === "created" ? "Created" : "Updated"} E2E admin user for ${env.E2E_ADMIN_EMAIL}.`);
  }

  if (env.E2E_MEMBER_EMAIL && env.E2E_MEMBER_PASSWORD) {
    const result = await upsertCredentialUser(prisma, {
      email: env.E2E_MEMBER_EMAIL,
      password: env.E2E_MEMBER_PASSWORD,
      name: env.E2E_MEMBER_NAME ?? "E2E Member",
      role: Role.MEMBER,
      mustChangePassword: e2eMemberMustChangePassword,
    });

    console.log(`${result === "created" ? "Created" : "Updated"} E2E member user for ${env.E2E_MEMBER_EMAIL}.`);
  }
}

main()
  .catch((error) => {
    console.error("Admin seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
