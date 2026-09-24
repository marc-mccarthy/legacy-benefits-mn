import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

// readMigrationFiles concatenates this onto "meta/_journal.json" and hands the
// result straight to fs, so a relative path would resolve against cwd rather
// than the package.
const migrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "drizzle",
);

// Throws rather than returning a status, so Lambda sets FunctionError. Resolving
// with a failure field would exit 0 at the CLI and hide it from CI.
export const handler = async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const pool = new Pool({ connectionString, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder });
  } finally {
    await pool.end();
  }

  return { migrated: true };
};
