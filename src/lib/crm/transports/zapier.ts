import type { CrmLead, CrmSendResult, CrmTransport } from "../types";

/**
 * Fallback path: post to a Zapier catch-hook whose Zap runs the MedicarePRO
 * "Add Lead" action (MPCRM Zapier app, version 1), authenticated in Zapier
 * with the API key issued by support@medicareprocrm.com.
 *
 * Slower and less direct than the webhook transport, but it works without a
 * generated CRM webhook URL, which is useful if that URL is ever lost — it
 * cannot be re-displayed once dismissed.
 */
export class ZapierTransport implements CrmTransport {
  readonly name = "zapier";

  constructor(
    private readonly hookUrl: string,
    private readonly timeoutMs = 10_000,
  ) {}

  async send(lead: CrmLead, idempotencyKey: string): Promise<CrmSendResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(this.hookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...lead, idempotency_key: idempotencyKey }),
        signal: controller.signal,
      });

      if (res.ok) return { ok: true, reference: idempotencyKey };

      const retryable =
        res.status >= 500 || res.status === 408 || res.status === 429;
      return { ok: false, error: `HTTP ${res.status}`, retryable };
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
