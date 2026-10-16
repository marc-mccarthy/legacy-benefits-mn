# MedicarePRO CRM Leads

Created 2026-10-16. Last updated 2026-10-16.

## Goal

Each contact form lead goes into Nate's MedicarePRO CRM as a contact plus a lead, alongside the
email that already goes out. A repeat visitor gets a dated note on their existing contact, with
everything they entered. Leads suppressed by a Do Not Contact request never reach the CRM.

Out of scope: the Scope of Appointment form, and changes to the MCP server.

## Verified facts (live, 2026-10-15, Nate's token)

- `POST https://www.medicareproapp.com/api/v1/individual-form` with `Authorization: Bearer <token>`
  creates the contact and, with `isLead: 1`, the lead. The lead lands as "Working it" / open,
  which is Nate's default for new leads.
- `indSource: 9` is Nate's built-in "Website" source, shown in the Source field.
- `indStatus` must be sent as `"Active Prospect"`. The default is `"Active Client"`, which is
  wrong.
- Duplicates: a resubmission of the same person returns 200 with the **existing** contact,
  `is_existing`, and `matched_on: "phone_name"`. It creates nothing, keeps the original
  `externalId`, and **drops `indNoteBody` silently**.
- `POST /individuals/{id}/notes` `{"indNoteType":"note","indNoteBody":"..."}` adds a note.
- `GET /individuals/by-externalid?externalId=<key>` finds a contact by our key.
- `DELETE /individuals/{id}` is a soft delete. The duplicate check ignores soft-deleted contacts:
  after the 2026-10-15 TEST contact was deleted, the same person created a new one (verified
  2026-10-16).
- Relay live, 2026-10-16: `https://legacy-benefits-crm-relay.nbest-fab.workers.dev` (URL and
  secret in `op://Secrets/legacybenefitsmn`, fields `CRM_RELAY_URL`, `CRM_RELAY_SECRET`). The fixed
  TEST person is contact 3787559: created once, a same-key resend added no note, and a new
  submission added the "filled out again" note.
- MedicarePRO has no IPv6 address. The website Lambda has IPv6-only egress
  (`infra/main.tf:71-80`, no NAT), so it cannot call MedicarePRO directly. Cloudflare Workers
  are reachable over IPv6 (`*.workers.dev` has AAAA records) and can reach MedicarePRO; the MCP
  server does it today.
- The MCP server cannot take website writes: every write waits for a human click
  (`medicarepro-crm-mcp-server/README.md:309-378`).

## Design

```
Visitor → Lambda /api/leads → Aurora (lead + crm_outbox row)
                            ├→ SES emails (existing)
                            └→ fast path: claim row → RelayTransport ─┐
EventBridge every 5 min → Lambda /api/jobs/outbox → drain ────────────┤
                                                                     ▼
                     crm-relay Worker (Nate's Cloudflare, workers.dev, IPv6)
                                                                     ▼
                                                     MedicarePRO API (IPv4)
```

### crm-relay Worker (new, `workers/crm-relay/` in this repo)

- One route: `POST /lead`. Body: the outbox payload plus `idempotencyKey` and `attempt`.
  A `GET /health` route returns 200 with no upstream call.
- Auth: `Authorization: Bearer <RELAY_SECRET>`, compared in constant time. Anything else is 401.
- The relay holds the MedicarePRO token as a Worker secret. The Lambda never sees it.
- The relay owns the whole CRM flow, so a leaked relay secret can only create website leads.
  It cannot read contacts. This is my call, over a thin proxy that would also expose note
  reads.
- `redirect: "manual"`; any 3xx is refused so the bearer never leaves MedicarePRO.
- Flow per call:

| Step | Call                                                         | Next                               |
| ---- | ------------------------------------------------------------ | ---------------------------------- |
| 1    | Only when `attempt > 1`: `GET /individuals/by-externalid`    | found → done                       |
| 2    | `POST /individual-form`                                      | new → done; `is_existing` → step 3 |
| 3    | `POST /individuals/{id}/lead` (reactivates a dismissed lead) | step 4                             |
| 4    | `GET /individuals/{id}/notes`, look for `Ref: <key>`         | found → done; else step 5          |
| 5    | `POST /individuals/{id}/notes` with the repeat note          | done                               |

