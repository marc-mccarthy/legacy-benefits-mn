# infra/ vet: remaining work

Source: terraform skill (`terraform:terraform-style-guide`) and terraform-registry MCP review of `infra/`, 2026-10-04. Work one item at a time: pick an item, decide, apply, tick it.

`terraform fmt -check` and `terraform validate` passed. Local state holds 0 resources, so nothing is deployed.

## Done

- [x] `git rm --cached` on `infra/.apply.log`, `.build.log`, `.build2.log`, `.build3.log`, `.dev.log`, `.bootstrap.zip` (files stay on disk)
- [x] `compute.tf` `archive_file.bootstrap` writes to `${path.root}/.terraform/bootstrap.zip`

## Decisions recorded

- `infra/scripts/preflight-cutover.sh` stays (owner ruling). It is dead: it reads the removed `route53_zone_id` output (`:81`) and nothing calls it.
- Route 53 is not available. The DNS module was removed in `5f6e3e1`, and repo rules forbid re-adding it or adding a service. See item 9.

## Remaining

### Housekeeping

- [ ] **1. `.gitignore` gaps.** The six untracked files above now show as untracked, and a stray `prod.tfvars` would be committed.
  - Add `infra/.*.log`, `infra/.bootstrap.zip`, `*.tfvars` (keep the `!terraform.tfvars.example` negation).
  - Existing rule at `.gitignore:82` already covers `tfplan`.
- [ ] **2. Stale `infra/tfplan`** (Sep 20, untracked, holds DB password and `PAYLOAD_SECRET` in cleartext). Git cannot recover it. Owner deletes: `rm infra/tfplan`.
- [ ] **3. Leftover on-disk files.** `infra/.apply.log` (73 KB, account-ID ARNs), the other logs and the old `infra/.bootstrap.zip` stay on disk until you delete them. They remain in git history from `5f6e3e1`.
- [ ] **4. Log destination.** Nothing in the repo writes the logs; they came from shell redirects. If you want logs: `mkdir -p infra/logs`, `terraform apply 2>&1 | tee infra/logs/apply.log`, add `infra/logs/` to `.gitignore`.

### High

- [ ] **5. Email and Turnstile cannot work.** `compute.tf:13-51`, `main.tf:68-76`, `iam.tf:22-45`.
  - The Lambda is in a VPC whose only exit is an S3 gateway endpoint. No NAT.
  - The app calls SESv2 (`src/lib/email/index.ts:3,39`) and Turnstile verify (`src/lib/security/turnstile.ts:3`). Both need the internet.
  - The role has no `ses:SendEmail`.
  - Effect: `LEAD_NOTIFICATION_EMAILS` never delivers. Any non-empty `turnstile_secret` breaks every form submit.
  - Options, each adds cost or a service, so decide:
    - (a) SES interface endpoint plus `ses:SendEmail` scoped to the identity, and drop Turnstile.
    - (b) NAT gateway.
    - (c) Leave both blank and document it.

### Medium

- [ ] **6. Public Lambda function URL.** `compute.tf:59-63`, `iam.tf:53-72`.
  - `authorization_type = "NONE"` makes the URL callable without CloudFront, and the auto-added public permissions are not removed on destroy.
  - The two `AWS_IAM` CloudFront permissions do nothing: no `origin_access_control_origin_type = "lambda"` OAC exists.
  - Options: add a Lambda OAC, switch to `AWS_IAM` and set `origin_access_control_id` on the origin (POST/PUT bodies then need `x-amz-content-sha256`, so forms change); or delete the two dead permissions and accept the public URL.
- [ ] **7. Aurora safety.** `main.tf:123-145`.
  - Missing: `storage_encrypted = true`, `deletion_protection = true`, `skip_final_snapshot = false` with `final_snapshot_identifier`, `backup_retention_period = 7`. Currently `skip_final_snapshot = true` and `apply_immediately`.
  - Encryption forces replacement, so set it now while state is empty.
- [ ] **8. Secrets in plaintext.** `compute.tf:34,277`, `main.tf:108-130`.
  - The DB password, `PAYLOAD_SECRET` and the Turnstile secret sit in Lambda environment variables, local state and plan files. No remote backend.
  - Acceptable at this scale. Long term: RDS-managed master password plus Secrets Manager (new service, needs your OK). At minimum, back up state somewhere private.
- [ ] **9. Domain without Route 53 (`example.com` and `www.example.com`, registered at Squarespace).** Route 53 is not required, but you need DNS somewhere.
  - ACM certificate validation needs one CNAME in whichever DNS serves the domain.
  - `www` is a plain CNAME to the CloudFront domain, which Squarespace DNS can hold.
  - The apex `example.com` cannot be a CNAME. CloudFront has no fixed IPs. It needs ALIAS/ANAME support. I do not know whether Squarespace DNS supports that; check its DNS panel.
  - If it does not: forward the apex to `https://www.example.com` at Squarespace (an HTTPS apex needs a working cert on the forwarder, so test it), or move DNS hosting to Route 53 and keep registration at Squarespace. The Route 53 option needs an owner ruling, because repo rules forbid re-adding it.
  - Check how `infra/` currently models the custom domain (`cloudfront` aliases and certificate) before choosing.
- [ ] **10. `terraform.tfvars.example` deleted.** It was the only documentation of the 17 inputs.
  - Restore with `git restore infra/terraform.tfvars.example`.
  - Fix its stale line: `manage_github_variables` is documented as true but `variables.tf:122-125` defaults it to false.
  - The file is all comments, so it conflicts with the no-comments rule. Decide whether the rule applies to it.

### Low

- [ ] **11. `preflight-cutover.sh` is stale.** Kept by ruling. Either leave it dead or rewrite it against the current config (no `route53_zone_id`, no `use_domain`).
- [ ] **12. `engine_version = "16.8"`** (`main.tf:127`) while auto minor upgrades are on. Set `auto_minor_version_upgrade = false` or `ignore_changes = [engine_version]`.
- [ ] **13. Lock file.** Latest: aws 6.67.0, random 3.9.1, archive 2.8.1, github 6.13.0. The lock has aws 6.65.0, and the `archive` entry has no `constraints` line. Run `terraform init -upgrade` when ready.
- [ ] **14. Style guide.**
  - Add `description` to every variable and output.
  - Move `required_version` and `required_providers` from `main.tf` to `terraform.tf`.
  - Prefer `main` over `this` for resource names.
  - Sort variables alphabetically.
- [ ] **15. Comments rule.** `.tf` files still carry comments (`main.tf:43,66,135`, `iam.tf:16,53,63,94`, `compute.tf`, `variables.tf:98,118`). Some hold real reasons (403 mapping, the Oct-2025 InvokeFunction requirement, a dependency cycle). Decide whether the repo no-comments rule applies to `.tf`.
- [ ] **16. Least privilege.** `iam.tf:113-118`: the deploy role has `lambda:UpdateFunctionConfiguration`, which lets CI rewrite environment variables including secrets. Drop it if CI only updates code.

## Working-tree diff already in `infra/` (not yet reviewed by you)

- `github.tf`: splits computed values from input values and applies the `!= ""` filter only to inputs. Correct. The old filter would break `for_each` keys on a fresh apply. Three explanatory comments were removed.
- `compute.tf`: adds `BUSINESS_ADDRESS` to the app Lambda environment.
