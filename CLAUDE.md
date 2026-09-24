@AGENTS.md

# Working in this repository

Next.js 16 static export on Postgres, with content authored in `src/content/`.

## Do not assert what this application is

Nothing here decides what this application is, is for, or has to be — no comment, no
`description`, no document, and not this file. Those are the owner's decisions, they
change, and a file that records one turns it into a rule nobody agreed to. Earlier
passes filled `infra/` with this prose, and each agent that followed restored
infrastructure the owner had just deleted, citing it as authority.

**Prohibited:** prose saying what this application should have, must have or needs;
comments justifying why a resource exists or warning a reader not to remove it;
claims about what kind of system this is — not "regulated", not "demo", not
"production"; `description` text longer than one short line; documents recommending
an architecture.

**Delete it when you find it**, including prose you did not write and prose in this
file. List what you deleted, so it can be vetoed. If something is missing, say it in
chat rather than writing it into the repository.

Code comments explain a non-obvious _mechanism_ in one or two lines. Nothing else.

### One test: what is the subject of the sentence?

If the subject is the code in front of you, any wording is fine — "no `svh` in this
table, a band sized in viewport units has no height on paper". If the subject is the
app, a future proposal or the next person, it stays out, however true it is. Past
tense about a past decision is fine; present tense about a future one is not.

### The other test: does it expire?

A requirement does not. A task does. A brief, a handoff prompt or a plan for one job
is allowed — name the task in the filename, keep it untracked, delete it when the
work lands. One that outlives its task has become a requirement, and everything above
applies to it.

An explicit instruction from the owner outranks this file. Do it, and say in chat
which rule it crosses.

## Rules

- **Never add a service, resource or dependency** unless explicitly asked. Not for
  safety, not for best practice, not "while we're here".
- **Never re-add anything that was deleted** unless explicitly asked. Removal was a
  decision, not a bug — not something to notice and quietly put back.
- **Ask before spending money.** Any resource that bills, any paid tier, any managed
  service.
- **`terraform apply` and `terraform destroy` only when asked.** Credentials in this
  environment are live.
- **Do not commit, stage or push** without being asked.

## Things that actually break

Short, mechanical, no rationale needed:

- **Blank is not `REPLACE_ME`.** `env()` (`src/lib/env.ts`) treats blank as absent,
  which is the supported "not configured" value. `REPLACE_ME` is non-empty, so
  `verifyTurnstile` calls Cloudflare with a bogus secret and every form submission
  403s.
- **SSM cannot store an empty string.** "Set the parameter to empty" is not a thing.
  Absence is expressed by not creating the parameter.
- **A tfvars file beats a `TF_VAR_` environment variable.** If an export appears to
  do nothing, check whether a tfvars file sets the same key.
- **`PAYLOAD_SECRET` is the salt for `ip_hash`.** Rotating it severs the existing
  hashes; nothing reports this.
- **Exit code 0 is not proof.** Verify with a row count, an object count, a rendered
  page.

## When you write

- State what you verified in this run, and mark what you did not.
- Cite by symbol, not line number.
- Never fabricate a credential, key, ARN, account id or price. Every dollar figure
  needs a source or an explicit "estimate, by this method".
