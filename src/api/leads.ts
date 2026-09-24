import { leadInputSchema } from "@/lib/leads/schema";
import { captureLead } from "@/lib/leads/service";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { clientIp } from "@/lib/security/request";
import { getBusinessIdentity } from "@/lib/business";
import { sendLeadConfirmation, sendLeadNotification } from "@/lib/email";

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = leadInputSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Validation failed",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  const input = parsed.data;
  const ip = clientIp(req);

  // Honeypot hit: accept silently so the bot learns nothing.
  if (input.company) return Response.json({ ok: true }, { status: 202 });

  if (!(await verifyTurnstile(input.turnstileToken, ip))) {
    return Response.json(
      { error: "Could not verify that you are human. Please try again." },
      { status: 403 },
    );
  }

  const business = await getBusinessIdentity();

  const { leadId, suppressed } = await captureLead(input, {
    ip,
    userAgent: req.headers.get("user-agent") ?? undefined,
    business,
  });

  // Notify the agency and acknowledge to the visitor. The lead is already
  // committed, so email failures are logged and swallowed rather than turning
  // a saved lead into an error page.
  const summary = {
    name: input.name,
    email: input.email,
    phone: input.phone,
    zip: input.zip,
    interest: input.interest,
    message: input.message,
    sourcePath: input.sourcePath,
  };
  await Promise.allSettled([
    sendLeadNotification(summary, business),
    // A suppressed contact asked not to hear from us; do not email them.
    suppressed ? Promise.resolve() : sendLeadConfirmation(summary, business),
  ]);

  // Delivery to MedicarePRO is deliberately not awaited here — it is queued in
  // the same transaction as the lead and drained by /api/jobs/outbox. A
  // suppressed submission is stored but never queued; the visitor still gets a
  // success response, since telling them they are on a suppression list would
  // leak information about other people's records.
  return Response.json({ ok: true, leadId, suppressed }, { status: 201 });
}
