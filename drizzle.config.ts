import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  tablesFilter: [
    "leads",
    "crm_outbox",
    "crm_inbox",
    "soa_submissions",
    "dnc_requests",
  ],
});
