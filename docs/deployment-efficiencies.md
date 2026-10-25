# Deployment efficiencies

Created 2026-10-25. Last update 2026-10-25.

This document lists improvements found while adding the develop environment that were deliberately not made. Nothing in it is implemented, and each item is for the owner to decide later.

Items are ordered by severity, highest first.

## Dev Terraform role can run admin Terraform on the whole account

**Evidence.** The Terraform role is created in `infra/iam.tf:127` and gets the `AdministratorAccess` managed policy at `infra/iam.tf:135`. Its trust policy accepts the GitHub subject for the branch in `var.GITHUB_BRANCH` (`infra/iam.tf:83-84`). For dev that branch is `develop`. The role name is prefixed by `var.NAME`, but the permissions are not scoped to that prefix. The state bucket and the prod resources sit in the same account (`infra/backend.tf:3`, `.github/workflows/deploy.yml:87`).

**Exposure.** Any push to `develop` runs a workflow that assumes an administrator role. Whoever can push there can change the workflow, run arbitrary AWS calls, and read or rewrite the prod state file. The same exposure already exists for `main` and the prod role.

**What would change.** Pick one or combine them.

- Add branch protection on `develop` and `main`, so only reviewed commits reach a branch that can assume an admin role.
- Replace the admin attachment on the dev role with a scoped policy, or add a permission boundary. Limit it to resource names that start with `legacybenefitsgroup-dev-` and to the dev state key.
- Move dev into a separate AWS account, so a dev compromise cannot reach prod at all.

**Why deferred.** A scoped policy for a full Terraform stack needs many iterations to get right. A second account is a larger migration. Branch protection is the cheapest step and is the next item.

## Branch protection

**Evidence.** `main` has no branch protection. This was verified on 2026-10-24. The CI workflow is `.github/workflows/ci.yml` and runs on pull requests.

**What would change.** Require the CI workflow to pass on `develop`. Require a pull request from `develop` into `main`. Block force pushes and deletion on both.

**Why deferred.** It is a repository setting, not a code change. It also needs the owner to decide who may push directly. It matters more once the first item is not fixed in another way.

## Outbound IPv4 from the Lambda needs a NAT gateway

**Evidence.** The Lambda subnets have IPv6 egress only. The route is an egress-only internet gateway in `infra/main.tf:76-85`. There is no NAT gateway and no IPv4 route to the internet. The security group allows IPv4 egress at `infra/main.tf:108-112`, but no route carries it.

**What would change.** Add a NAT gateway and a route for IPv4 traffic. It costs a fixed monthly fee plus data charges, per environment.

**Why deferred.** Nothing needs it today. The Cloudflare relay Worker is dual-stack, so the Lambda reaches it over IPv6. SES uses its dual-stack endpoint. This only matters if a future vendor has an IPv4-only API.

## Basic-auth credential is readable in the CloudFront function code

**Evidence.** The dev credential is encoded in `infra/main.tf:40` and passed into the function source by `templatefile` at `infra/compute.tf:87`. The template compares the request header to the encoded value at `infra/rewrite.js.tftpl:3`. The encoded value is therefore part of the function code. Anyone with `cloudfront:GetFunction` can read it, and it is also visible in the console and in Terraform state.

**What would change.** Store a hash of the credential in a CloudFront KeyValueStore and have the function compare against it. Or move the check to Lambda@Edge and read the credential from Secrets Manager.

**Why deferred.** Prod has no basic auth. Dev is a test site and the credential is a shared dev value. Either alternative adds a resource and a more complex function.

## Aurora and a VPC for a few small tables

**Evidence.** The data layer is an Aurora Serverless v2 cluster (`infra/main.tf:150-166`) with a subnet group, two security groups, a VPC and a migrate Lambda (`infra/compute.tf:259`). The schema is five small tables across the three files in `drizzle/`: leads, DNC requests, SOA submissions, the CRM outbox and the CRM inbox.

**What would change.** DynamoDB would remove the VPC, the subnets, the security groups, the egress gateway and the migrate function. It would also remove the NAT question above.

**Why deferred.** It is a rewrite of the data access code and of the deploy flow, not a tuning change.

