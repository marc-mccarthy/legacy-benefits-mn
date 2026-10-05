# IaC and deploy review: legacy-benefits-mn

Date: 2026-10-04. Branch: feat/visual-refresh.

Merged 2026-10-04: this file now also carries the former infra/ vet remaining-work list, retired by this merge (terraform style-guide and registry vet of `infra/`, updated after the Route 53 build). The review text below was written before the Route 53 build and is kept as written. Lines starting "Status 2026-10-04" or "Superseded 2026-10-04" are newer and win over the text they follow. Vet items are cited as "vet #n" (numbering of the old file, 1-19). New findings without a review ID carry `NEW-DNS-xx` or `NEW-OPS-xx` labels. See "Status since review", "Route 53 DNS (added 2026-10-04)", "Remaining work index" and "Open contradictions".

## Scope and method

Read-only review of `infra/*.tf`, `infra/scripts/`, `.github/workflows/{ci,deploy}.yml`, `.gitignore`, `next.config.ts` and the form and security code the infra serves. Not opened: state, plan, tfvars, terraform.env, apply/build/dev logs, bootstrap zip.

Method: lead, an AWS expert and a Terraform expert reviewed independently, then cross-checked each other. Antigravity (Mode B, fresh session) gave a third opinion (AGY-01..19); every AGY claim was verified against code, GitHub (read-only `gh api`) or docs before it was accepted or dropped.

Tool results (Terraform expert, scratch copy):

- `terraform fmt -check -recursive infra`: exit 0.
- `terraform validate`: Success.
- tflint 0.64.0 (recommended preset, aws ruleset 0.44.0): exit 0, no findings.
- trivy 0.74.0 config: 1 CRITICAL (AWS-0104), 3 HIGH (AWS-0011, AWS-0079, AWS-0132), 5 MEDIUM (AWS-0010, AWS-0077, AWS-0090, AWS-0178, AWS-0343).

| Provider            | Constraint | Locked                      | Latest |
| ------------------- | ---------- | --------------------------- | ------ |
| hashicorp/aws       | ~> 6.63    | 6.65.0                      | 6.67.0 |
| integrations/github | ~> 6.6     | 6.13.0                      | 6.13.0 |
| hashicorp/random    | ~> 3.6     | 3.9.1                       | 3.9.1  |
| hashicorp/archive   | ~> 2.7     | 2.8.1 (no constraints line) | 2.8.1  |

`required_version ~> 1.16`; CI pins 1.16.1. No modules.

