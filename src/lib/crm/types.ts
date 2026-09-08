/**
 * Port for pushing a captured lead into MedicarePRO.
 *
 * MedicarePRO exposes no general-purpose REST API. The two supported inbound
 * paths are a one-time-display webhook URL (CRM -> Settings -> Integrations)
 * and the Zapier "Add Lead" action authenticated with a key issued by MPCRM
 * support. Both are modelled as transports behind this port so the site can be
 * built and tested before either credential exists, and so switching between
 * them is a config change rather than a code change.
 */

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
  /** `retryable: false` means the payload itself is bad — do not keep retrying. */
  | { ok: false; error: string; retryable: boolean };

export interface CrmTransport {
  readonly name: string;
  send(lead: CrmLead, idempotencyKey: string): Promise<CrmSendResult>;
}
