import { env } from "@/lib/env";
import { countFailed, drainOutbox } from "@/lib/leads/outbox";
import { bearerMatches } from "@/lib/security/bearer";

export async function POST(req: Request) {
  const expected = env("OUTBOX_JOB_TOKEN");
  if (!expected) {
    return Response.json(
      { error: "OUTBOX_JOB_TOKEN is not configured" },
      { status: 503 },
    );
  }

  if (!bearerMatches(req, expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await drainOutbox();
  const failed = await countFailed();

  return Response.json({ ...result, failedTotal: failed });
}
