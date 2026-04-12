import "dotenv/config";
import { defineConfig } from "prisma/config";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for Prisma CLI commands.");
}

export default defineConfig({
  engine: "classic",
  schema: "prisma/schema.prisma",
  datasource: {
    url: databaseUrl,
    directUrl: process.env.DIRECT_DATABASE_URL ?? databaseUrl,
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
