import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

function readRepoFile(relativePath: string) {
  const absolutePath = path.resolve(process.cwd(), relativePath);
  return readFileSync(absolutePath, "utf8");
}

describe("multi-activity safety invariants", () => {
  it("migration backfills legacy groups and sessions to CARD before NOT NULL", () => {
    const migration = readRepoFile("prisma/migrations/20260414123000_multi_activity_foundation/migration.sql");

    assert.match(migration, /UPDATE\s+"Group"\s*[\s\S]*SET\s+"activityType"\s*=\s*'CARD'[\s\S]*WHERE\s+"activityType"\s+IS\s+NULL;/m);
    assert.match(migration, /UPDATE\s+"GameSession"\s*[\s\S]*SET\s+"activityType"\s*=\s*'CARD'[\s\S]*WHERE\s+"activityType"\s+IS\s+NULL;/m);
    assert.match(migration, /ALTER TABLE\s+"Group"[\s\S]*ALTER COLUMN\s+"activityType"\s+SET NOT NULL[\s\S]*ALTER COLUMN\s+"activityType"\s+SET DEFAULT\s+'CARD';/m);
    assert.match(migration, /ALTER TABLE\s+"GameSession"[\s\S]*ALTER COLUMN\s+"activityType"\s+SET NOT NULL[\s\S]*ALTER COLUMN\s+"activityType"\s+SET DEFAULT\s+'CARD';/m);
  });

  it("schema defaults preserve legacy CARD behavior", () => {
    const schema = readRepoFile("prisma/schema.prisma");

    assert.match(schema, /model\s+Group\s*\{[\s\S]*activityType\s+ActivityType\s+@default\(CARD\)/m);
    assert.match(schema, /model\s+GameSession\s*\{[\s\S]*activityType\s+ActivityType\s+@default\(CARD\)/m);
  });

  it("online export remains card-only", () => {
    const onlineDb = readRepoFile("lib/db/online.ts");

    assert.match(onlineDb, /createGameSession\([\s\S]*activityType:\s*"CARD"/m);
  });
});
