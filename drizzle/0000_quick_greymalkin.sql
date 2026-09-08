CREATE TYPE "public"."crm_outbox_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "crm_outbox" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"idempotency_key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "crm_outbox_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_outbox_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "dnc_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text,
	"phone" text,
	"request_type" text NOT NULL,
	"notes" text,
	"handled_at" timestamp with time zone,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"zip" text,
	"interest" text,
	"message" text,
	"source_path" text,
	"utm" jsonb,
	"consented_at" timestamp with time zone,
	"consent_text" text,
	"consent_version" text,
	"user_agent" text,
	"ip_hash" text,
	"retention_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "soa_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"beneficiary_name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"product_types" jsonb NOT NULL,
	"agent_name" text,
	"signature" text NOT NULL,
	"signed_at" timestamp with time zone NOT NULL,
	"appointment_at" timestamp with time zone,
	"attestation_text" text NOT NULL,
	"attestation_version" text NOT NULL,
	"ip_hash" text,
	"user_agent" text,
	"retention_until" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_outbox" ADD CONSTRAINT "crm_outbox_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crm_outbox_claim_idx" ON "crm_outbox" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "dnc_email_idx" ON "dnc_requests" USING btree ("email");--> statement-breakpoint
CREATE INDEX "dnc_phone_idx" ON "dnc_requests" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "leads_created_at_idx" ON "leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "soa_created_at_idx" ON "soa_submissions" USING btree ("created_at");