- Responses to the Lambda: `200 {ok:true, indId}`, or `{ok:false, retryable, error}`. Error
  text holds no token and no PII.
- Retryable: network, timeout, 408, 429, 5xx, 401/403 (a token fix recovers within the backoff
  window), and a 200 with no `indId`. Not retryable: 400, 422, 404 on writes, other 4xx, 3xx.

### Field mapping

| Form                                                                    | MedicarePRO                                                                                    |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| constants                                                               | `indSource: 9`, `isLead: 1`, `indStatus: "Active Prospect"`                                    |
| outbox `idempotencyKey`                                                 | `externalId`                                                                                   |
| name                                                                    | `indFirstname` = first word, `indLastname` = the rest                                          |
| email                                                                   | `indEmailAddress`                                                                              |
| phone                                                                   | `indPhoneNumber`, 10 digits; MedicarePRO formats it                                            |
| zip                                                                     | `indAddressZip`, first 5 digits. No state is sent, because a ZIP can be out of state (my call) |
| interest, message, page, UTM, consent time and version, submission date | `indNoteBody`                                                                                  |

Note text (Central time; the repeat note changes only the first line):

```
Website form submission on Oct 16, 2026       (repeat: "Filled out the website form again on …")
Name / Email / Phone / ZIP
Interested in: Medicare Advantage (Part C)
Message: …
Page: /contact
UTM: source=…, campaign=…
TCPA consent: agreed 2026-10-16T14:02:11Z, disclosure version …
Ref: <idempotencyKey>
```

### Website side

- `RelayTransport` implements the existing `CrmTransport` (`src/lib/crm/types.ts`). It POSTs to
  `CRM_RELAY_URL` with `CRM_RELAY_SECRET`, and has a 5 s abort.
- `CrmTransport.send` gains `attempt` and an optional `signal`.
- Fast path: `attemptLeadDelivery(leadId)` claims that lead's outbox row with the existing lease
  SQL. It runs inside the same `Promise.allSettled` as the emails (`src/api/leads.ts:56-59`),
  with a 5 s cap, so the visitor waits no longer than the slower of the two. It is skipped when
  the transport is `mock`.
- Drain: the existing `drainOutbox` gains:
  - a 40 s budget inside the 60 s Lambda timeout, releasing rows it did not attempt
  - fenced settle writes (`AND status='pending' AND attempts=<claimed>`)
  - a Do Not Contact re-check (`isSuppressed`) before each send; a suppressed row is set to
    `failed` with `last_error = 'suppressed: do-not-contact'`. No migration, no alert.
- Double-send guard: the fast path and the drain both claim through the same atomic
  `UPDATE … FOR UPDATE SKIP LOCKED` lease. The `Ref:` marker and the by-externalid lookup
  protect the vendor side.
- Alert: when a row goes to `failed` for a reason other than do-not-contact, an SES email goes
  to `notificationEmails` with the lead id, attempts and error. It holds no PII.
- Scheduler: EventBridge Scheduler `rate(5 minutes)` invokes the Lambda with a synthetic
  function-URL event for `POST /api/jobs/outbox` and the existing `OUTBOX_JOB_TOKEN`. It is
  `DISABLED` while `crm_transport` is `mock`, because a mock drain marks rows sent and would lose
  them.
- One local, `crm_transport` in `infra/compute.tf`, drives both the Lambda env var (now hard
  `"mock"` at `:42`) and the schedule state.

### Secrets

| Secret                                          | Source                                                               | Goes to                                               |
| ----------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------- |
| `MEDICAREPRO_API_TOKEN`                         | `op://Secrets/MedicarePRO CRM MCP Server Nate/MEDICAREPRO_API_TOKEN` | relay Worker secret only                              |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | same item                                                            | relay deploy only (has Workers Scripts Write)         |
| `CRM_RELAY_SECRET`                              | field in `op://Secrets/legacybenefitsmn`                             | relay Worker secret and Lambda env (TF sensitive var) |
| `CRM_RELAY_URL`                                 | field in `op://Secrets/legacybenefitsmn`                             | Lambda env                                            |

The relay deploy runs locally with `bash workers/crm-relay/deploy.sh`,
which reads 1Password by item ID and is not part of `deploy.yml`.

## Tasks (in order, one commit each)

