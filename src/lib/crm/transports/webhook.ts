import type { CrmLead, CrmSendResult, CrmTransport } from "../types";

export class WebhookTransport implements CrmTransport {
  readonly name = "webhook";

  constructor(
    private readonly url: string,
    private readonly timeoutMs = 10_000,
  ) {}

  private toPayload(lead: CrmLead) {
    const [firstName, ...rest] = lead.name.trim().split(/\s+/);
    return {
      first_name: firstName,
      last_name: rest.join(" ") || undefined,
      email: lead.email,
      phone: lead.phone,
      zip: lead.zip,
      notes: [lead.interest && `Interest: ${lead.interest}`, lead.message]
        .filter(Boolean)
        .join("\n\n"),
      source: "website",
      source_path: lead.sourcePath,
      ...lead.utm,
    };
  }

  async send(lead: CrmLead, idempotencyKey: string): Promise<CrmSendResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(this.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(this.toPayload(lead)),
        signal: controller.signal,
      });

      if (res.ok) return { ok: true, reference: idempotencyKey };

      const retryable =
        res.status >= 500 || res.status === 408 || res.status === 429;
      return {
        ok: false,
        error: `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`,
        retryable,
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "network error",
        retryable: true,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
