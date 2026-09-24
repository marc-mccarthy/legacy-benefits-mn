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

// drizzle wraps every query failure in a DrizzleQueryError whose message is only
// the SQL it attempted; the driver's error rides along as `cause`. Lambda
// serializes errorType/errorMessage/trace and drops cause, so without unwrapping
// here CI sees "Failed query: CREATE SCHEMA ..." and no reason for it.
const rootCause = (error) => {
  let current = error;
  while (current?.cause instanceof Error) current = current.cause;
  return current;
};

// SQLSTATE and message go in the thrown message because errorMessage is the only
// field that reaches response.json, which is all the workflow prints.
const describe = (error) =>
  [error?.code, error?.message].filter(Boolean).join(": ") || String(error);

// The password is in the URL, so the target is logged field by field rather than
// whole. A wrong host or database is the kind of thing this needs to show.
const target = (connectionString) => {
  try {
    const url = new URL(connectionString);
    return {
      host: url.hostname,
      port: url.port,
      database: url.pathname.slice(1),
      user: url.username,
    };
  } catch {
    return { parse: "DATABASE_URL is not a valid URL" };
  }
};

// Throws rather than returning a status, so Lambda sets FunctionError. Resolving
// with a failure field would exit 0 at the CLI and hide it from CI.
export const handler = async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  // Without a bound, pg waits forever on an unreachable host and the run reads
  // as a Lambda timeout instead of a connection failure.
  const pool = new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 10_000,
  });
  try {
    await migrate(drizzle(pool), { migrationsFolder });
  } catch (error) {
    const cause = rootCause(error);
    console.error("migration failed", {
      target: target(connectionString),
      wrapper: error?.message,
      name: cause?.name,
      message: cause?.message,
      code: cause?.code,
      severity: cause?.severity,
      detail: cause?.detail,
      hint: cause?.hint,
      routine: cause?.routine,
      errno: cause?.errno,
      syscall: cause?.syscall,
      address: cause?.address,
      port: cause?.port,
    });
    throw new Error(`migration failed: ${describe(cause)}`, { cause: error });
  } finally {
    await pool.end();
  }

  return { migrated: true };
};
