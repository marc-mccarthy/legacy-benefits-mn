import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const migrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "drizzle",
);

const rootCause = (error) => {
  let current = error;
  while (current?.cause instanceof Error) current = current.cause;
  return current;
};

const describe = (error) =>
  [error?.code, error?.message].filter(Boolean).join(": ") || String(error);

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

export const handler = async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const pool = new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 60_000,
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
