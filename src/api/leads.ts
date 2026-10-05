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
    suppressed ? Promise.resolve() : sendLeadConfirmation(summary, business),
  ]);

  return Response.json({ ok: true, leadId, suppressed }, { status: 201 });
}
