import { createHash } from "node:crypto";
import type { CrmLead, CrmSendResult, CrmTransport } from "../types";

type RelayReply = { ok?: unknown; indId?: unknown; error?: unknown };

function parseReply(text: string): RelayReply | undefined {
  try {
    const data: unknown = JSON.parse(text);
    return typeof data === "object" && data !== null
      ? (data as RelayReply)
      : undefined;
  } catch {
    return undefined;
  }
}

export class RelayTransport implements CrmTransport {
  readonly name = "relay";
  private readonly url: string;

  constructor(
    baseUrl: string,
    private readonly secret: string,
    private readonly timeoutMs = 10_000,
  ) {
    this.url = `${baseUrl.replace(/\/+$/, "")}/lead`;
  }

  async send(
    lead: CrmLead,
    idempotencyKey: string,
    attempt: number,
  ): Promise<CrmSendResult> {
    const body = JSON.stringify({ lead, idempotencyKey, attempt });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(this.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.secret}`,
          "x-relay-secret": this.secret,
          "x-amz-content-sha256": createHash("sha256")
            .update(body)
            .digest("hex"),
        },
        body,
        redirect: "error",
        signal: controller.signal,
      });
      const text = await res.text();

      if (!res.ok) {
        return {
          ok: false,
          error: `HTTP ${res.status}: ${text.slice(0, 200)}`,
          retryable:
            res.status >= 500 || res.status === 408 || res.status === 429,
        };
      }

      const reply = parseReply(text);
      if (reply?.ok === true) {
        return typeof reply.indId === "number"
          ? { ok: true, reference: String(reply.indId) }
          : { ok: true };
      }
      return {
        ok: false,
        retryable: false,
        error:
          typeof reply?.error === "string"
            ? reply.error
            : `Unreadable relay reply: ${text.slice(0, 200)}`,
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
