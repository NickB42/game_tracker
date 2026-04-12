import { z } from "zod";

const nodeEnvSchema = z.enum(["development", "test", "production"]);

const envSchema = z.object({
  NODE_ENV: nodeEnvSchema.default("development"),
  DATABASE_URL: z.string().min(1).optional(),
  POSTGRES_PRISMA_URL: z.string().min(1).optional(),
  DIRECT_DATABASE_URL: z.string().url().optional(),
  POSTGRES_URL_NON_POOLING: z.string().url().optional(),
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required."),
  BETTER_AUTH_URL: z.string().url().optional(),
  BETTER_AUTH_TRUSTED_ORIGINS: z.string().optional(),
  BETTER_AUTH_ALLOWED_HOSTS: z.string().optional(),
  BETTER_AUTH_ENABLE_VERCEL_PREVIEW: z
    .enum(["true", "false", "1", "0", "yes", "no"])
    .optional(),
  VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
  VERCEL_URL: z.string().optional(),
  VERCEL_BRANCH_URL: z.string().optional(),
  VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
});

type RawEnv = z.infer<typeof envSchema>;

function parseCsv(input: string | undefined): string[] {
  if (!input) {
    return [];
  }

  return input
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function parseBoolean(input: string | undefined, fallback: boolean): boolean {
  if (!input) {
    return fallback;
  }

  return ["true", "1", "yes"].includes(input.toLowerCase());
}

function toHostname(value: string): string | null {
  if (!value) {
    return null;
  }

  const raw = value.trim();
  if (!raw) {
    return null;
  }

  const candidate = raw.includes("://") ? raw : `https://${raw}`;

  try {
    return new URL(candidate).host.toLowerCase();
  } catch {
    return null;
  }
}

function toOrigin(value: string): string | null {
  if (!value) {
    return null;
  }

  const raw = value.trim();
  if (!raw) {
    return null;
  }

  const candidate = raw.includes("://") ? raw : `https://${raw}`;

  try {
    return new URL(candidate).origin;
  } catch {
    return null;
  }
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function getAuthAllowedHosts(env: RawEnv): string[] {
  const localhostHosts = ["localhost:3000", "127.0.0.1:3000"];

  const explicitHosts = parseCsv(env.BETTER_AUTH_ALLOWED_HOSTS)
    .map((value) => toHostname(value) ?? value.toLowerCase())
    .filter(Boolean);

  const vercelHosts = [
    toHostname(env.VERCEL_URL ?? ""),
    toHostname(env.VERCEL_BRANCH_URL ?? ""),
    toHostname(env.VERCEL_PROJECT_PRODUCTION_URL ?? ""),
  ];

  const primaryHost = toHostname(env.BETTER_AUTH_URL ?? "");
  const includeWildcardVercel =
    parseBoolean(env.BETTER_AUTH_ENABLE_VERCEL_PREVIEW, false) || env.VERCEL_ENV === "preview";

  return unique([
    ...localhostHosts,
    ...explicitHosts,
    ...vercelHosts,
    primaryHost,
    includeWildcardVercel ? "*.vercel.app" : null,
  ]);
}

function getTrustedOrigins(env: RawEnv): string[] {
  const configuredOrigins = parseCsv(env.BETTER_AUTH_TRUSTED_ORIGINS).map((origin) => toOrigin(origin));

  const localOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];
  const primaryOrigin = toOrigin(env.BETTER_AUTH_URL ?? "");
  const vercelOrigins = [
    toOrigin(env.VERCEL_URL ?? ""),
    toOrigin(env.VERCEL_BRANCH_URL ?? ""),
    toOrigin(env.VERCEL_PROJECT_PRODUCTION_URL ?? ""),
  ];

  return unique([...localOrigins, primaryOrigin, ...vercelOrigins, ...configuredOrigins]);
}

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const firstIssue = parsedEnv.error.issues[0];
  const key = typeof firstIssue?.path?.[0] === "string" ? firstIssue.path[0] : "unknown";
  throw new Error(`Invalid environment configuration: ${key} ${firstIssue?.message ?? "is invalid"}`);
}

const rawEnv = parsedEnv.data;

const databaseUrl = rawEnv.DATABASE_URL ?? rawEnv.POSTGRES_PRISMA_URL;

if (!databaseUrl) {
  throw new Error("Invalid environment configuration: DATABASE_URL is required (or provide POSTGRES_PRISMA_URL from Vercel Postgres).");
}

const directDatabaseUrl = rawEnv.DIRECT_DATABASE_URL ?? rawEnv.POSTGRES_URL_NON_POOLING ?? databaseUrl;

const runtimeEnv = {
  ...rawEnv,
  DATABASE_URL: databaseUrl,
  DIRECT_DATABASE_URL: directDatabaseUrl,
};

if (runtimeEnv.NODE_ENV === "production" && runtimeEnv.BETTER_AUTH_SECRET.length < 32) {
  throw new Error("BETTER_AUTH_SECRET must be at least 32 characters in production.");
}

export const appEnv = {
  ...runtimeEnv,
  betterAuthAllowedHosts: getAuthAllowedHosts(runtimeEnv),
  betterAuthTrustedOrigins: getTrustedOrigins(runtimeEnv),
} as const;

export type AppEnv = typeof appEnv;