1. **Relay scaffold and health.** Create `workers/crm-relay/` with `wrangler.jsonc`, `src/index.ts`,
   `GET /health`, bearer auth on `/lead` (it returns 501 for now), and vitest tests.
   - Needs `wrangler` as a dev dependency; ask before installing.
   - Deploy with Nate's Cloudflare token. Done when `curl …/health` returns 200 and a
     `/lead` call without auth returns 401.
2. **Prove the network path (gate).** Add the relay URL and secret to `app.env`,
   `infra/variables.tf` and `infra/compute.tf`. `/api/health` adds `crmRelay: "ok" | "unreachable"`
   from a 3 s `GET /health`. Merge, deploy, then call `/api/health`.
   - If it reports `unreachable`, stop. The fallback is a NAT gateway (about $33/mo), and the
     relay is dropped.
   - The same deploy reports on SES and Turnstile over IPv6: submit one TEST form and check the
     email arrives.
3. **Relay mapping.** Add `workers/crm-relay/src/map.ts`: name split, phone, ZIP, note text,
   Central-time date. Unit tests cover every row of the mapping table.
4. **Relay flow.** Implement the 5-step `/lead` flow and the error classification, with
   fetch-mocked tests for each step, each error row, the marker skip, and no token in error
   text.
   - Live test with the **fixed TEST person**: `TEST Websiteform`, `test-lbg-crm@example.com`,
     `612-555-0101`, ZIP `55401`. Every run reuses these exact details, so the record in the CRM
     collects one note per run.
   - Run 1 creates the contact, or adds a note if it already exists. A rerun with the same key
     adds no second note. Marc checks the record in the CRM.
5. **Website transport.** Add `src/lib/crm/transports/relay.ts` and its tests. Register `relay` in
   `src/lib/crm/index.ts`. Add `attempt` and `signal` to `send`.
   - Delete the webhook and zapier transports, their tests, the factory branches,
     `MEDICAREPRO_WEBHOOK_URL` and `MEDICAREPRO_ZAPIER_HOOK_URL` in `app.env`, and the README
     env lines.
6. **Outbox hardening.** In `src/lib/leads/outbox.ts`: extract `claim` and `settle`, add fenced
   settles, the 40 s budget with release, the do-not-contact re-check, and pass `attempt`.
   - Unit tests must keep the 100% branch coverage on `src/lib/**` (`vitest.config.ts`).
   - Int test: a fast path and a drain racing on one row produce one send.
7. **Fast path.** Add `attemptLeadDelivery` in `outbox.ts`, wired into `src/api/leads.ts`
   alongside the emails. Rejections are logged without PII.
   - Tests: called when not suppressed; not called on suppressed, honeypot or Turnstile paths;
     a failure still returns 201.
8. **Failure alert.** Add `sendCrmFailureAlert` in `src/lib/email/index.ts`, called from `settle`.
   - Tests: an alert only on `failed`, none for do-not-contact, and no PII in the body.
9. **Job log line.** `src/api/jobs-outbox.ts` writes one `[outbox]` summary line per run.
10. **Scheduler.** Add `infra/scheduler.tf` (role, policy, schedule, state from
    `local.crm_transport`).
    - A test in `tests/api/index.test.ts` checks that the synthetic event reaches the outbox
      route.
    - Read the local `terraform plan` before merging, because a merge applies with no gate
      (`.github/workflows/deploy.yml:224`).
11. **Docs and diagrams.** Update README lead capture and the IPv6 section, plus D1 and D3 (and
    review D4 and D8). Run `pnpm diagrams:build`, `pnpm diagrams:check` and `pnpm docs:check`.
12. **Flip.** Set `local.crm_transport = "relay"`. Read the plan, merge, then:
    - submit the fixed TEST person through the real site form
    - Marc confirms the note in the CRM
    - check the outbox row is `sent`
    - check `[outbox]` lines appear every 5 minutes
    - leads already queued from before the flip are delivered (owner decision)
    - rollback is setting `crm_transport = "mock"`, which also disables the schedule

## Risks and open items

- Task 2 is unproven until it runs. The NAT fallback costs about $33/mo.
- The 5-minute drain keeps Aurora from pausing, up to about $44/mo. The owner accepted it.
- `app.env` must point at `op://Secrets/legacybenefitsmn` (the item moved vaults), and the CI
  service account needs read access to the Secrets vault. Owner to confirm before task 2.