## AWS region is hardcoded in two places

**Evidence.** `.github/workflows/deploy.yml:29` sets the region, and `infra/backend.tf:5` sets it for the state backend. The region is also a 1Password field, referenced from `app.env:2`.

**What would change.** Read the region from one source. The backend block cannot use variables, so it would need a backend config argument at init time, as the state key already is (`.github/workflows/deploy.yml:261`).

**Why deferred.** The region has no reason to change, and the duplication costs nothing until it does.

## op run uses the no-masking flag

**Evidence.** The flag appears at `.github/workflows/deploy.yml:134`, `.github/workflows/deploy.yml:270` and `.github/workflows/deploy.yml:413`.

**What would change.** The flag turns off masking of secret values in job output. The verify step at line 413 only passes the basic-auth values to a curl call, so it does not need the flag. Dropping it there keeps those values masked in logs. I did not establish why the build and plan steps need it, so removing it there needs a test run.

**Why deferred.** It works as is. Removing the flag is low risk but untested.

## Pull requests never show an infra plan

**Evidence.** `.github/workflows/terraform.yml` runs format, validate, lint and a scan, all without a state backend. It never plans (`.github/workflows/terraform.yml:39`). The only plan runs inside the deploy workflow, right before apply (`.github/workflows/deploy.yml:271`).

**What would change.** Run a read-only plan on pull requests and post it to the job summary. This needs a separate plan-only IAM role that can read state and resources but cannot change them. That role needs its own trust rule for pull request subjects.

**Why deferred.** A plan-only role is new IAM surface. The deploy workflow already runs a plan guard before apply (`.github/workflows/deploy.yml:284`).

## Redeploy of an older commit reads current infra and env file

**Evidence.** The resolve and build jobs check out `inputs.ref` (`.github/workflows/deploy.yml:47`, `.github/workflows/deploy.yml:102`). The terraform job checks out with no ref (`.github/workflows/deploy.yml:246`). It reads the env file and the `infra/` directory from there (`.github/workflows/deploy.yml:268-271`).

**What would change.** Add the same `ref` line to the terraform job checkout. The application build then matches the infrastructure and env file of that commit.

**Why deferred.** A redeploy is rare. It changes which Terraform runs, so it should be tested on dev first.

## The CRM relay Worker is deployed by hand

**Evidence.** `workers/crm-relay/deploy.sh:9-10` reads the Worker's items from the owner's personal vault named Secrets. The CI service account sees only the vault `Legacy Benefits Group`, so it cannot read them. The Worker is not part of any workflow.

**What would change.** Deploy the Worker from CI with a Cloudflare token held in the `Legacy Benefits Group` vault. Until then, the owner must copy the Worker URL and secret into the `Legacy Benefits Group` item as `CRM_RELAY_URL` and `CRM_RELAY_SECRET` before prod switches `CRM_TRANSPORT` to `relay`. The prod env file already points at both fields (`app.env:8-10`).

**Why deferred.** It needs a new Cloudflare credential in the shared vault. The Worker also changes rarely.

## Local op run fails while op read works

**Evidence.** On the owner's machine, `op run` fails with an authorization timeout or an item-not-found error. `op read` resolves the same references. CI with the service account works. This was observed during the work and is not visible in the repo.

**Suspected cause.** The 1Password desktop-app integration. I did not confirm this. It is not a repository defect.

**What would change.** Nothing in the repo. Local checks used `op read` into environment variables with `CI=1`.

**Why deferred.** It is a machine setting, outside the code.

## Mismatched env and branch fails late

**Evidence.** The resolve job maps `env` to a branch (`.github/workflows/deploy.yml:61-70`). The OIDC subject comes from the branch the workflow was started on. A manual run whose `env` does not match that branch is refused when the terraform job assumes its role (`.github/workflows/deploy.yml:257`). That is after the build job. The commit ancestry check in the build job (`.github/workflows/deploy.yml:104-112`) catches some mismatches, but not one where the commit is on both branches.

**What would change.** Add a check to the resolve job that compares `github.ref_name` with the branch for the chosen env and fails at once with a clear message.

**Why deferred.** It only saves time on an operator error, and the failure is safe.
