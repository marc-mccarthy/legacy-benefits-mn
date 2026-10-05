import { timingSafeEqual } from "crypto";
import { env } from "@/lib/env";
import { countFailed, drainOutbox } from "@/lib/leads/outbox";

function tokenMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const expected = env("OUTBOX_JOB_TOKEN");
  if (!expected) {
    return Response.json(
      { error: "OUTBOX_JOB_TOKEN is not configured" },
      { status: 503 },
    );
  }

  const header = req.headers.get("authorization");
  const provided = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!tokenMatches(provided, expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await drainOutbox();
  const failed = await countFailed();

  return Response.json({ ...result, failedTotal: failed });
}
