import "dotenv/config";
import { defineConfig } from "prisma/config";

const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_PRISMA_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required for Prisma CLI commands (or provide POSTGRES_PRISMA_URL from Vercel Postgres).",
  );
}

const directDatabaseUrl =
  process.env.DIRECT_DATABASE_URL ?? process.env.POSTGRES_URL_NON_POOLING ?? databaseUrl;

export default defineConfig({
  engine: "classic",
  schema: "prisma/schema.prisma",
  datasource: {
    url: databaseUrl,
    directUrl: directDatabaseUrl,
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
