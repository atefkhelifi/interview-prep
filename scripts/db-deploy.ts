// Applies prisma/migrations to a hosted Turso database (Prisma Migrate can't connect to Turso).
// Runs in the Vercel build; does nothing for a local file: database (use `npm run db:migrate`).
import "dotenv/config";
import { createClient } from "@libsql/client";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const url = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL ?? "";

async function main() {
  if (!url.startsWith("libsql://")) {
    console.log("db-deploy: not a Turso database, skipping.");
    return;
  }
  const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  await db.execute("CREATE TABLE IF NOT EXISTS _applied_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
  const applied = new Set((await db.execute("SELECT name FROM _applied_migrations")).rows.map((r) => String(r.name)));

  const dir = path.join(process.cwd(), "prisma", "migrations");
  const names = (await readdir(dir, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  for (const name of names) {
    if (applied.has(name)) continue;
    const sql = await readFile(path.join(dir, name, "migration.sql"), "utf8");
    // One transaction per migration, recorded together with its SQL.
    await db.executeMultiple(
      `BEGIN;\n${sql}\nINSERT INTO _applied_migrations (name, applied_at) VALUES ('${name}', datetime('now'));\nCOMMIT;`,
    );
    console.log(`db-deploy: applied ${name}`);
  }
  console.log(`db-deploy: up to date (${names.length} migrations).`);
  db.close();
}

main().catch((e) => {
  console.error("db-deploy failed:", e);
  process.exit(1);
});
