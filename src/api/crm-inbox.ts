import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { bearerMatches } from "@/lib/security/bearer";

const LIST_LIMIT = 50;

type InboxLead = Record<string, unknown>;
type InboxRequest = { lead: InboxLead; key: string };

function notFound() {
  return Response.json({ error: "Not found" }, { status: 404 });
}

function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

function invalid() {
  return Response.json(
    { ok: false, retryable: false, error: "Invalid lead request" },
    { status: 400 },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isValidLead(lead: unknown): lead is InboxLead {
  if (!isRecord(lead)) return false;
  const { name, email, consentVersion, consentedAt } = lead;
  return (
    isText(name) &&
    isText(email) &&
    isText(consentVersion) &&
    isText(consentedAt) &&
    !Number.isNaN(Date.parse(consentedAt))
  );
}

function parseRequest(raw: unknown): InboxRequest | undefined {
  if (!isRecord(raw)) return undefined;
  const { lead, idempotencyKey, attempt } = raw;
  if (!isValidLead(lead) || !isText(idempotencyKey)) return undefined;
  if (!Number.isInteger(attempt) || (attempt as number) < 1) return undefined;
  return { lead, key: idempotencyKey };
}

async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

async function store({ lead, key }: InboxRequest) {
  const { crmInbox } = schema;
  const inserted = await db
    .insert(crmInbox)
    .values({ idempotencyKey: key, payload: lead })
    .onConflictDoNothing({ target: crmInbox.idempotencyKey })
    .returning({ id: crmInbox.id });
  if (inserted[0]) return { id: inserted[0].id, outcome: "created" as const };

  const [existing] = await db
    .select({ id: crmInbox.id })
    .from(crmInbox)
    .where(eq(crmInbox.idempotencyKey, key))
    .limit(1);
  return { id: existing.id, outcome: "existing" as const };
}

export async function POST(req: Request) {
  if (env("CRM_INBOX_ENABLED") !== "true") return notFound();

  const secret = env("CRM_RELAY_SECRET");
  if (!secret) {
    return Response.json(
      { error: "CRM_RELAY_SECRET is not configured" },
      { status: 503 },
    );
  }
  if (!bearerMatches(req, secret)) return unauthorized();

  const parsed = parseRequest(await readJson(req));
  if (!parsed) return invalid();

  const { id, outcome } = await store(parsed);
  return Response.json({ ok: true, indId: id, outcome });
}

export async function GET(req: Request) {
  if (env("CRM_INBOX_ENABLED") !== "true") return notFound();

  const token = env("OUTBOX_JOB_TOKEN");
  if (!token) {
    return Response.json(
      { error: "OUTBOX_JOB_TOKEN is not configured" },
      { status: 503 },
    );
  }
  if (!bearerMatches(req, token)) return unauthorized();

  const { crmInbox } = schema;
  const items = await db
    .select()
    .from(crmInbox)
    .orderBy(desc(crmInbox.id))
    .limit(LIST_LIMIT);
  return Response.json({ items });
}
