CREATE TABLE "crm_inbox" (
	"id" serial PRIMARY KEY NOT NULL,
	"idempotency_key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_inbox_idempotency_key_unique" UNIQUE("idempotency_key")
);
