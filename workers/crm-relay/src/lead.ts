import { individualForm, noteBody, type RelayLead } from "./map";
import { isRecord, makeCall, RelayError, type Call } from "./medicarepro";

type Outcome = "created" | "existing" | "found";

type LeadRequest = { lead: RelayLead; key: string; attempt: number };

export type LeadReply = { status: number; body: Record<string, unknown> };

const OPTIONAL_TEXT_FIELDS = [
  "phone",
  "zip",
  "interest",
  "message",
  "sourcePath",
] as const;
const EXISTING_FLAGS: unknown[] = [true, 1, "1", "true"];

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isStringMap(value: unknown): value is Record<string, string> {
  return (
    isRecord(value) && Object.values(value).every((v) => typeof v === "string")
  );
}

function parseLead(raw: unknown): RelayLead | undefined {
  if (!isRecord(raw)) return undefined;
  const { name, email, consentedAt, consentVersion, utm } = raw;
  if (!isText(name) || !isText(email) || !isText(consentVersion)) {
    return undefined;
  }
  if (!isText(consentedAt) || Number.isNaN(Date.parse(consentedAt))) {
    return undefined;
  }
  if (utm !== undefined && !isStringMap(utm)) return undefined;
  const lead: RelayLead = { name, email, consentedAt, consentVersion };
  if (utm !== undefined) lead.utm = utm;
  for (const field of OPTIONAL_TEXT_FIELDS) {
    const value = raw[field];
    if (value === undefined) continue;
    if (typeof value !== "string") return undefined;
    lead[field] = value;
  }
  return lead;
}

function parseRequest(raw: unknown): LeadRequest | undefined {
  if (!isRecord(raw)) return undefined;
  const lead = parseLead(raw.lead);
  const { idempotencyKey, attempt } = raw;
  if (!lead || !isText(idempotencyKey)) return undefined;
  if (
    typeof attempt !== "number" ||
    !Number.isInteger(attempt) ||
    attempt < 1
  ) {
    return undefined;
  }
  return { lead, key: idempotencyKey, attempt };
}

function indIdOf(data: unknown): number | undefined {
  if (!isRecord(data)) return undefined;
  const { indId } = data;
  return typeof indId === "number" && Number.isSafeInteger(indId)
    ? indId
    : undefined;
}

function requireIndId(data: unknown, template: string): number {
  const indId = indIdOf(data);
  if (indId === undefined) {
    throw new RelayError(`response missing indId on POST ${template}`, true);
  }
  return indId;
}

function isExisting(data: unknown): boolean {
  return isRecord(data) && EXISTING_FLAGS.includes(data.is_existing);
}

async function findByExternalId(
  call: Call,
  key: string,
): Promise<number | undefined> {
  try {
    const { data } = await call({
      method: "GET",
      path: `/individuals/by-externalid?externalId=${encodeURIComponent(key)}`,
      template: "/individuals/by-externalid",
    });
    return indIdOf(data);
  } catch (error) {
    if (error instanceof RelayError && error.status === 404) return undefined;
    throw error;
  }
}

async function hasNoteWithRef(
  call: Call,
  indId: number,
  key: string,
): Promise<boolean> {
  const { data } = await call({
    method: "GET",
    path: `/individuals/${indId}/notes?limit=100`,
    template: "/individuals/{id}/notes",
  });
  const notes = isRecord(data) && Array.isArray(data.data) ? data.data : [];
  return notes.some(
    (n) =>
      isRecord(n) &&
      typeof n.indNoteBody === "string" &&
      n.indNoteBody.includes(`Ref: ${key}`),
  );
}

async function recordRepeat(
  call: Call,
  indId: number,
  { lead, key }: LeadRequest,
): Promise<void> {
  await call({
    method: "POST",
    path: `/individuals/${indId}/lead`,
    template: "/individuals/{id}/lead",
  });
  if (await hasNoteWithRef(call, indId, key)) return;
  await call({
    method: "POST",
    path: `/individuals/${indId}/notes`,
    template: "/individuals/{id}/notes",
    body: { indNoteType: "note", indNoteBody: noteBody(lead, key, true) },
  });
}

async function deliver(
  call: Call,
  req: LeadRequest,
): Promise<{ indId: number; outcome: Outcome }> {
  if (req.attempt > 1) {
    const found = await findByExternalId(call, req.key);
    if (found !== undefined) return { indId: found, outcome: "found" };
  }
  const { data } = await call({
    method: "POST",
    path: "/individual-form",
    template: "/individual-form",
    body: individualForm(req.lead, req.key),
  });
  const indId = requireIndId(data, "/individual-form");
  if (!isExisting(data)) return { indId, outcome: "created" };
  await recordRepeat(call, indId, req);
  return { indId, outcome: "existing" };
}

function failure(status: number, retryable: boolean, error: string): LeadReply {
  return { status, body: { ok: false, retryable, error } };
}

export async function handleLeadBody(
  raw: unknown,
  token: string,
): Promise<LeadReply> {
  const req = parseRequest(raw);
  if (!req) return failure(400, false, "Invalid lead request");
  try {
    const result = await deliver(makeCall(token), req);
    return { status: 200, body: { ok: true, ...result } };
  } catch (error) {
    if (!(error instanceof RelayError)) throw error;
    return failure(error.retryable ? 502 : 422, error.retryable, error.message);
  }
}
