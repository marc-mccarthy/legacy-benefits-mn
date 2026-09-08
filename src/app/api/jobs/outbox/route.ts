import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
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
  const expected = process.env["OUTBOX_JOB_TOKEN"];
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
