import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { countFailed, drainOutbox } from "@/lib/leads/outbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Constant-time compare so the token cannot be probed byte by byte. */
function tokenMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Invoked on a schedule by EventBridge; never exposed to visitors. */
export async function POST(req: Request) {
  // Read through env(), which trims: HTTP strips whitespace from header
  // values in transit, so a secret stored with a trailing newline would
  // compare "tok" against "tok\n" and 401 forever, silently halting all CRM
  // delivery with no signal beyond a flat sent count.
  const expected = env("OUTBOX_JOB_TOKEN");
  if (!expected) {
    return NextResponse.json(
      { error: "OUTBOX_JOB_TOKEN is not configured" },
      { status: 503 },
    );
  }

  const header = req.headers.get("authorization");
  const provided = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!tokenMatches(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await drainOutbox();
  const failed = await countFailed();

  return NextResponse.json({ ...result, failedTotal: failed });
}
