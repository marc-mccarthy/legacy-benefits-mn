import { defineConfig } from "drizzle-kit";

/**
 * Drizzle owns only the app tables (leads, crm_outbox) in src/lib/db/schema.ts.
 * Payload manages its own content tables through its own migrations, in the
 * same database — the two must never be pointed at each other's tables.
 */
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  tablesFilter: ["leads", "crm_outbox", "soa_submissions", "dnc_requests"],
});
