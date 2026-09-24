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

/**
 * App tables owned by the site, kept separate from Payload's content tables.
 * Payload manages its own schema through its migrations; these are managed by
 * drizzle-kit against the same database.
 */

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
    // The text and version as shown, not a boolean — a flag cannot reproduce
    // what the visitor actually read.
    consentedAt: timestamp("consented_at", { withTimezone: true }),
    consentText: text("consent_text"),
    consentVersion: text("consent_version"),
    userAgent: text("user_agent"),
    // Hashed, never raw — the raw address is not needed after rate limiting.
    ipHash: text("ip_hash"),
    // Read by the purge job to decide what is eligible for deletion.
    retentionUntil: timestamp("retention_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("leads_created_at_idx").on(t.createdAt)],
);

// Kept out of the CRM path and out of the marketing-opt-out purge; the two
// write paths are separate for that reason.
export const soaSubmissions = pgTable(
  "soa_submissions",
  {
    id: serial("id").primaryKey(),
    beneficiaryName: text("beneficiary_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    /** Values from SOA_PRODUCT_TYPES. */
    productTypes: jsonb("product_types").$type<string[]>().notNull(),
    agentName: text("agent_name"),
    /** Typed signature plus the date the beneficiary signed. */
    signature: text("signature").notNull(),
    signedAt: timestamp("signed_at", { withTimezone: true }).notNull(),
    /** When the sales meeting is expected to occur. */
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

// Rows here survive a lead purge: a suppression that vanished with the lead
// would stop suppressing anything.
export const dncRequests = pgTable(
  "dnc_requests",
  {
    id: serial("id").primaryKey(),
    email: text("email"),
    phone: text("phone"),
    /** revoke-contact | do-not-sell | delete-my-data */
    requestType: text("request_type").notNull(),
    notes: text("notes"),
    /** Set when a human has actioned it in MedicarePRO and any dialer. */
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

/**
 * Transactional outbox. A lead row and its outbox row are written in one
 * transaction, so a MedicarePRO outage can delay delivery but never lose a
 * lead. Drained by /api/jobs/outbox.
 */
export const crmOutbox = pgTable(
  "crm_outbox",
  {
    id: serial("id").primaryKey(),
    leadId: integer("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    // Idempotency key sent to the CRM so a retry cannot duplicate a contact.
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
