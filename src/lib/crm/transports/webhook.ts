import type { CrmLead, CrmSendResult, CrmTransport } from "../types";

/**
 * Posts to the inbound webhook URL generated in MedicarePRO under
 * Settings -> Integrations. That URL is displayed exactly once and cannot be
 * retrieved afterwards, so it is read from SSM Parameter Store as a
 * SecureString rather than from the repo.
 *
 * MedicarePRO publishes no schema for the endpoint, so the field names in
 * `toPayload` are a guess mapped from the lead shape.
 */
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

      // 4xx (except 408/429) means the request itself is wrong — retrying it
      // unchanged will fail forever, so surface it instead of looping.
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
