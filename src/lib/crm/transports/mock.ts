import type { CrmLead, CrmSendResult, CrmTransport } from "../types";

export class MockTransport implements CrmTransport {
  readonly name = "mock";
  readonly sent: Array<{ lead: CrmLead; idempotencyKey: string }> = [];

  constructor(
    private readonly behaviour: "ok" | "retryable" | "fatal" = "ok",
  ) {}

  async send(lead: CrmLead, idempotencyKey: string): Promise<CrmSendResult> {
    this.sent.push({ lead, idempotencyKey });
    if (this.behaviour === "retryable")
      return { ok: false, error: "simulated upstream 503", retryable: true };
    if (this.behaviour === "fatal")
      return {
        ok: false,
        error: "simulated invalid payload",
        retryable: false,
      };
    return { ok: true, reference: `mock-${idempotencyKey}` };
  }
}
