import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const outboxStatus = pgEnum("crm_outbox_status", [
  "pending",
  "sent",
  "failed",
]);

export const leads = pgTable(
  "leads",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    zip: text("zip"),
    interest: text("interest"),
    message: text("message"),
    sourcePath: text("source_path"),
    utm: jsonb("utm").$type<Record<string, string>>(),
    consentedAt: timestamp("consented_at", { withTimezone: true }),
    consentText: text("consent_text"),
    consentVersion: text("consent_version"),
    userAgent: text("user_agent"),
    ipHash: text("ip_hash"),
    retentionUntil: timestamp("retention_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("leads_created_at_idx").on(t.createdAt)],
);

export const soaSubmissions = pgTable(
  "soa_submissions",
  {
    id: serial("id").primaryKey(),
    beneficiaryName: text("beneficiary_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    productTypes: jsonb("product_types").$type<string[]>().notNull(),
    agentName: text("agent_name"),
    signature: text("signature").notNull(),
    signedAt: timestamp("signed_at", { withTimezone: true }).notNull(),
    appointmentAt: timestamp("appointment_at", { withTimezone: true }),
    attestationText: text("attestation_text").notNull(),
    attestationVersion: text("attestation_version").notNull(),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    retentionUntil: timestamp("retention_until", {
      withTimezone: true,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("soa_created_at_idx").on(t.createdAt)],
);

export const dncRequests = pgTable(
  "dnc_requests",
  {
    id: serial("id").primaryKey(),
    email: text("email"),
    phone: text("phone"),
    requestType: text("request_type").notNull(),
    notes: text("notes"),
    handledAt: timestamp("handled_at", { withTimezone: true }),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("dnc_email_idx").on(t.email),
    index("dnc_phone_idx").on(t.phone),
  ],
);

export const crmOutbox = pgTable(
  "crm_outbox",
  {
    id: serial("id").primaryKey(),
    leadId: integer("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: outboxStatus("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("crm_outbox_claim_idx").on(t.status, t.nextAttemptAt)],
);

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type OutboxRow = typeof crmOutbox.$inferSelect;
export type SoaSubmission = typeof soaSubmissions.$inferSelect;
export type DncRequest = typeof dncRequests.$inferSelect;