Status 2026-10-04: installed state records Terraform 1.16.1; latest release reported 1.16.5. `terraform` is on PATH in this session (an agent's claim that it was not was wrong). Still no modules: the Route 53 build is flat files.

## Summary

Total: 0 Critical, 4 High, 14 Medium, 13 Low.

| Sev  | ID                 | Title                                                                                 | file:line                               | AWS / TF / AGY               |
| ---- | ------------------ | ------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------- |
| High | TF-01              | `infra/terraform.env` not gitignored                                                  | .gitignore:37,50-52                     | - / Y / - (AWS rated Medium) |
| High | TF-04 / AWS-01     | Function URL auth `NONE` vs CloudFront-principal grants                               | compute.tf:60,148-162; iam.tf:54-72     | Y / Y / 05,06                |
| High | AWS-04             | No Cache-Control; `--delete` removes old hashed chunks                                | deploy.yml:155-158                      | Y / - / 14 (cache half)      |
| High | TF-02 (clean part) | No `prevent_destroy` on the Aurora cluster                                            | main.tf:123-145                         | Y / Y / 03                   |
| Med  | AWS-02             | No VPC egress, Turnstile verify cannot reach Cloudflare (resolved by approved change) | main.tf:66-67; turnstile.ts:29,35-41    | Y / Y / -                    |
| Med  | AWS-03             | Distribution-wide 403 to 404 mapping                                                  | compute.tf:225-240                      | Y / Y / 09                   |
| Med  | TF-05 / AWS-05     | Logs and bootstrap zip tracked in git                                                 | infra/.apply.log etc.                   | Y / Y / -                    |
| Med  | TF-06 / AWS-07     | Secrets in Lambda env; deploy role has unused Lambda permissions                      | iam.tf:112-121; compute.tf:34-37        | Y / Y / 07,12                |
| Med  | TF-07              | Local state files world-readable, stale plan, size anomaly                            | infra/terraform.tfstate*                | - / Y / -                    |
| Med  | TF-08 / AWS-17     | Pinned Aurora minor version will drift                                                | main.tf:127,152                         | Y (Low) / Y (Med) / -        |
| Med  | TF-09              | GitHub variables `for_each` breaks a fresh apply                                      | github.tf:41-43                         | - / Y / -                    |
| Med  | TF-10              | Trivy `exit-code: "0"`, no tflint step                                                | ci.yml:149-156                          | Y (Low) / Y (Med) / 19       |
| Med  | AWS-06 / TF-15     | Deploy role trusts unused `environment:production`                                    | iam.tf:100                              | Y (Med) / Y (Low) / 16       |
| Med  | AWS-08 / AGY-11    | Lambda runtime role can write the whole site bucket                                   | iam.tf:31-44                            | Y / Y / 11                   |
| Med  | AWS-10             | No security headers, no CSP                                                           | compute.tf:164-223                      | Y / - / 08                   |
| Med  | AWS-11             | Client IP is attacker-controlled `X-Forwarded-For[0]`                                 | request.ts:8-11                         | Y / Y / -                    |
| Med  | AWS-12             | No concurrency cap; public health check keeps Aurora awake                            | compute.tf:13-21; deploy.yml:221-226    | Y / - / -                    |
| Med  | AWS-14 / AGY-17    | Build job holds deploy credentials, syncs before migrate                              | deploy.yml:136-158,172-191              | Y / - / 17                   |
| Low  | TF-16 / AWS-09     | Release zips served via CloudFront, never expire                                      | main.tf:168-184                         | Y / Y / -                    |
| Low  | AWS-13 / AGY-18    | Actions pinned by tag; CI lacks `permissions:`                                        | ci.yml; deploy.yml                      | Y / Y / 18                   |
| Low  | AWS-16             | HTTP/3 not enabled                                                                    | compute.tf:133-138                      | Y / - / -                    |
| Low  | AWS-18             | preflight-cutover.sh reads a removed output                                           | preflight-cutover.sh:81                 | Y / - / -                    |
| Low  | AGY-02             | No `aws:SecureTransport` deny on bucket                                               | main.tf:168-184                         | Y / - / 02                   |
| Low  | TF-11              | Variables lack description and validation                                             | variables.tf                            | - / Y / -                    |
| Low  | TF-12              | Outputs lack description                                                              | outputs.tf                              | - / Y / -                    |
| Low  | TF-13              | `archive_file` writes into the repo                                                   | compute.tf:5                            | - / Y / -                    |
| Low  | TF-14              | tfvars.example contradicts default                                                    | tfvars.example:41; variables.tf:122-124 | - / Y / -                    |
| Low  | TF-17              | Lock file stale (archive constraint, single platform)                                 | .terraform.lock.hcl                     | - / Y / -                    |
| Low  | TF-18              | Style and hygiene items                                                               | various                                 | - / Y / -                    |
| Low  | LEAD-NOTIF         | `LEAD_NOTIFICATION_EMAILS` is inert                                                   | compute.tf:48                           | note / Y / -                 |

Disagreements, resolved by the lead's rulings where one exists: TF-01 (AWS: Medium; ruled High), AWS-04 (AWS cross-check: Medium; ruled High), TF-08 (Terraform: Medium; AWS: Low; kept Medium), TF-10 (Terraform: Medium; AWS: Low; kept Medium), AWS-06 / TF-15 (AWS: Medium; Terraform: Low; kept Medium, the higher-risk reading).

### Status since review (2026-10-04)

The summary table above is the review as written. Current status, measured 2026-10-04 unless marked otherwise:

| ID                     | Status                                                                                                 | Vet item     |
| ---------------------- | ------------------------------------------------------------------------------------------------------ | ------------ |
| TF-01                  | Withdrawn by owner ruling: `infra/terraform.env` holds only `op://` references and need not be ignored | #1           |
| TF-04 / AWS-01         | Open, re-vetted; lead ruled B, owner has not decided                                                   | #8           |
| AWS-02 / LEAD-NOTIF    | Implemented in `infra/*.tf` 2026-10-04 (IPv6 egress + SES); not applied, plan only                     | #7           |
| TF-02                  | Open; vet re-raises the owner-removed Aurora settings                                                  | #9           |
| TF-05 / AWS-05         | Untracking done (committed in fbe52b2); `.gitignore` lines still missing                               | #1, #3, Done |
| TF-06 / AWS-07         | Open                                                                                                   | #10, #19     |
| TF-07                  | Open; stale `tfplan`, tfvars and backup no longer on disk; leftover lock-info file                     | #2, #3, #10  |
| TF-08 / AWS-17         | Open                                                                                                   | #15          |
| TF-09                  | Implemented (github.tf:8-34, committed in fbe52b2)                                                     | diff notes   |
| TF-11                  | Stale `acm_certificate_arn` mention removed; rest open                                                 | #5, #17      |
| TF-12, TF-18           | Open; new DNS variables and outputs have descriptions                                                  | #17          |
| TF-13                  | Done: compute.tf:5 `output_path = "${path.root}/.terraform/bootstrap.zip"`                             | Done         |
| TF-14                  | `terraform.tfvars.example` deleted in fbe52b2; restore is open                                         | #11          |
| TF-17                  | Open                                                                                                   | #16          |
| AWS-18                 | Open; script kept by owner ruling, still dead                                                          | #14          |
| NEW-DNS-00             | Done: Route 53 zone, ACM certificate, aliases (infra/dns.tf)                                           | Done         |
| NEW-DNS-01..06         | See "Route 53 DNS (added 2026-10-04)"; 04 and 06 done, 05 done at registry, DNS cache wait open        | #6, #12, #13 |
| NEW-OPS-01, NEW-OPS-02 | See "Remaining work index"                                                                             | #4, #18      |

All other IDs: no change recorded since the review.

## High

### TF-01: `infra/terraform.env` not gitignored

- Severity: High. Verified (`git check-ignore -v infra/terraform.env` exits 1; file untracked, mode 600).
- Location: .gitignore:37,50-52 (patterns are `.env`, `.env*.local`, `!.env.example`; none match `terraform.env`). The Terraform expert cited 45-47; corrected.
- Risk: `git add -A` or `git add infra` commits real credentials into a private repo whose history cannot be rewritten (hard limit).
- Fix:

```
infra/terraform.env
```

- Agreed: Terraform expert (High); AWS expert (Medium, file untracked so nothing exposed yet). Ruled High because one careless `git add` is irreversible here.
- Superseded 2026-10-04 (owner ruling): `infra/terraform.env` contains only `op://` references, so it does not need to be gitignored. The earlier note that it should be ignored (here and in vet #1) is withdrawn. Measured: the file is now tracked (committed in fbe52b2); all 20 `TF_VAR_` lines are `op://` references to 1Password item "legacy-benefits-mn-infra", plus 3 comment lines. The `.gitignore` work that remains is under TF-05. Line numbers moved: `.env`, `.env*.local`, `!.env.example` are now .gitignore:48-50 (the old :37 entry was removed in fbe52b2).

### TF-04 / AWS-01 / AGY-05, AGY-06: Function URL auth does not match the permissions

- Severity: High. Config mismatch verified; which live outcome applies is inferred.
- Location: infra/compute.tf:60, 148-162; infra/iam.tf:54-72.
- Evidence: `authorization_type = "NONE"` (compute.tf:60). The lambda origin has only `custom_origin_config`; the only OAC is `origin_access_control_origin_type = "s3"`. Grants use `principal = "cloudfront.amazonaws.com"` and `function_url_auth_type = "AWS_IAM"` (iam.tf:58,60). All introduced together in 5f6e3e1; no Lambda OAC ever existed.
- Risk: CloudFront signs requests only when a `lambda` OAC is attached, so its requests arrive anonymous and match neither grant. Either (a) `/api/*` returns 403, masked as 404 by AWS-03, and every lead, SOA and DNC submit fails; or (b) a public `*` permission was added outside Terraform, so the URL is public and bypasses CloudFront. A green "Verify serving" step (deploy.yml:221-233) points to (b).
- First step: the owner runs `aws lambda get-policy --function-name <app function>` to see which outcome is live. Agents do not run it.
- Recommended fix, option B (public URL, no client change): delete both `cloudfront.amazonaws.com` grants (iam.tf:54-72) and add:

```hcl
resource "aws_lambda_permission" "public_url" {
  statement_id           = "FunctionURLAllowPublicAccess"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.app.function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}

resource "aws_lambda_permission" "public_invoke" {
  statement_id             = "FunctionURLAllowPublicInvoke"
  action                   = "lambda:InvokeFunction"
  function_name            = aws_lambda_function.app.function_name
  principal                = "*"
  invoked_via_function_url = true
}
```

`invoked_via_function_url` exists in the aws 6.65 schema (checked with `terraform providers schema` in the scratch copy). Pair with AWS-11 below, because B leaves the URL reachable without CloudFront.

- Alternative, option A (CloudFront-only access): add `aws_cloudfront_origin_access_control` with `origin_access_control_origin_type = "lambda"`, `signing_behavior = "always"`, `signing_protocol = "sigv4"`; attach it to the lambda origin; set `authorization_type = "AWS_IAM"`. Catch: POST/PUT through an OAC needs the viewer to send `x-amz-content-sha256` (SHA-256 of the body), so add `crypto.subtle.digest` to the fetches at contact-form.tsx:45, soa-form.tsx:36 and dnc-form.tsx:39. Any POST without the header fails. Choose A only if the owner wants CloudFront-only access.
- Agreed: AWS (recommended A), Terraform (recommended B), AGY partial (mismatch real; "anyone can bypass" holds only if a public permission exists outside Terraform). Lead ruled B.
- Status 2026-10-04 (vet #8, Medium, open): `compute.tf:59-63`, `iam.tf:53-72`. `authorization_type = "NONE"` makes the URL callable without CloudFront, and the auto-added public permissions are not removed on destroy. The two `AWS_IAM` CloudFront permissions do nothing: no `origin_access_control_origin_type = "lambda"` OAC exists. Options: add a Lambda OAC, switch to `AWS_IAM` and set `origin_access_control_id` on the origin (POST/PUT bodies then need `x-amz-content-sha256`, so forms change); or delete the two dead permissions and accept the public URL. The lead's ruling (B) stands; the owner has not decided.

### AWS-04 / AGY-14 (cache half): No Cache-Control, and `--delete` removes old hashed chunks

- Severity: High. Missing headers and deletion verified; page breakage inferred from browser heuristic caching.
- Location: .github/workflows/deploy.yml:155-158.
- Evidence: `aws s3 sync out/ "s3://$BUCKET/" --delete --exclude 'releases/*' --exclude 'media/*' --exclude 'video/*'`. No `--cache-control` on any of the three syncs. `_next/static` is not excluded from `--delete`.
- Risk: without Cache-Control, browsers heuristically cache HTML and unhashed media. Stale HTML then references chunks the new deploy deleted (403, then the 404 page, `ChunkLoadError` or unstyled pages), and replaced refresh media (same filename) stays stale. Self-heals on reload, but the visual refresh replaces media in place. Must land before the refresh ships.
- Fix:

```yaml
aws s3 sync out/_next/static "s3://$BUCKET/_next/static" --cache-control 'public,max-age=31536000,immutable'
aws s3 sync out/ "s3://$BUCKET/" --delete --exclude 'releases/*' --exclude '_next/static/*' \
--cache-control 'public,max-age=0,s-maxage=86400,must-revalidate'
```

Drop the separate `public/media` and `public/video` syncs: `out/` already holds both, and the `--delete` sync then also removes orphans (AWS-15: files deleted from git, such as those removed in 46d85d6, stay served today). If media needs its own header (`public,max-age=3600,s-maxage=31536000`), add one pass with `--exclude '*' --include 'media/*' --include 'video/*'`. The `/*` invalidation is one path and keeps the long edge TTLs safe. The comment at deploy.yml:206-208 contradicts the step and should be deleted (repo rule: no comments).

- Agreed: AWS (High), Terraform cross-check (Medium, "self-healing on reload"), AGY-14 cache half confirmed. Content-Type half refuted (see Dropped).
- Lineage: Cache-Control and `--delete` never existed before 5f6e3e1; not a re-add.

### TF-02 (clean part): No `prevent_destroy` on the Aurora cluster

- Severity: High. Verified (config).
- Location: infra/main.tf:123-145.
- Risk: the cluster holds lead PII and TCPA consent records. `terraform destroy`, any ForceNew change (identifier, `database_name`, a `name` var edit) or a re-apply from lost local state deletes it, and nothing else in the config guards it.
- Fix:

```hcl
resource "aws_rds_cluster" "this" {
  lifecycle {
    prevent_destroy = true
  }
}
```

Merge with TF-08 (`ignore_changes = [engine_version]`) in the same `lifecycle` block.

- Lineage: `prevent_destroy` never existed (`git log --all -S prevent_destroy` finds none), so this is not a re-add. The other protections in the original TF-02 were removed by the owner; see Owner decisions.
- Agreed: Terraform (High), AWS (High), AGY-03.
- Status 2026-10-04 (vet #9, Medium, open): Aurora safety, `main.tf:123-145`. Missing: `storage_encrypted = true`, `deletion_protection = true`, `skip_final_snapshot = false` with `final_snapshot_identifier`, `backup_retention_period = 7`. Currently `skip_final_snapshot = true` and `apply_immediately`. Encryption forces replacement, so set it now while state is empty. These settings are the owner-removed items in "Owner decisions"; see Open contradictions C2.

## Medium

### AWS-02: No route out of the VPC, Turnstile verify cannot succeed (resolved by approved change)

- Severity: Medium (accepted trade-off). Becomes High if `turnstile_secret` is set. The owner verifies which; the value was not read.
- Location: infra/main.tf:35-75 (documented at 66-67); src/lib/security/turnstile.ts:29,35-41; src/api/leads.ts:33-37.
- Evidence: main.tf:66-67 "Gateway endpoint, not a NAT gateway ... A NAT would be ~$32/mo"; terraform.tfvars.example:73-74 says to leave the secret blank without a NAT. `if (!secret) return true;` (turnstile.ts:29); `catch { return false; }` then 403.
- Risk: with the secret set, every lead, SOA and DNC submit hangs until the connect timeout (about 10 s), then gets 403. With it blank, the server-side bot check is off by design; only the honeypot (leads.ts:31) remains.
- Fix within repo rules: keep the secret blank (documented path). Any egress change is an owner decision (see Owner decisions).
- Agreed: AWS (High), Terraform (High if set, Medium if blank). Ruled Medium.
- Status 2026-10-04: `terraform.tfvars.example` (cited above for :73-74) was deleted in fbe52b2; see TF-14.
- Status 2026-10-04 (vet #7, High, open): Email and Turnstile cannot work. `compute.tf:13-51`, `main.tf:68-76`, `iam.tf:22-45`.
  - The Lambda is in a VPC whose only exit is an S3 gateway endpoint. No NAT.
  - The app calls SESv2 (`src/lib/email/index.ts:3,39`) and Turnstile verify (`src/lib/security/turnstile.ts:3`). Both need the internet.
  - The role has no `ses:SendEmail`.
  - Effect: `LEAD_NOTIFICATION_EMAILS` never delivers. Any non-empty `turnstile_secret` breaks every form submit.
  - Options listed by the vet, each adds cost or a service: (a) SES interface endpoint plus `ses:SendEmail` scoped to the identity, and drop Turnstile; (b) NAT gateway; (c) leave both blank and document it.
  - The vet's options do not mention the owner-approved route ("Approved change: IPv6 egress + SES" below). Measured then: no `aws_egress_only_internet_gateway` or `aws_sesv2_email_identity` existed in `infra/*.tf`, so that approved change was not implemented. See Open contradictions C1.
  - Status 2026-10-04 (later): the approved route is now implemented in `infra/*.tf` (egress-only gateway, `::/0` route, IPv6 security-group rule, `ipv6_allowed_for_dual_stack`, SES identity in `infra/ses.tf`, scoped IAM, `ses_from_address` variable). Read-only plans only; nothing is applied. Still open for AWS-02: `turnstile_secret` is empty in 1Password, and `src/lib/security/turnstile.ts:29` (`if (!secret) return true;`) then skips verification, so forms are accepted with no bot check (an empty secret does not reject forms). Runtime IPv6 reachability from Lambda is UNVERIFIED until one test submit after deploy.

### AWS-03 / AGY-09: Distribution-wide 403 to 404 mapping hides API errors

- Severity: Medium. Verified.
- Location: infra/compute.tf:225-240; src/api/leads.ts:36; src/api/soa.ts:30.
- Evidence: `error_code = 403`, `response_code = 404`, `response_page_path = "/404.html"`. CloudFront error responses cannot be scoped to one behavior.
- Risk: a Turnstile 403 reaches the client as a 404 HTML page. User impact is nil (no form reads the error body: contact-form.tsx:58, soa-form.tsx:41, dnc-form.tsx:44 all throw one generic message), but diagnostics are lost and TF-04 outcome (a) is masked.
- Fix: grant CloudFront `s3:ListBucket` so S3 answers missing keys with 404 (the reason in compute.tf:225-227), then delete the 403 block. Query strings are not forwarded to the S3 origin, so this does not expose a listing.

```hcl
statement {
  actions   = ["s3:ListBucket"]
  resources = [aws_s3_bucket.assets.arn]

  principals {
    type        = "Service"
    identifiers = ["cloudfront.amazonaws.com"]
  }

  condition {
    test     = "StringEquals"
    variable = "AWS:SourceArn"
    values   = [aws_cloudfront_distribution.this.arn]
  }
}
```

- Agreed: AWS cross-check (Medium), Terraform (Medium), AGY (High). Ruled Medium. Not a re-add (the 403 block was introduced in 5f6e3e1).

### TF-05 / AWS-05: Logs and bootstrap zip tracked in git

- Severity: Medium (repo is private). Verified tracked and on origin/main; contents not read.
- Location: tracked `infra/.apply.log`, `.build.log`, `.build2.log`, `.build3.log`, `.dev.log`, `.bootstrap.zip` (added in 5f6e3e1, 2026-09-23). `infra/.claude/` and `.DS_Store` are not tracked.
- Risk: apply output can carry the account ID, resource IDs, endpoints and Lambda environment values; only values derived from sensitive inputs are masked. Anyone with repo read access sees them. History keeps them (purge is a rewrite, the owner's call).
- Fix: `git rm --cached infra/.apply.log infra/.build*.log infra/.dev.log infra/.bootstrap.zip`, then add to .gitignore:

```
infra/.*.log
infra/.bootstrap.zip
```

- Status 2026-10-04, done: `git rm --cached` on `infra/.apply.log`, `.build.log`, `.build2.log`, `.build3.log`, `.dev.log`, `.bootstrap.zip` (files stayed on disk at the time); the removal is committed in fbe52b2. They remain in git history from `5f6e3e1`.
- Status 2026-10-04, open (vet #1, `.gitignore` gaps): the six files are not ignored, and a stray `prod.tfvars` would be committed (only `terraform.tfvars` and `*.auto.tfvars` are ignored, .gitignore:66-67). Add `infra/.*.log`, `infra/.bootstrap.zip`, `*.tfvars` (keep the `!terraform.tfvars.example` negation, .gitignore:71). The existing rule at .gitignore:79 already covers `tfplan`. `infra/terraform.env` is not added (owner ruling, see TF-01).
- Status 2026-10-04 (vet #3, leftover on-disk files): the vet recorded `infra/.apply.log` (73 KB, account-ID ARNs), the other logs and the old `infra/.bootstrap.zip` as still on disk until the owner deletes them. Measured at merge time: none of them is on disk any more. Who removed them is not known.

### TF-06 / AWS-07 / AGY-07 / AGY-12: Secrets in Lambda env readable by the deploy role

- Severity: Medium. Verified (config).
- Location: infra/iam.tf:112-121; infra/compute.tf:34-37.
- Evidence: `DATABASE_URL` (embeds the master password), `PAYLOAD_SECRET`, `OUTBOX_JOB_TOKEN`, `TURNSTILE_SECRET` in plaintext env. The deploy role has `lambda:UpdateFunctionConfiguration`, `lambda:GetFunction`, `lambda:GetFunctionConfiguration`, `lambda:InvokeFunction` on both functions; deploy.yml:177-200 uses only update-function-code, `wait function-updated-v2` (GetFunction) and invoke on migrate.
- Risk: a rogue workflow on main or a compromised tag-pinned action can dump DB credentials or rewrite the environment (for example blank `TURNSTILE_SECRET`).
- Fix (trim only; `GetFunction` must stay for the wait, so read exposure remains):

```hcl
statement {
  actions   = ["lambda:UpdateFunctionCode", "lambda:GetFunction"]
  resources = [aws_lambda_function.app.arn, aws_lambda_function.migrate.arn]
}

statement {
  actions   = ["lambda:InvokeFunction"]
  resources = [aws_lambda_function.migrate.arn]
}
```

Dropping `GetFunctionConfiguration` is safe because the workflow never calls it. Moving secrets to SSM or Secrets Manager is an owner decision (see Owner decisions).

- Status 2026-10-04 (vet #19, Low, open): least privilege. `iam.tf:113-118`: the deploy role has `lambda:UpdateFunctionConfiguration`, which lets CI rewrite environment variables including secrets. Drop it if CI only updates code.
- Status 2026-10-04 (vet #10, Medium, open): secrets in plaintext. `compute.tf:34,277`, `main.tf:108-130`. The DB password, `PAYLOAD_SECRET` and the Turnstile secret sit in Lambda environment variables, local state and plan files. No remote backend. Acceptable at this scale. Long term: RDS-managed master password plus Secrets Manager (new service, needs owner OK; see Owner decisions). At minimum, back up state somewhere private (TF-07).

### TF-07: Local state hygiene

- Severity: Medium. Verified via `ls -la` (contents not read); size anomaly inferred.
- Evidence: terraform.tfstate, terraform.tfstate.backup, terraform.tfvars, tfplan are mode 644 (only terraform.env is 600). tfplan (Sep 20) predates 5f6e3e1, so it is stale; plans hold secrets in cleartext. State holds generated passwords and tokens in plaintext, with no locking and a single laptop copy. tfstate is 23,627 B (Oct 1 13:27) against .backup at 142,502 B (Oct 1 13:16): the last write shrank state about 6x, consistent with a destroy or partial apply.
- Fix: `chmod 600 infra/terraform.tfstate* infra/terraform.tfvars`; encrypted copy outside the repo via `op document create infra/terraform.tfstate --vault <v> --title lbmn-tfstate` (then `op document edit` after each apply); owner deletes the stale tfplan (untracked, git cannot recover it). Owner runs `terraform state list | wc -l` to check the anomaly.
- Lineage: a remote backend was removed in efdeeba; do not re-add (see Owner decisions).
- Status 2026-10-04 (vet #2): the vet recorded a stale `infra/tfplan` (Sep 20, untracked, holds the DB password and `PAYLOAD_SECRET` in cleartext; git cannot recover it; owner deletes with `rm infra/tfplan`). Measured at merge time: `infra/tfplan`, `infra/terraform.tfvars` and `infra/terraform.tfstate.backup` are no longer on disk; who removed them is not known. `infra/terraform.tfstate` is now 1,222 B (Oct 4 12:50) and mode 644; local state holds 0 resources. The size-anomaly evidence above therefore describes an earlier state file. See Open contradictions C3.
- Status 2026-10-04 (vet #3, not verified): `infra/.terraform.tfstate.lock.info` (Oct 4 16:44, mode 600) is present. No terraform process was running, so it looks like a leftover.

### TF-08 / AWS-17: Pinned Aurora minor version will drift

- Severity: Medium (AWS rated Low).
- Location: infra/main.tf:127, 152. `engine_version = "16.8"`; `auto_minor_version_upgrade` defaults true.
- Risk: after AWS upgrades the minor version, the next plan tries to downgrade and the apply errors. Inferred from provider behaviour.
- Fix: add `ignore_changes = [engine_version]` to the cluster `lifecycle` block (shared with TF-02) and delete main.tf:152.
- Status 2026-10-04 (vet #15, Low in the vet, open): `engine_version = "16.8"` (`main.tf:127`) while auto minor upgrades are on. Set `auto_minor_version_upgrade = false` or `ignore_changes = [engine_version]`.

### TF-09: GitHub variables `for_each` breaks a fresh apply

- Severity: Medium. Inferred from documented Terraform behaviour.
- Location: infra/github.tf:41-43. `for k, v in local.github_variables : k => v if v != ""` filters on values unknown until apply (role ARN, bucket, distribution ID, site URL).
- Risk: a from-scratch apply (the lost-state recovery path) fails "Invalid for_each argument" unless `-target` is used.
- Fix: keep the always-set, computed entries as an unfiltered map and filter only the user-supplied optional values.

```hcl
github_variables = merge(
  {
    AWS_REGION            = var.region
    AWS_DEPLOY_ROLE_ARN   = aws_iam_role.deploy.arn
    ASSETS_BUCKET         = aws_s3_bucket.assets.bucket
    LAMBDA_FUNCTION_NAME  = aws_lambda_function.app.function_name
    MIGRATE_FUNCTION_NAME = aws_lambda_function.migrate.function_name
    CLOUDFRONT_ID         = aws_cloudfront_distribution.this.id
    SITE_URL              = local.site_url
    NEXT_PUBLIC_SITE_URL  = local.site_url
  },
  { for k, v in {
    NEXT_PUBLIC_TURNSTILE_SITE_KEY = var.turnstile_site_key
    NEXT_PUBLIC_GTM_ID             = var.gtm_id
    NEXT_PUBLIC_CALENDLY_URL       = var.calendly_url
    NEXT_PUBLIC_MEDIA_HOST         = var.media_host
    BUSINESS_NAME                  = var.business_name
    BUSINESS_PHONE                 = var.business_phone
    BUSINESS_EMAIL                 = var.business_email
    BUSINESS_ADDRESS               = var.business_address
  } : k => v if v != "" }
)
```

and `for_each = var.manage_github_variables ? local.github_variables : {}`.

- Status 2026-10-04, implemented (vet working-tree diff note, now committed in fbe52b2): `github.tf` splits computed values (`github_computed_variables`, github.tf:8-17) from input values (`github_input_variables`, github.tf:19-28) and applies the `!= ""` filter only to inputs (github.tf:32-34). Correct. The old filter would break `for_each` keys on a fresh apply. Three explanatory comments were removed.

### TF-10 / AGY-19: CI infra gates do not gate

- Severity: Medium (AWS rated Low). Verified.
- Location: .github/workflows/ci.yml:149-156 (`exit-code: "0"`); no tflint step although `infra/.tflint.hcl` exists.
- Fix: set `exit-code: "1"`, `severity: "CRITICAL,HIGH"`, `trivyignores: infra/.trivyignore` listing accepted IDs (AWS-0011 no WAF, AWS-0104 no egress, AWS-0132 no CMK, and AWS-0079 until the owner decides on encryption). Add `terraform-linters/setup-tflint` and `tflint --chdir=infra --init && tflint --chdir=infra`.

### AWS-06 / TF-15 / AGY-16: Deploy role trusts an unused `environment:production`

- Severity: Medium (Terraform rated Low). Verified.
- Location: infra/iam.tf:100; deploy.yml has no `environment:` key. `gh api .../environments` lists only `dev`, with no protection rules.
- Risk: any collaborator with write access can push a workflow on any branch declaring `environment: production`. GitHub auto-creates the environment unprotected, and the job receives the deploy role.
- Fix: delete iam.tf:100. The jobs emit `...:ref:refs/heads/main`, which iam.tf:99 already covers. Deploy does not break (AGY-16's failure claim is refuted).
- Lineage: leftover of the removed design (`environment:` was removed from deploy.yml in 5f6e3e1); deleting is consistent.

### AWS-08 / AGY-11: Lambda runtime role can write the whole site bucket

- Severity: Medium. Verified.
- Location: infra/iam.tf:31-44. Get, Put, Delete, AbortMultipartUpload on `"${aws_s3_bucket.assets.arn}/*"` plus ListBucket. No `S3Client` or `@aws-sdk/client-s3` in src/ or package.json.
- Risk: code execution in the handler could deface the site, or swap `releases/<key>.zip` between the build upload and the deploy `update-function-code`, planting a lasting backdoor.
- Fix: delete both statements.

### AWS-10 / AGY-08: No security headers, no CSP

- Severity: Medium. Missing headers verified; GTM container tags not tested.
- Location: infra/compute.tf:164-223 (no `response_headers_policy_id` on any behavior).
- Lineage: never existed (`git log --all -S response_headers_policy` finds none); not a re-add.
- Fix: a free `aws_cloudfront_response_headers_policy`, attached to the default behavior and to `/_next/static/*`, `/media/*`, `/video/*`. Start with a `Content-Security-Policy-Report-Only` custom header because GTM tags can need `'unsafe-eval'`. `'unsafe-inline'` in script-src is unavoidable: a static export inlines `self.__next_f.push` and cannot use nonces. Starting point for the enforcing policy:

```hcl
resource "aws_cloudfront_response_headers_policy" "security" {
  name = "${var.name}-security"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 63072000
      include_subdomains         = false
      override                   = true
    }

    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    content_security_policy {
      override                = true
      content_security_policy = "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://challenges.cloudflare.com https://assets.calendly.com; style-src 'self' 'unsafe-inline' https://assets.calendly.com; img-src 'self' data: blob: https://*.google-analytics.com https://*.googletagmanager.com; media-src 'self'; font-src 'self'; connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com; frame-src https://challenges.cloudflare.com https://calendly.com https://www.googletagmanager.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
    }
  }
}
```

Origins come from consent.tsx:4,90 (GTM), turnstile.tsx:28, calendly.tsx:33. If `NEXT_PUBLIC_MEDIA_HOST` is set, add `https://<media_host>` to img-src and media-src.

### AWS-11: Client IP is the left-most `X-Forwarded-For` entry

- Severity: Medium. Code verified; not verified whether `Managed-AllViewerExceptHostHeader` forwards `CloudFront-Viewer-Address`.
- Location: src/lib/security/request.ts:8-11; infra/compute.tf:190.
- Evidence: `return fwd?.split(",")[0]?.trim() || undefined;`
- Risk: CloudFront appends the real viewer IP to whatever `X-Forwarded-For` the visitor sent, so the left-most entry is attacker-chosen. It feeds Turnstile `remoteip` and the lead and SOA compliance records. Under TF-04 option B, direct Function URL hits can forge it outright.
- Fix: read `cloudfront-viewer-address` and strip the port.

```ts
export function clientIp(req: Request): string | undefined {
  const addr = req.headers.get("cloudfront-viewer-address");
  return addr?.slice(0, addr.lastIndexOf(":")) || undefined;
}
```

If the managed origin request policy does not forward that header, use a custom origin request policy that adds it. The header format for IPv6 viewers is unverified (`lastIndexOf(":")` assumes the port is the last segment).

### AWS-12: No concurrency cap; public health check keeps Aurora awake

- Severity: Medium. Config verified; cost estimated.
- Location: infra/compute.tf:13-21; infra/main.tf:137-141; deploy.yml:221-226. `/api/health` checks Postgres.
- Risk: bots or monitors pinging `/api/health` defeat auto-pause (roughly $44/month at 0.5 ACU, us-east-1 price, region unconfirmed). A request flood scales Aurora to `db_max_acu`.
- Fix: `reserved_concurrent_executions = 10`. Free, but AWS refuses it if the account concurrency limit is 10.

### AWS-14 / AGY-17: Build job holds deploy credentials and publishes before migrations

- Severity: Medium (raised from Low). Verified.
- Location: deploy.yml:12-14, 38-55, 136-158, 172-191.
- Risk: `pnpm install` and `next build` run third-party code in a job that can mint the OIDC token (pnpm the new static site is already in S3, and uncached pages serve new HTML against the old API with no invalidation.
- Fix: build with no `id-token`, pass `out/` and the zips as an artifact, and run the S3 sync in the deploy job after the function update.

## Low

- TF-16 / AWS-09: release zips are downloadable at `/releases/<sha12>.zip` (main.tf:168-184, deploy.yml:149-150; 48-bit key, private repo) and never expire. Fix: a Deny `s3:GetObject` for the CloudFront principal on `${aws_s3_bucket.assets.arn}/releases/*`, plus an `aws_s3_bucket_lifecycle_configuration` expiring `releases/` after 30 days.
- AWS-13 / AGY-18: actions pinned by tag (ci.yml:41,43,44,131,152,156; deploy.yml:26,28,33,136,167), CI has no `permissions:` block (mitigated: repo `default_workflow_permissions` is `read`). Fix: pin full commit SHAs; add `permissions: { contents: read }` to ci.yml.
- AWS-16: `http_version = "http2and3"` (compute.tf:133-138), free.
- AWS-18: infra/scripts/preflight-cutover.sh:81 reads `route53_zone_id`, which outputs.tf no longer has (dns module removed in 5f6e3e1). Dead script; do not re-add the output.
  - Superseded in part 2026-10-04: the owner re-added Route 53 as flat IaC (infra/dns.tf, no module; see "Route 53 DNS (added 2026-10-04)"). outputs.tf still has no `route53_zone_id`; it now has `name_servers` (outputs.tf:41-44) and `acm_validation_records` (outputs.tf:46-51). The script still reads `route53_zone_id` at :81, so it is still dead.
  - Status 2026-10-04 (vet #14, Low, open; owner ruling): `infra/scripts/preflight-cutover.sh` stays. It is dead: it reads the removed `route53_zone_id` output (`:81`) and nothing calls it. Either leave it dead or rewrite it against the current config (no `route53_zone_id`; `use_domain` now exists again as a local, main.tf:31).
- AGY-02: no `aws:SecureTransport` Deny in the bucket policy (main.tf:168-184). Only CloudFront OAC and HTTPS SDK callers exist and public access is blocked.
- TF-11: 0 of 21 variables have `description`; add validation for `region`, `lambda_memory_mb` (<= 10240), email and domain formats.
  - Status 2026-10-04 (vet #5, done): the stale `acm_certificate_arn` mention was removed from this entry; the "0 of 21 variables" count was left as written. Measured now: variables.tf has 20 variables (`acm_certificate_arn` removed, `dns_extra_records` added); only `dns_extra_records` has a `description` (variables.tf:64-65). `domain_name` (variables.tf:59-62) still has no validation.
- TF-12: outputs.tf:1-39 has no `description`. No secret leaks through outputs.
  - Status 2026-10-04: outputs.tf:1-39 is unchanged. The two new outputs, `name_servers` and `acm_validation_records` (outputs.tf:41-51), have descriptions.
- TF-13: compute.tf:5 `output_path = "${path.module}/.bootstrap.zip"` regenerates inside the repo. Fix: `"${path.module}/.terraform/bootstrap.zip"`.
  - Status 2026-10-04, done: compute.tf:5 is `output_path = "${path.root}/.terraform/bootstrap.zip"` (`path.root` equals `path.module` in this single root module). The old `infra/.bootstrap.zip` was untracked under TF-05.
- TF-14: terraform.tfvars.example:41 says "Default true"; variables.tf:122-124 default is `false`. With false nothing writes `AWS_REGION` or `AWS_DEPLOY_ROLE_ARN`.
  - Status 2026-10-04 (vet #11, Medium, open): `terraform.tfvars.example` was deleted (in fbe52b2). It was the only documentation of the inputs. Restore it; plain `git restore infra/terraform.tfvars.example` (the vet's command) no longer works because the deletion is committed, so use `git restore --source=fbe52b2^ infra/terraform.tfvars.example`. Fix its stale lines: `manage_github_variables` is documented as true but `variables.tf` defaults it to false (now variables.tf:130-133); it must also drop `acm_certificate_arn` and document `dns_extra_records`. The file is mostly comments (20 of 88 lines are example assignments), so it conflicts with the no-comments rule. Decide whether the rule applies to it (see NEW-OPS-02 and Open contradictions C6).
- TF-17: aws locked 6.65.0 (latest 6.67.0, within constraint). The archive block has no `constraints` line though main.tf:7 declares `~> 2.7`. Fix: `terraform -chdir=infra providers lock -platform=darwin_arm64 -platform=linux_amd64 -platform=linux_arm64`.
  - Status 2026-10-04 (vet #16, Low, open): latest aws 6.67.0, random 3.9.1, archive 2.8.1, github 6.13.0. The lock has aws 6.65.0, and the `archive` entry has no `constraints` line. Run `terraform init -upgrade` when ready. The Route 53 build was written and checked against aws 6.65.0 (provider source cited in NEW-DNS-00).
- TF-18: `this` naming throughout; terraform and provider blocks not split into terraform.tf / providers.tf; iam.tf:19 hard-coded partition; iam.tf:23-29 log statement redundant with AWSLambdaVPCAccessExecutionRole; deploy.yml:243 `grep -qF ""` always passes if `BUSINESS_NAME` is empty; GitHub provider token needs classic `repo` (github.tf:5), prefer a fine-grained PAT with Variables: write on this repo only.
  - Status 2026-10-04 (vet #17, Low, open, style guide): add `description` to every pre-existing variable and output (the new ones have them); move `required_version` and `required_providers` from `main.tf` to `terraform.tf`; prefer `main` over `this` for resource names; sort variables alphabetically. The new infra/dns.tf also uses `this`.
- LEAD-NOTIF (inert config): `lead_notification_email` is wired to `LEAD_NOTIFICATION_EMAILS` (compute.tf:48) but the Lambda has no `SES_FROM_ADDRESS`, so src/lib/email/index.ts:27-31 skips every send, and the role has no `ses:SendEmail`. terraform.tfvars.example:23 ("Blank sends no lead notification") implies setting it sends mail. Fix: correct the example text. The SES removal itself is an owner decision.
  - Status 2026-10-04: the example file is deleted (TF-14), so the text fix moves into its restore. The email side is vet #7, recorded under AWS-02.

## Site refresh readiness

- Content-Type (verified): aws-cli v2 uses `mimetypes.guess_type`, which reads `/etc/mime.types`. Ubuntu noble ships media-types 10.1.0, mapping mp4 to `video/mp4`, avif to `image/avif`, webp to `image/webp`, svg to `image/svg+xml`, ics to `text/calendar`, vtt to `text/vtt`, webmanifest, woff2 to `font/woff2`. Python 3.13's built-in table covers all but ics and woff2. No `.ics` exists in src/. Unverified inference: the `ubuntu-24.04-arm` runner image has media-types installed. Add a post-deploy `curl -sI` check of one file per extension.
- CSP: none exists today, so nothing blocks media or WebGL. three.js needs no `'unsafe-eval'`. If one is added later (optional, AWS-10): `img-src` and `media-src` `'self'` (plus `media_host` if `NEXT_PUBLIC_MEDIA_HOST` is set, next.config.ts:12-14), `worker-src blob:`, GTM, Turnstile and Calendly origins. It never existed, so adding it is allowed.
- Caching: none today. Target headers:

| Files                                 | Cache-Control                              |
| ------------------------------------- | ------------------------------------------ |
| `_next/static/*` (hashed)             | `public,max-age=31536000,immutable`        |
| HTML, RSC .txt, icon.svg, favicon.ico | `max-age=0,s-maxage=86400,must-revalidate` |
| media/_, video/_ (unhashed)           | `max-age=3600,s-maxage=31536000`           |

The `/*` invalidation on each deploy makes the long edge TTLs safe. Blocked on AWS-04.

- Range requests: work. `/video/*` uses managed CachingOptimized with no viewer-request function, no Lambda@Edge and no origin request policy (compute.tf:216-223); CloudFront with an S3 origin returns 206 natively; nothing strips Range. `compress` is unset (false) and `video/mp4` is not compressible anyway.
- What deploy.yml ships from `public/media` and `public/video`:
  - Only files committed to git, because CI builds from a checkout. No package script, lefthook hook or infra script runs `aws s3`.
  - Tracked `public/video/hero-bg.mp4` is 2,382,895 bytes, over the 2 MB budget.
  - Accepted but untracked files will not ship until committed: `mn-blue-hour-loop.mp4`, `mn-lake-dawn-dusk-mobile.mp4`, `lake-dusk-*`, `lake-boundary-waters.jpg`, `nate-chip-192.webp`, `env/studio-cool-gold.jpg`, `silhouettes/*`. If code referencing them merges without them, those URLs return 403, then the 404 page.
  - Rejected untracked files cannot ship from CI.
  - Local deploy from a dirty tree: the local `out/` already holds 56 rejected media files plus `hero-tech-*`, `high-falls-*`, `*-source.mp4` and `transitions/`. A manual `aws s3 sync out/` from a laptop would publish them. Never deploy locally.
  - If `hero-bg.mp4` is removed from git, it stays live in S3 until AWS-04 lands (the `--delete` sync then removes it).

## Owner decisions (risk flagged, not recommended: removed by owner)

All of these were removed in 5f6e3e1 (or efdeeba for the backend). None are in the fix order. Key lineage nuance: the old database was an `aws_db_instance`; the current Aurora cluster never had these settings, and they went when the owner deleted `modules/data`.

| Item                                                                                                                                                   | Risk if left                                                                                                                                                                  | What it would take                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Aurora `storage_encrypted` (TF-03, trivy AWS-0079)                                                                                                     | Lead PII and snapshots probably unencrypted at rest (provider default false; inferred, owner can check `terraform state show aws_rds_cluster.this \| grep storage_encrypted`) | ForceNew: a plain apply replaces the cluster and loses data. Snapshot, copy with encryption, restore via `snapshot_identifier`, then set `storage_encrypted = true`      |
| `deletion_protection`, final snapshot (`skip_final_snapshot = false`, `final_snapshot_identifier`), `backup_retention_period`, `copy_tags_to_snapshot` | `skip_final_snapshot = true` (main.tf:143) and 1-day default retention: a destroy or replacement leaves no recoverable copy                                                   | Add the attributes to the cluster; retention within 7 days is free, longer snapshots cost storage. `prevent_destroy` (High above) is the only guard that is not a re-add |
| VPC egress (AWS-02)                                                                                                                                    | Approved 2026-10-04 as IPv6 egress-only IGW; see "Approved change: IPv6 egress + SES". NAT and an IPv4 IGW stay removed                                                       | -                                                                                                                                                                        |
| Secrets Manager, SSM secret store, VPC interface endpoints (TF-06 move-to-SSM, AGY-07)                                                                 | Secrets stay readable via `GetFunction` on the deploy role                                                                                                                    | An interface endpoint is about $7.30 per AZ per month; plus code to read secrets at runtime                                                                              |
| SES sending                                                                                                                                            | Approved 2026-10-04; see "Approved change: IPv6 egress + SES". MAIL FROM, SNS bounce topics and the dns module stay removed                                                   | -                                                                                                                                                                        |
| WAF (`aws_wafv2_web_acl`, trivy AWS-0011)                                                                                                              | No rate limiting or managed rules in front of the forms                                                                                                                       | About $5/mo plus $1 per rule plus requests                                                                                                                               |
| CloudWatch alarms and SNS                                                                                                                              | No alerting on 5xx, DB CPU, outbox failures                                                                                                                                   | New alarms and topic                                                                                                                                                     |
| S3 versioning and encryption config on the site bucket (trivy AWS-0090, AWS-0132)                                                                      | No object rollback; bucket relies on default SSE-S3                                                                                                                           | Versioning and SSE resources; CMK about $1/mo                                                                                                                            |
| CloudFront `compress = true`                                                                                                                           | HTML, JS, CSS go out uncompressed                                                                                                                                             | One attribute per behavior; not a security item                                                                                                                          |
| `route53_zone_id` output (AWS-18)                                                                                                                      | preflight-cutover.sh stays dead                                                                                                                                               | Re-add output or delete the script                                                                                                                                       |
| Remote S3 backend, DynamoDB lock, `modules/` and `envs/` split (efdeeba, 5f6e3e1)                                                                      | Single laptop state copy, no locking (mitigated in TF-07)                                                                                                                     | A state bucket, `use_lockfile` restructure                                                                                                                               |
| Superseded 2026-10-04, two rows above:                                                                                                                 |

- SES row, "the dns module stay[s] removed": the owner explicitly re-added Route 53 on 2026-10-04 as flat IaC (infra/dns.tf, no module; registration stays at Squarespace). MAIL FROM and the SNS bounce topics stay removed. See "Route 53 DNS (added 2026-10-04)".
- `route53_zone_id` output row: still true. The output was not re-added; the script is kept dead by owner ruling (AWS-18, vet #14).
- Status 2026-10-04: vet #9 and vet #10 re-raise the Aurora rows and the Secrets Manager and remote-backend rows. They stay owner decisions; see Open contradictions C2.

## Dropped / refuted

| ID                                                                  | Reason                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AGY-01                                                              | The repo uses GitHub's immutable subject (`gh api .../actions/oidc/customization/sub` returns `use_immutable_subject: true`, prefix `repo:OWNER@ID/REPO@ID`). variables.tf:54 matches the real token. Applying AGY's regex would break every deploy. |
| AGY-04                                                              | The bucket is reproducible from CI (deploy.yml:149-158) and no app code writes S3. `force_destroy = true` (main.tf:157) is fine; only rollback zips are lost and they can be rebuilt.                                                                |
| AGY-10                                                              | `video/mp4` is not on CloudFront's compressible list and `compress` is already off, so Range requests are unaffected.                                                                                                                                |
| AGY-13                                                              | All four action tags exist (checkout v7, pnpm/action-setup v6, setup-node v7, configure-aws-credentials v6). Tag-vs-SHA pinning stays as AWS-13 (Low).                                                                                               |
| AGY-14, Content-Type half                                           | Ubuntu noble `/etc/mime.types` maps .mp4, .avif, .webp, .svg, .ics, .vtt, and aws-cli uses `mimetypes.guess_type`. A post-deploy `curl -sI` check is still advised. The cache half is AWS-04.                                                        |
| AGY-15                                                              | `/*` is one invalidation path; 1,000 paths per month are free. Only the contradicting comment at deploy.yml:206-208 remains.                                                                                                                         |
| AGY-16, failure claim                                               | Deploy works through the `ref:refs/heads/main` subject (iam.tf:99). The residual is the unused `environment:production` entry (AWS-06 / TF-15).                                                                                                      |
| AGY-07 SSM fix                                                      | Would need an SSM interface endpoint (no egress); moved to Owner decisions. The real exposure is deploy-role `GetFunction` (TF-06).                                                                                                                  |
| TF-02 / TF-03 / AGY-03, all but `prevent_destroy`                   | Re-adds of owner-removed settings; moved to Owner decisions.                                                                                                                                                                                         |
| AWS expert's SES note and the Terraform expert's SES-over-IPv6 note | SES is never reached: no `SES_FROM_ADDRESS`, and the role lacks `ses:SendEmail`. Removed with the email module in 5f6e3e1. The inert `LEAD_NOTIFICATION_EMAILS` is Low.                                                                              |
| Terraform expert's optional WAF and trivy AWS-0090 versioning       | Re-adds; withdrawn into Owner decisions.                                                                                                                                                                                                             |
| AWS-15 as a separate finding                                        | Folded into AWS-04 (the fix removes orphans).                                                                                                                                                                                                        |

## Assumptions and limits

- `terraform.tfvars` and `terraform.env` values were not read: `manage_github_variables` and whether `turnstile_secret` is set are unknown.
- Live AWS was not checked (Function URL policy, database encryption, region). AWS behaviour claims (Function URL grants, ForceNew on `storage_encrypted`, auto minor upgrade, Lambda OAC `x-amz-content-sha256`) come from docs and provider schema, not live calls.
- Read-only `gh api` calls were made: repo is private, default workflow token is `read`, OIDC subject is immutable, only a `dev` environment exists (no protection rules), action tags exist.
- Disclosure: the scratch copy at `scratchpad/infra-copy` unintentionally includes `.apply.log`, `.build*.log`, `.dev.log` and `.bootstrap.zip` (rsync excludes missed them). No agent opened them. Antigravity received only `scratchpad/agy-review`, which holds copies of `.tf` and `.yml` files.
- Disclosure: one grep printed a comment line (no value) from `infra/terraform.tfvars:30`.
- Disclosure: `git log -p -- infra/` streamed a few lines of the committed apply log into the AWS expert's history greps (resource attribute lines, no values quoted here).
- Infra `.tf` files contain code comments, contrary to the repo CLAUDE.md. Noted, not actioned.
  - Status 2026-10-04: still open as NEW-OPS-02 (vet #18).
- Status 2026-10-04: the apply identity was checked with IAM (NEW-DNS-03). Live DNS for the domain was read (see "Live DNS facts"). Everything else in the previous bullet about live AWS still holds.

## Approved change: IPv6 egress + SES (owner-approved 2026-10-04)

Decision: re-add outbound internet access and SES sending by the cheapest route, an IPv6 egress-only internet gateway. No NAT, no interface endpoints, no dns module, no Secrets Manager. This overrides the no-re-add rule for these two items only. Resolves AWS-02 and LEAD-NOTIF.

Superseded in part 2026-10-04: "no dns module" still holds (no module), but Route 53 itself was re-added as flat IaC in infra/dns.tf by a later owner decision. Status 2026-10-04 (superseded, newer text below): this change was not implemented in `infra/*.tf` when the review was merged (no egress-only gateway, no SES identity, no `ses_from_address` variable).

Status 2026-10-04 (later, implemented, not applied): the change is now in `infra/*.tf` and passes `terraform fmt -check`, `validate` and read-only plans (no apply run). Differences from the HCL below:

- SES resources live in a new `infra/ses.tf` (locals, identity, DKIM records, IAM), not in `main.tf` / `iam.tf`. Network edits are in `main.tf` (VPC, subnets, egress-only gateway, `::/0` route, `lambda_https_ipv6` rule) and `compute.tf` (`ipv6_allowed_for_dual_stack = true` on the app function only; `variables = merge({...}, local.ses_env)`).
- `use_ses` is `local.use_domain && var.ses_from_address != ""`. The identity is the domain (`var.domain_name`), not derived from the address.
- DKIM CNAMEs are Terraform-managed: `aws_route53_record.ses_dkim` with `count = 3` over the identity tokens (TTL 1800). This settles C5. The `ses_dkim_cnames` output was dropped.
- `ses_from_address` is the business mailbox (a real Workspace mailbox), not `no-reply@`, because the visitor confirmation says "reply to this message" and sets no Reply-To. Its value lives in 1Password field `ses_from_address` (item `xfaph2wkwtqfzbn7pbzlgdjxyi`), referenced by `TF_VAR_ses_from_address` in `infra/terraform.env`. Validation also accepts a set address while `domain_name` is empty (ignored).
- `ses:SendRawEmail` is still listed; SESv2 `SendEmail` is authorised by `ses:SendEmail` alone, so it grants nothing extra (optional tidy: drop it).
- No `ses:FromAddress` IAM condition; scope is the single identity ARN as approved.
- With `domain_name` empty the IPv6 egress resources are still created (so Turnstile works on the CloudFront URL path) but no Route 53, ACM, SES, DKIM or SES IAM resources are.

Facts verified 2026-10-04 (AWS and provider docs, local SDK, DNS over HTTPS):

- Is IPv6 egress free? Yes of fixed charges. The egress-only gateway has no hourly charge (AWS VPC docs); only internet data out is billed at EC2 rates (about $0.09/GB, effectively $0.00 for form posts and plain-text mail).
- Is SES free? No. SES is $0.10 per 1,000 emails a la carte ($0.16 per 1,000 on the Essentials plan; which plan the account is on is UNVERIFIED). The "free tier" is now a $200 credit programme for new accounts, not 3,000 free emails. At 2 emails per lead and 100 leads a month: about $0.02 to $0.03. Total added cost at low volume: under $0.10 a month. A NAT gateway would be about $33 a month and is not needed.
- Does the account have SES? Yes, in us-east-1 (the Terraform region). `get-account` shows sending enabled, `ProductionAccessEnabled` false (sandbox: 200 messages per 24 h, 1 per second) and a previous production-access request for a different website DENIED. One unrelated domain identity exists; none for `legacybenefitsmn.com`. The owner notification will work in the sandbox once the new domain identity verifies, because its one recipient is on `legacybenefitsmn.com`. The visitor confirmation fails until production access is granted (logged and swallowed, `src/lib/email/index.ts:52-55`).
- Dual-stack endpoint: the installed SDK (`@aws-sdk/client-sesv2` 3.1127.0) resolves `email.us-east-1.amazonaws.com` with `AWS_USE_DUALSTACK_ENDPOINT` unset and `email.us-east-1.api.aws` with it `true` (ran offline). `email.us-east-1.api.aws` and `challenges.cloudflare.com` have AAAA records; `hooks.zapier.com` and `email.us-east-1.amazonaws.com` do not.
- Provider: `vpc_config.ipv6_allowed_for_dual_stack` exists in aws 6.65.0 (default false).
- DKIM verification needs only the three CNAMEs; no MX, SPF or MAIL FROM change, so Google Workspace mail is untouched and DMARC passes through DKIM alignment. "Easy DKIM always returns exactly three tokens" is inferred from AWS docs.
- Dual-stack SES and DKIM records can be created in one apply alongside `dns.tf`: UNVERIFIED beyond the dependency graph (DKIM records depend on the zone and identity, not on certificate validation).
- A fresh Gemini review objected to the per-resource `region` argument, the dual-stack env var and an SES interface endpoint. Each was checked and rejected (`validate` passes; AWS lists `email.us-east-1.api.aws`; an endpoint would cost money and is not needed).

Checked: the HCL below was applied to a scratch copy of `infra/*.tf` (plus the lock file). `terraform fmt -check` exit 0; `terraform validate`: "Success! The configuration is valid." No plan was run.

### Replacement risk (checked in provider source, aws v6.65.0)

| Change                                                         | Result                                                                            | Source                                                                                                                                                                              |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aws_vpc.assign_generated_ipv6_cidr_block` false to true       | In place (associates an Amazon /56)                                               | `internal/service/ec2/vpc_.go`: attribute has no ForceNew (91-95); update calls `modifyVPCIPv6CIDRBlockAssociation` (357-371); CustomizeDiff only marks the CIDR computed (510-519) |
| `aws_subnet.ipv6_cidr_block` added                             | In place, because the subnets' current `assign_ipv6_address_on_creation` is false | `vpc_subnet.go`: `ForceNewIf("ipv6_cidr_block")` replaces only when the old `assign_ipv6_address_on_creation` is true (195-207); update associates the block (353-364)              |
| `aws_subnet.assign_ipv6_address_on_creation` false to true     | In place, run after the CIDR association                                          | `vpc_subnet.go:403-407`                                                                                                                                                             |
| `aws_lambda_function` `vpc_config.ipv6_allowed_for_dual_stack` | In place (`UpdateFunctionConfiguration`)                                          | `internal/service/lambda/function.go:973-980`                                                                                                                                       |

So Aurora's subnets and `aws_db_subnet_group.this` are not touched, and separate Lambda-only subnets are not needed. Trap for later: once `assign_ipv6_address_on_creation = true` is applied, any change to these subnets' `ipv6_cidr_block` (including removing it) forces subnet replacement, which would take Aurora's subnet group with it. To roll back, first apply `assign_ipv6_address_on_creation = false`, then remove the CIDR in a second apply.

### HCL

main.tf, locals (after main.tf:32; placed after `site_url` so fmt does not realign existing lines):

```hcl
  use_ses    = var.ses_from_address != ""
  ses_domain = local.use_ses ? split("@", var.ses_from_address)[1] : ""
  ses_env = local.use_ses ? {
    SES_FROM_ADDRESS           = var.ses_from_address
    AWS_USE_DUALSTACK_ENDPOINT = "true"
  } : {}
```

main.tf:35-41, `aws_vpc.this`: add `assign_generated_ipv6_cidr_block = true`.

main.tf:44-52, `aws_subnet.private`: add

```hcl
  ipv6_cidr_block                 = cidrsubnet(aws_vpc.this.ipv6_cidr_block, 8, count.index)
  assign_ipv6_address_on_creation = true
```

main.tf, after the route table (main.tf:54-57). The S3 gateway endpoint (main.tf:68-75) stays as is:

```hcl
resource "aws_egress_only_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id
  tags   = { Name = var.name }
}

resource "aws_route" "private_ipv6_egress" {
  route_table_id              = aws_route_table.private.id
  destination_ipv6_cidr_block = "::/0"
  egress_only_gateway_id      = aws_egress_only_internet_gateway.this.id
}
```

main.tf, after `lambda_all` (main.tf:89-93). That rule is `cidr_ipv4 = "0.0.0.0/0"` only, so IPv6 needs its own rule. No duplicate exists:

```hcl
resource "aws_vpc_security_group_egress_rule" "lambda_https_ipv6" {
  security_group_id = aws_security_group.lambda.id
  cidr_ipv6         = "::/0"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}
```

main.tf, end of file (after main.tf:189):

```hcl
resource "aws_sesv2_email_identity" "sender" {
  count = local.use_ses ? 1 : 0

  email_identity = local.ses_domain
}
```

compute.tf:25-28, `aws_lambda_function.app` `vpc_config`: add `ipv6_allowed_for_dual_stack = true`. The migrate function (compute.tf:268-271) makes no outbound calls and keeps the default. compute.tf:31 and :49: wrap the map, `variables = merge({ ...existing keys... }, local.ses_env)`.

iam.tf, after iam.tf:51:

```hcl
data "aws_iam_policy_document" "lambda_ses" {
  count = local.use_ses ? 1 : 0

  statement {
    actions   = ["ses:SendEmail", "ses:SendRawEmail"]
    resources = [aws_sesv2_email_identity.sender[0].arn]
  }
}

resource "aws_iam_role_policy" "lambda_ses" {
  count = local.use_ses ? 1 : 0

  name   = "${var.name}-lambda-ses"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.lambda_ses[0].json
}
```

variables.tf, after variables.tf:125:

```hcl
variable "ses_from_address" {
  type    = string
  default = ""

  validation {
    condition     = var.ses_from_address == "" || can(regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", var.ses_from_address))
    error_message = "ses_from_address must be empty or one address on the domain SES verifies, e.g. no-reply@example.com."
  }
}
```

outputs.tf, after outputs.tf:39:

```hcl
output "ses_dkim_cnames" {
  value = local.use_ses ? {
    for t in aws_sesv2_email_identity.sender[0].dkim_signing_attributes[0].tokens :
    "${t}._domainkey.${local.ses_domain}" => "${t}.dkim.amazonses.com"
  } : {}
}
```

With `ses_from_address` empty, Terraform creates no identity and no policy, and the Lambda gets no `SES_FROM_ADDRESS` or `AWS_USE_DUALSTACK_ENDPOINT` key. src/lib/email/index.ts:27-34 then keeps skipping sends, as today.

### SES

- What was removed (`git show 5f6e3e1^:infra/modules/email/*`): `aws_ses_domain_identity` (v1 API), a Route 53 TXT verification record plus `aws_ses_domain_identity_verification`, `aws_ses_domain_dkim` with three Route 53 CNAMEs, `aws_ses_domain_mail_from` (`mail.<domain>`) with MX and SPF records, and an SNS topic for bounce and complaint notifications. The IAM grant was `ses:SendEmail`/`ses:SendRawEmail` on `identity/*` (modules/app/main.tf:336-339). `SES_FROM_ADDRESS` defaulted to `no-reply@<domain>`.
- Smallest re-add: one `aws_sesv2_email_identity` for the domain. With SES v2 a domain verifies through Easy DKIM, so no TXT record is needed. Route 53 is not managed anywhere in `infra/*.tf` (the only `zone` match is `aws_availability_zones`), so the owner adds the three CNAMEs from the `ses_dkim_cnames` output at their DNS host by hand. MAIL FROM, the SNS topics and the dns module are not re-added. The default MAIL FROM is an amazonses.com subdomain; DMARC still passes through DKIM alignment on the From domain.
  - Superseded 2026-10-04: Route 53 is now managed in infra/dns.tf when `domain_name` is set. The three SES DKIM CNAMEs could then go into `dns_extra_records` (its validation, variables.tf:74-79, only blocks A, AAAA and CNAME at the apex and `www`) instead of being added by hand. Not decided; see Open contradictions C5.
- IAM: send rights only, scoped to the identity ARN. No configuration set is used, so no configuration-set ARN is needed.
- Env names the code reads: `SES_FROM_ADDRESS` (index.ts:27, wired above); `LEAD_NOTIFICATION_EMAILS` (index.ts:82, already wired at compute.tf:48); `BUSINESS_NAME` and `BUSINESS_PHONE` (index.ts:116-117, already wired); `AWS_REGION` (index.ts:9, set by Lambda itself). `SES_FROM_ADDRESS` must be on the verified domain.
- Sandbox: new SES accounts can send only to verified addresses. Until the owner requests production access (free, manual, from the SES console), the visitor confirmation email (leads.ts:63) fails, and the failure is logged and swallowed (index.ts:52-55). The owner notification works only if each `LEAD_NOTIFICATION_EMAILS` address is verified in the SES console. Unverified: some reports say that in the sandbox IAM also checks the recipient identity ARN. If CloudWatch shows AccessDenied naming a recipient identity, that is the cause, and production access removes it.

### SDK dual-stack scoping

- The app bundles `@aws-sdk/client-sesv2` 3.1127.0 (package.json:40; pnpm-lock.yaml:186; build-api-bundle.mjs:22 externalises only `pg-native` and `cloudflare:sockets`). It reads `AWS_USE_DUALSTACK_ENDPOINT` (`@smithy/core` config: `ENV_USE_DUALSTACK_ENDPOINT`, `NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS`). Verified offline, with no network call, by resolving the endpoint in node: unset gives `email.us-east-1.amazonaws.com`; `true` gives `email.us-east-1.api.aws` (likewise for us-east-2 and us-west-2).
- Decision: set it in the Lambda environment, not in code. SESv2 is the only AWS SDK client in src/ and package.json, and Lambda credentials come from environment variables, so no STS call is affected. The code route (`useDualstackEndpoint: true` in index.ts:8-10) would also break the exact-config assertions at index.test.ts:178 and :187. Ceiling: if an S3 client is added later, the global flag would send it to `s3.dualstack.<region>.amazonaws.com` over the egress-only IGW instead of the IPv4 gateway endpoint, with internet data charges. At that point, move the flag into the SES client constructor.
- Region: AAAA was confirmed only for `email.us-east-1.api.aws`, `email.us-east-2.api.aws` and `email.us-west-2.api.aws`. The owner runs `dig AAAA email.<region>.api.aws` for the real `region`.

### Turnstile (AWS-02)

`challenges.cloudflare.com` has AAAA. After apply A, the owner sets `turnstile_secret` and applies again (an in-place Lambda env update), then submits one test form. With egress missing, turnstile.ts:35-41 returns false and every form gets 403. Rollback is to blank the secret and apply. Once a test submit passes, AWS-02 is resolved.

### Caveats

- IPv4-only hosts fail: the VPC has no IPv4 route out. CRM transports are env-gated: `CRM_TRANSPORT` is hard-coded `"mock"` (compute.tf:44); `zapier` needs `CRM_TRANSPORT=zapier` plus `MEDICAREPRO_ZAPIER_HOOK_URL`, and `webhook` needs `CRM_TRANSPORT=webhook` plus `MEDICAREPRO_WEBHOOK_URL` (src/lib/crm/index.ts:29-43). Neither is wired, so neither is active. `hooks.zapier.com` has no AAAA, so the Zapier transport cannot work on this design. A webhook works only if its host has AAAA.
- Happy eyeballs (Lambda runtime `nodejs22.x`, compute.tf:17 and :260). Verified from the Node 22 `net` docs: `autoSelectFamily` defaults to true (since v20.0.0), and "the first returned AAAA address is tried first, then the first returned A address", with a 250 ms per-attempt timeout. Verified from source: Node 22's bundled undici passes `autoSelectFamily` only when it is set (deps/undici lib/dispatcher/client.js:209), so `fetch` gets Node's default. Inferred, not measured: the SDK's `node:https` path also uses the default, and on a dual A/AAAA host IPv6 is tried first with no hang. An IPv4-only host fails after the connect timeout.
- trivy AWS-0104 (unrestricted egress) stays accepted; the new rule is narrower than the existing IPv4 one.

### Cost

The egress-only IGW has no hourly charge. Internet data out is about $0.09/GB (form posts and emails, so negligible). SES costs $0.10 per 1,000 emails. Fallback only if an IPv4-only host such as Zapier becomes required: a NAT gateway, about $33/mo plus data processing (not approved).

### Apply notes for the owner

1. Apply A (network), with `ses_from_address` unset. Expected: `Plan: 3 to add, 4 to change, 0 to destroy`, plus anything from earlier fix-order steps. Add: `aws_egress_only_internet_gateway.this`, `aws_route.private_ipv6_egress`, `aws_vpc_security_group_egress_rule.lambda_https_ipv6`. Update in place: `aws_vpc.this`, `aws_subnet.private[0]`, `aws_subnet.private[1]`, `aws_lambda_function.app` (`vpc_config` only). Nothing on `aws_rds_cluster`, `aws_rds_cluster_instance`, `aws_db_subnet_group`, `aws_route_table` or `aws_vpc_endpoint`. Any "must be replaced", `-/+` or a non-zero destroy count: stop.
2. Terraform orders the subnet updates before the Lambda update, because the function references the subnets. AWS warns that turning on dual-stack can briefly disrupt connectivity while Lambda swaps ENIs. Apply at a quiet time and not while the deploy workflow runs (its `update-function-code` would conflict with a function mid-update; inferred).
3. Set `turnstile_secret` and apply (1 change, the Lambda env). Test one form.
4. Apply B (SES): set `ses_from_address = "no-reply@<domain>"`. Expected: `Plan: 2 to add, 1 to change, 0 to destroy` (`aws_sesv2_email_identity.sender[0]`, `aws_iam_role_policy.lambda_ses[0]`; the Lambda env gains `SES_FROM_ADDRESS` and `AWS_USE_DUALSTACK_ENDPOINT`).
5. Add the three CNAMEs from `terraform output ses_dkim_cnames` at the DNS host. Wait for the identity to show Verified. Verify the notification recipients, or request production access.

Superseded in part 2026-10-04: "the DNS host" is Route 53 once the Route 53 first apply has run (C5). The expected plan counts in steps 1 and 4 assume an existing deployment; local state now holds 0 resources (C3).

Superseded 2026-10-04 (later): apply notes 1 to 5 describe two applies (A network, B SES) and hand-added CNAMEs. The repo now applies everything in one run, with the DKIM CNAMEs in Terraform (C5). Expected plan with the domain set: `Plan: 71 to add, 0 to change, 0 to destroy` (see "First apply: one apply, one manual step"). Notes 2 (dual-stack disruption) and 3 (set `turnstile_secret`, then test one form) still hold in spirit; with an empty state there is no existing function to disrupt.

## Proposed fix order

1. Repo hygiene, zero AWS: TF-01 gitignore `infra/terraform.env`; TF-05 `git rm --cached` the infra logs and `.bootstrap.zip` and ignore them; TF-13 move the archive `output_path` into `.terraform/`. History purge is the owner's call.
2. Local state hygiene (TF-07): `chmod 600`, encrypted copy via 1Password `op document`, owner deletes the stale tfplan.
3. Owner confirms live state: Function URL policy (TF-04, `aws lambda get-policy` run by the owner), whether the Turnstile secret is set (AWS-02), and the TF-07 state-size anomaly (`terraform state list`).
4. TF-04 option B plus AWS-11.
5. Approved change (IPv6 egress + SES): apply A (network), then the Turnstile secret, then apply B (SES). Resolves AWS-02 and LEAD-NOTIF.
6. AWS-04: deploy.yml cache-control split and exclude `_next/static/*` from `--delete`. Must land before the visual refresh ships.
7. AWS-03: 403 mapping.
8. TF-02: `prevent_destroy` (with TF-08 `ignore_changes` in the same block).
9. TF-06 / AGY-12: trim the deploy role (drop `lambda:UpdateFunctionConfiguration`, `GetFunctionConfiguration`); AGY-11 / AWS-08: drop the Lambda role S3 write.
10. TF-09, TF-08, TF-10 / AGY-19, AWS-14 / AGY-17, TF-15 / AWS-06, then the remaining Mediums (AWS-10, AWS-12).
11. Lows.

Status 2026-10-04 for this order: step 1 TF-01 is withdrawn (owner ruling); TF-05 untracking and TF-13 are done; the TF-05 `.gitignore` lines remain. Step 2: the stale tfplan is no longer on disk (TF-07). TF-09 from step 10 is implemented. The Route 53 first apply (runbook below) is not placed in this order; where it goes relative to steps 3-5 is Open contradiction C3.

## Route 53 DNS (added 2026-10-04)

Source: terraform skill (`terraform:terraform-style-guide`) and terraform-registry MCP review of `infra/`, 2026-10-04, updated after the Route 53 build, merged here from the former vet remaining-work list.

Current truth: on 2026-10-04 the owner explicitly re-added Route 53 as flat IaC (infra/dns.tf; no module). Registration stays at Squarespace. `domain_name` empty means no DNS resources and the default CloudFront URL. This overrides the old hard limit about re-adding it (owner ruling).

`terraform fmt -check` and `terraform validate` pass. Local state holds 0 resources. Read-only plans (no apply):

- `TF_VAR_domain_name=legacybenefitsmn.com`: Plan 61 to add.
- `TF_VAR_domain_name` empty: Plan 49 to add, no Route 53 or ACM resources, default `*.cloudfront.net` certificate and URL.

Superseded 2026-10-04 (later), after the IPv6 + SES build and the `domain_name` 1Password field being set (`op run --env-file=infra/terraform.env -- terraform -chdir=infra plan -input=false -lock=false`, no `-out`, rc 0, 0 warnings, 0 errors):

- Domain set (the 1Password field now reads `legacybenefitsmn.com`): `Plan: 71 to add, 0 to change, 0 to destroy.` The delta over 61 is 10: egress-only gateway, `::/0` route, IPv6 security-group rule, SES identity, three DKIM records, SES IAM policy, the `google_verification` extra record, and `terraform_data.name_servers`.
- Domain empty: `Plan: 52 to add` (49 plus the three IPv6 network resources); no Route 53, ACM, SES, DKIM or `terraform_data` resources.
- The app function plans `ipv6_allowed_for_dual_stack = true`; the migrate function stays false.
- An earlier note that `mise exec -- terraform` fails here (mise tries to install postgres) was worked around with the installed 1.16.1 binary.

### NEW-DNS-00: Route 53 build (done)

- [x] Route 53 hosted zone, us-east-1 ACM certificate (per-resource `region` argument, aws provider 6.65.0 locked) with DNS validation, `aws_acm_certificate_validation`, alias A/AAAA for apex and `www`, CloudFront aliases and viewer certificate: `infra/dns.tf`, `compute.tf`, `variables.tf`, `outputs.tf`. Flat files, no module.
- [x] `acm_certificate_arn` variable removed (Terraform creates the certificate); `TF_VAR_acm_certificate_arn` line removed from `infra/terraform.env`.
- [x] `dns_extra_records` variable (map of `{name, type, ttl, records}`, carry-over records) stored in 1Password field `op://Development/xfaph2wkwtqfzbn7pbzlgdjxyi/dns_extra_records` (item "legacy-benefits-mn-infra"), referenced from `infra/terraform.env`. Holds `mx` (five Google ASPMX), `apex_txt` (SPF `v=spf1 include:_spf.google.com ~all`) and `dkim_google` (3 chunks of 201/201/8 characters). TTL 14400 (stated once for all three entries in the original work-list; only the MX TTL is confirmed under Live DNS facts). Checked against live DNS.
  - Status 2026-10-04 (later): now four keys. Added `google_verification`: CNAME `isqbop7e6zek` to `gv-g4wgakmz3yjmin.dv.googlehosted.com`, TTL 14400, the Google Workspace domain-verification record. Source: the Squarespace DNS screenshots, confirmed live over DoH. All custom records show 4 hours (14400) on screen. The screenshot cuts the Google DKIM value off after `AAOCAQ...`, so the full 410-character value came from live DNS (stored joined with the three characters `" "`, equal to live). Verified by independent re-reads of all 8 screenshots and a plan whose `aws_route53_record.extra` entries show no diff.
- [x] TXT quoting fixed: the aws provider wraps every TXT/SPF value in quotes itself (`record.go` v6.65.0 `flattenTxtEntry`), so values are stored without outer quotes and long values are joined with the three characters `" "`. The earlier guidance to write `"\"chunk1\" \"chunk2\""` was wrong.
- [x] Plan-time bug fixed: `aws_route53_record.cert_validation` now uses `for_each = toset(local.site_hostnames)` plus `local.cert_validation` (dns.tf:35-44), not keys derived from unknown certificate attributes.
- [x] `aws_acm_certificate_validation` create timeout 6h (dns.tf:53-55), so one apply survives the nameserver switch.
- [x] `compute.tf`: the viewer certificate reads from the Terraform-managed ACM certificate (compute.tf:249-253), and `BUSINESS_ADDRESS` was added to the app Lambda environment (compute.tf:44). Both were in the working-tree diff the vet listed as "not yet reviewed by you"; both are now committed in fbe52b2.
- Also done in the same session and recorded under their review IDs: TF-05 untracking, TF-13 archive path, TF-11 stale reference (vet #5).

### Decisions recorded

- `infra/scripts/preflight-cutover.sh` stays (owner ruling). It is dead (AWS-18, vet #14).
- Route 53 hosts DNS and registration stays at Squarespace (owner ruling, overriding the old hard limit about re-adding it).
- The apex and `www` serve the site. `_domainconnect` (CNAME to `_domainconnect.domains.squarespace.com`, Squarespace's auto-setup service only) is not carried over. No DMARC record exists today and none is added (NEW-DNS-01).
- `prevent_destroy` on the zone and an `"@"` apex handler were not added (owner has not asked). Use `""` as the apex name in `dns_extra_records`.
- Owner ruling 2026-10-04: `infra/terraform.env` contains only `op://` references, so it does not need to be gitignored (TF-01 withdrawn).

### Live DNS facts for legacybenefitsmn.com (measured 2026-10-04)

- Authoritative NS: `ns-cloud-a1` to `ns-cloud-a4.googledomains.com`.
- The apex has no A/AAAA and `www` is NXDOMAIN: no live site on the domain.
- Google Workspace mail: five legacy ASPMX MX records, TTL 14400; SPF `v=spf1 include:_spf.google.com ~all`; DKIM at `google._domainkey` (2048-bit); no DMARC.
- DNSSEC is enabled: DS `37879 8 2 9C28ADC646067A8075C0AE69F47FD86D015F91976DEB7D0CF69F2FFA A325E415` at the `.com` parent, TTL 86400.
  - Superseded 2026-10-04 (later): DNSSEC is now OFF. The Squarespace DNSSEC toggle shows off, and the Verisign RDAP record for the domain shows `delegationSigned: false`, last changed 2026-10-05T01:31:01Z. Google and Cloudflare DoH `DS` queries return NODATA with AD false. Measured 2026-10-05 about 02:15 UTC. Direct `dig` to the gtld servers and the `ns-cloud-a*` servers timed out (port 53 egress is blocked from this host), so the parent-authoritative answer is UNVERIFIED by `dig`; the conclusion rests on RDAP plus recursive NODATA. The old DS had TTL 86400, so a resolver that cached it just before 01:31Z can keep it until about 01:31Z on 2026-10-06. Hours remaining at the 02:15Z measurement: about 23; the guaranteed-clear time is about 02:00 UTC 2026-10-06 (21:00 CDT 2026-10-05). Observed Google and Cloudflare resolvers already show no cached DS; Quad9 and other validating resolvers are unmeasured. Do not switch the Squarespace nameservers before then if zero SERVFAIL risk is wanted.
- `_domainconnect` CNAME to `_domainconnect.domains.squarespace.com` exists and is not carried over.
- One more NSEC3 owner hash, `2efu9f34q08060oi6vdekkf5sablv6to`, is unidentified after about 1.1 million candidate names. The owner must read the Squarespace DNS panel (NEW-DNS-06).
  - Superseded 2026-10-04 (later): the Squarespace DNS screenshots show the custom records are exactly five MX, the SPF TXT, `google._domainkey` TXT and CNAME `isqbop7e6zek` (plus `_domainconnect`). The unidentified hash is most likely the `isqbop7e6zek` verification CNAME (inferred, not hash-checked). It is now carried over.
- The screenshots also show: nameservers `ns-cloud-a1` to `a4.googledomains.com` with a "USE CUSTOM NAMESERVERS" button, no host records, no forwarding, Workspace connected, domain lock on, renewal 2027-01-19. Every Squarespace domain page carries a banner that the domain is managed by Google Workspace and changes could affect it; the nameserver button is not greyed out.

### Terraform research: why one manual step remains (2026-10-04)

From Terraform and AWS docs:

- Core Terraform already orders zone before its dependents through references.
- ACM DNS validation needs the validation CNAME publicly resolvable (AWS docs); ACM gives up after 72 hours.
- No Terraform feature waits for a registrar change: not actions, deferred actions, Stacks (paid HCP), query, check or ephemeral resources.
- No Squarespace provider or public nameserver API exists. `aws_route53domains_registered_domain` works only for domains registered with Route 53.
- Therefore a zero-manual single apply is impossible while the domain stays at Squarespace. Recommended run: one `terraform apply` (no `-target`), and one manual Squarespace nameserver paste while it waits in `aws_acm_certificate_validation` (6h timeout; a rerun resumes within ACM's 72 hours).
- Reusable delegation sets (`aws_route53_delegation_set`) keep nameservers across zone recreation but need a first apply, so they are not recommended unless the zone may be recreated.

### First apply: one apply, one manual step

Superseded 2026-10-04 (later): steps 1 to 3 are done and step 2 is reduced to a wait; steps 4 to 8 are refined by the "Runbook update 2026-10-04" list after step 8. The original steps are kept below as written.

Do these in order. Do not run the apply before steps 1 to 3.

1. **Set the domain.** The `domain_name` field in 1Password is empty right now. Put `legacybenefitsmn.com` in it. With it empty, the apply creates no DNS and the site uses the default CloudFront URL. (A duplicate empty `domain_name` field existed; the owner has since resolved it.)
2. **Turn DNSSEC off at Squarespace and wait about 24 hours.** The DS record `37879 8 2 9C28ADC6…` (TTL 86400) is published at the `.com` parent. Moving nameservers without removing it makes validating resolvers return SERVFAIL for the whole domain, mail included. Confirm with `dig +short DS legacybenefitsmn.com @1.1.1.1` returning nothing.
3. **Compare the Squarespace DNS panel to `dns_extra_records`.** One NSEC3 owner hash (`2efu9f34q08060oi6vdekkf5sablv6to`) could not be identified after about 1.1 million candidate names. Add any record the panel lists that is not already carried over.
4. **Run the apply, no `-target`:** `op run --env-file=infra/terraform.env -- terraform -chdir=infra apply`.
5. **While it waits on certificate validation,** get the zone nameservers from a second terminal: `aws route53 list-hosted-zones-by-name --dns-name legacybenefitsmn.com`, then `aws route53 get-hosted-zone --id <id> --query DelegationSet.NameServers`. `terraform output` does not work mid-apply.
6. **Check Route 53 answers first:** `dig @<ns> legacybenefitsmn.com MX`, `TXT`, and `dig @<ns> google._domainkey.legacybenefitsmn.com TXT`.
7. **Paste the four nameservers** into Squarespace's custom nameserver settings. ACM then validates and the apply finishes (timeout 6h; rerun if it times out, within ACM's 72 hours).
8. **After propagation:** test mail send and receive, load `https://legacybenefitsmn.com` and `https://www.legacybenefitsmn.com`.

Mail records exist in Route 53 before the nameserver switch, because they do not depend on certificate validation.

Runbook update 2026-10-04 (later). Status of the original steps: 1 done (`domain_name` reads `legacybenefitsmn.com`); 2 done at the registry (DNSSEC off), cache wait open; 3 done (panel read, `google_verification` carried over, NEW-DNS-06). Remaining order:

1. **Before apply (owner, 1Password):** set the `turnstile_secret` field if bot protection is wanted (empty means forms are accepted without verification, `turnstile.ts:29`; it does not block plan or apply). `media_host`, `gtm_id` and `calendly_url` are empty; those features stay off. `ses_from_address` and `TF_VAR_ses_from_address` are already set. `acm_certificate_arn` is an orphan empty 1Password field with no variable; harmless.
2. **Make sure the sender mailbox exists in Google Workspace** (the `ses_from_address` value is the business mailbox), so visitor replies are not bounced.
3. **Wait for the DNS cache window:** start the apply no earlier than about 02:00 UTC 2026-10-06 (see Live DNS facts). If port 53 is open on some network, re-check with `dig +norec DS legacybenefitsmn.com @a.gtld-servers.net` (expect an empty answer). If the apply is started earlier and validation times out (6h), rerun the same apply after the switch; ACM allows 72 hours and the zone and records are kept in state.
4. **Run the apply, no `-target`:** `op run --env-file=infra/terraform.env -- terraform -chdir=infra apply`. Expect `71 to add, 0 to change, 0 to destroy`; stop on any other count. If it reports "state locked", check no terraform process runs, then `terraform -chdir=infra force-unlock <id from the error>` (a leftover `infra/.terraform.tfstate.lock.info` exists; with the local backend the real lock is an OS file lock, so this is most likely harmless, inferred). Terraform binary: 1.16.1; `mise exec -- terraform` fails here, so use the installed binary.
5. **Copy the four nameservers** printed by `terraform_data.name_servers` ("Set these nameservers ... at Squarespace"), which depends only on the zone and so should print before the validation wait (inferred from the dependency graph, not observed). Fallback: the AWS CLI commands in the original step 5.
6. **Check Route 53 answers first.** Port 53 is blocked from some networks, so use the API: `aws route53 test-dns-answer --hosted-zone-id <id> --record-name legacybenefitsmn.com --record-type MX` (and `TXT`, `google._domainkey.legacybenefitsmn.com TXT`, `isqbop7e6zek.legacybenefitsmn.com CNAME`), or `dig @<ns> ...` from a network with port 53 open.
7. **Paste the four nameservers in Squarespace:** Domains, then `legacybenefitsmn.com`, then DNS, then Domain Nameservers (`account.squarespace.com/domains/managed/legacybenefitsmn.com/dns/domain-nameservers`), then "USE CUSTOM NAMESERVERS", and replace `ns-cloud-a1` to `a4.googledomains.com` with the four Route 53 names. Accept the Workspace-managed banner; mail depends only on the MX, SPF, Google DKIM and verification records, all carried over. After the switch the Squarespace DNS Settings panel has no effect. ACM then validates and the apply finishes.
8. **After propagation:** load `https://legacybenefitsmn.com` and `https://www.legacybenefitsmn.com`; test Google Workspace mail send and receive.
9. **SES (manual):** `aws sesv2 get-email-identity --email-identity legacybenefitsmn.com` should show `VerificationStatus` SUCCESS (no email click for a domain identity; SES finds the DKIM CNAMEs itself, up to 72 hours). Request SES production access in the SES console (us-east-1), citing `legacybenefitsmn.com`, transactional email only, if visitors must receive the confirmation; a prior request on this account for another site was denied and may be again. This is not doable in Terraform. Until then only the owner notification (on-domain recipient, covered by the domain identity) is delivered. Any future off-domain recipient must be verified in the console while in the sandbox.
10. **App deploy and test:** deploy the app bundle through CI (the Lambda starts as a 503 placeholder), submit one test lead, and read CloudWatch `/aws/lambda/<name>` for `[email] send failed` or Turnstile errors. If IPv6 connect timeouts appear, add `NODE_OPTIONS=--dns-result-order=ipv6first` to the Lambda environment (Node happy eyeballs is on by default in Node 22; runtime behaviour in Lambda is UNVERIFIED).

The apply blocks on `aws_acm_certificate_validation` (6h timeout) until step 7 is done, and CloudFront and the aliases follow it.

### NEW-DNS findings

- [ ] **NEW-DNS-01 (vet #12, optional): DMARC record.** None exists. A monitoring record `_dmarc` TXT `v=DMARC1; p=none;` can go into `dns_extra_records`. Not added without the owner's say.
- [ ] **NEW-DNS-02 (vet #13): zone protection.** Recreating the zone issues new nameservers and breaks delegation until Squarespace is updated. `lifecycle { prevent_destroy = true }` on `aws_route53_zone.this` prevents that but also blocks setting `domain_name` back to empty. Owner's call.
- [x] **NEW-DNS-03 (vet #6, done): apply identity permissions.** Local terraform runs as an IAM user with AdministratorAccess and AmazonS3FullAccess. `iam simulate-principal-policy` returned allowed for all 21 route53, acm and cloudfront actions checked. Permission boundaries and SCPs were not checked. The CI deploy role needs no change. Required actions as listed by the vet: route53:* and ACM RequestCertificate, DescribeCertificate, DeleteCertificate, ListTagsForCertificate, AddTagsToCertificate. Recheck if the apply identity changes.
- [x] **NEW-DNS-04 (done 2026-10-04): print the nameservers during the blocked apply.** Implemented as `terraform_data.name_servers` (dns.tf:22-30, `count = local.use_domain ? 1 : 0`, `triggers_replace` the zone nameservers). Original text: Add a `terraform_data` resource with a `local-exec` echo of the zone nameservers (`count = local.use_domain ? 1 : 0`, `triggers_replace = aws_route53_zone.this[0].name_servers`) so they print while the apply waits. Caveats: provisioners are a last resort; the output may scroll past; that it runs before the validation wait is an inference, not verified.
- [ ] **NEW-DNS-05 (owner action, runbook step 2): remove DNSSEC before the switch.** The DS record at the `.com` parent must be gone before the nameserver change.
  - Status 2026-10-04 (later): DNSSEC removed at the registry (about 01:31Z 2026-10-05). Open only as a cache wait: switch no earlier than about 02:00 UTC 2026-10-06 (see Live DNS facts). Parent-direct `dig` is UNVERIFIED (port 53 blocked).
- [x] **NEW-DNS-06 (done 2026-10-04, owner action, runbook step 3): read the Squarespace DNS panel** to identify the unknown NSEC3 owner and carry any missing record. Done from the screenshots: the owner is most likely the `isqbop7e6zek` verification CNAME (inferred), now in `dns_extra_records` as `google_verification`. `_domainconnect` stays not carried over. No DMARC, CAA or apex/www A, AAAA or CNAME records exist on screen or live.

## Remaining work index (merged from the vet, 2026-10-04)

Work one item at a time: pick an item, decide, apply, tick it. Each vet item's text now lives in the entry named here.

Housekeeping

- [ ] vet #1 `.gitignore` gaps: TF-05 (the `infra/terraform.env` part is withdrawn, TF-01).
- [ ] vet #2 stale `infra/tfplan`: TF-07 (not on disk at merge time).
- [ ] vet #3 leftover on-disk files and `.terraform.tfstate.lock.info`: TF-05 and TF-07.
- [ ] vet #4 log destination: NEW-OPS-01 below.
- [x] vet #5 stale doc reference: TF-11 (done).
- [x] vet #6 apply identity permissions: NEW-DNS-03 (done).

High

- [ ] vet #7 email and Turnstile: AWS-02 (and LEAD-NOTIF). Status 2026-10-04: implemented in `infra/*.tf`, not applied; open items are the apply, SES production access, `turnstile_secret` and one test submit.

Medium

- [ ] vet #8 public Lambda function URL: TF-04 / AWS-01.
- [ ] vet #9 Aurora safety: TF-02 and Owner decisions.
- [ ] vet #10 secrets in plaintext: TF-06 and TF-07.
- [ ] vet #11 `terraform.tfvars.example` deleted: TF-14.
- [ ] vet #12 optional DMARC: NEW-DNS-01.
- [x] vet #12-adjacent items closed 2026-10-04: NEW-DNS-04 (nameserver echo) and NEW-DNS-06 (panel read). NEW-DNS-05 stays open as the cache wait.
- [ ] vet #13 zone protection: NEW-DNS-02.

Low

- [ ] vet #14 `preflight-cutover.sh` stale: AWS-18.
- [ ] vet #15 `engine_version`: TF-08 / AWS-17.
- [ ] vet #16 lock file: TF-17.
- [ ] vet #17 style guide: TF-18 (with TF-11, TF-12).
- [ ] vet #18 comments rule: NEW-OPS-02 below.
- [ ] vet #19 least privilege: TF-06.

New items without a review ID:

- [ ] **NEW-OPS-01 (vet #4): log destination.** Nothing in the repo writes the logs; they came from shell redirects. If logs are wanted: `mkdir -p infra/logs`, `terraform apply 2>&1 | tee infra/logs/apply.log`, add `infra/logs/` to `.gitignore`.
- [ ] **NEW-OPS-02 (vet #18): comments rule.** `.tf` files still carry comments (`main.tf:43,66,135`, `iam.tf:16,53,63,94`, `compute.tf`, `variables.tf:98,118`), and `infra/terraform.env` still has comment lines (3, terraform.env:1-3). Some hold real reasons (403 mapping, the Oct-2025 InvokeFunction requirement, a dependency cycle). Decide whether the repo no-comments rule applies to `.tf` and `terraform.env`. Measured 2026-10-04: the `variables.tf` comment blocks are now at variables.tf:106-108 and :126-129 (line numbers moved with the DNS variables).

## Open contradictions

Not resolved in this merge; each needs an owner ruling.

- **C1. Egress route for email and Turnstile.** Vet #7 offers (a) SES interface endpoint, (b) NAT, (c) leave blank. This file records an owner-approved IPv6 egress-only gateway + SES change (2026-10-04) that none of those options names, and that change is not in `infra/*.tf`. Which route stands?
  - Status 2026-10-04 (later): resolved in favour of the owner-approved route, now implemented in `infra/*.tf` (not applied).
- **C2. Aurora safety settings and secrets.** Vet #9 recommends `storage_encrypted`, `deletion_protection`, final snapshot and 7-day retention now, while state is empty. "Owner decisions" lists the same settings as owner-removed and not recommended (re-adds), and the repo CLAUDE.md hard limit forbids re-adding deleted things without the owner. Vet #10's Secrets Manager suggestion has the same conflict. The vet's new fact (no data to lose while state is empty) does not by itself override the owner's removal.
- **C3. Is anything deployed?** The vet reads "Local state holds 0 resources" as "nothing is deployed". This file's TF-04 cites a green "Verify serving" step, TF-07 recorded a 142 KB state backup, and the approved change's apply notes expect in-place updates (`3 to add, 4 to change`). Local state now holds 0 resources (terraform.tfstate 1,222 B) and the plans show 61 or 49 to add; that proves Terraform tracks nothing, not that AWS holds nothing. If resources from the lost state still exist, the first apply can collide with them or leave orphans. The apex having no A/AAAA shows only that the domain does not point at a site. Someone with AWS access should list existing resources before the first apply.
  - Status 2026-10-04 (later, read-only AWS checks): clean slate. Local state holds 0 resources and the account holds none of the Terraform-named resources (Lambda, CloudFront, S3, RDS, IAM, EC2, logs, Secrets Manager, EventBridge, ACM, Route 53); `GetRole` for the Lambda role returns NoSuchEntity. The account holds only unrelated resources for another domain (a Route 53 zone, an SES identity, a mail VPC, two roles, a state bucket and one unrelated Lambda). No `AlreadyExists` collision is expected and there is no existing hosted zone for `legacybenefitsmn.com`. One IAM list call timed out once and returned empty on retry. Whether anything was deployed earlier and since destroyed is not known.
- **C4. `acm_validation_records` output.** Its description (outputs.tf:47) says the CNAMEs are for "adding at the current DNS host before the nameserver switch". The runbook switches nameservers mid-apply instead and notes `terraform output` does not work mid-apply. Keep the output for a pre-validation path, or reword or drop it?
- **C5. SES DKIM CNAMEs.** The approved SES change says to add them by hand at the DNS host. With Route 53 managed, they could go into `dns_extra_records`. Not decided.
  - Status 2026-10-04 (later): resolved by implementation. `aws_route53_record.ses_dkim` (`count = 3`) creates them from the identity tokens in `infra/ses.tf`.
- **C6. Restoring `terraform.tfvars.example`.** Vet #11 says restore it. The repo CLAUDE.md lists "re-adding anything that was deleted" as a hard limit, and the file is mostly comments (20 of 88 lines are example assignments), against the no-comments rule. The owner must rule on both.
- **C7. AWS-02 status and severity.** The AWS-02 heading and the summary-table row still say "(resolved by approved change)", while this file elsewhere says the approved IPv6 egress + SES change is not implemented in `infra/*.tf`. The vet rates the issue High; the summary table says Medium. The owner rules on the status and the severity.
  - Status 2026-10-04 (later): the implementation now exists in `infra/*.tf`, so the "resolved" wording is correct for the code; it is not applied. Severity is still unruled.
- **C8. Lock file order.** TF-17's fix (`terraform providers lock` for several platforms) and the lock-file item's fix (`terraform init -upgrade`, which moves aws from 6.65.0 to 6.67.0) conflict, and the upgrade would outdate the provider-source line numbers checked against 6.65.0. The owner chooses the order: upgrade first, then lock all platforms.
