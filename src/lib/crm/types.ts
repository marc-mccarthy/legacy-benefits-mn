export type CrmLead = {
  name: string;
  email: string;
  phone?: string;
  zip?: string;
  interest?: string;
  message?: string;
  sourcePath?: string;
  utm?: Record<string, string>;
};

export type CrmSendResult =
  | { ok: true; reference?: string }
  | { ok: false; error: string; retryable: boolean };

export interface CrmTransport {
  readonly name: string;
  send(lead: CrmLead, idempotencyKey: string): Promise<CrmSendResult>;
}
