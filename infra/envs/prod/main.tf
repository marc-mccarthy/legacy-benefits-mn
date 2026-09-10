terraform {
  required_version = "~> 1.16"

  required_providers {
    aws    = { source = "hashicorp/aws", version = "~> 6.63" }
    random = { source = "hashicorp/random", version = "~> 3.6" }
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = var.name
      Environment = "prod"
      ManagedBy   = "terraform"
    }
  }
}

# CloudFront certificates and WAF web ACLs must be created in us-east-1.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = var.name
      Environment = "prod"
      ManagedBy   = "terraform"
    }
  }
}

locals {
  name = "${var.name}-prod"

  # The zone is either created here (create_dns_zone, for migrating DNS into
  # Route 53) or referenced by id if one already exists.
  #
  # Managing the zone is deliberately independent of use_domain. That split is
  # not cosmetic: ACM validates by reading a record over public DNS, so the
  # certificate cannot be issued while the registrar still points at the old
  # nameservers. Creating the zone and the certificate in one apply would hang
  # for the validation resource's timeout and then fail. Migrating a live
  # domain runs in two phases instead — see the README.
  zone_id = var.create_dns_zone ? module.dns[0].zone_id : var.hosted_zone_id

  # A custom domain is optional. Without one the stack still comes up and is
  # served on the CloudFront distribution's own *.cloudfront.net URL, which is
  # what `terraform output site_url` reports.
  #
  # Routing the hostname through here rather than reading var.domain_name
  # downstream is what makes use_domain = false total: a real hostname left in
  # terraform.tfvars must not reach media_host or site_url.
  # Deliberately does NOT test local.zone_id. That value is
  # module.dns[0].zone_id whenever the zone is created in this same run, which
  # is unknown until apply — and has_domain gates `count` on the email module
  # and the ACM certificate. Terraform cannot plan a count it cannot resolve, so
  # a greenfield apply with use_domain = true failed outright with "Invalid
  # count argument". The two-phase cutover masked it: phase 1 creates the zone
  # with use_domain = false, so by phase 2 the id is in state and known.
  #
  # Dropping the test loses nothing. The validations on domain_name and
  # hosted_zone_id already guarantee that use_domain = true implies a zone —
  # either created here or supplied — so zone_id being non-empty was never
  # adding a real condition, only an unknown.
  has_domain  = var.use_domain && var.domain_name != ""
  domain_name = local.has_domain ? var.domain_name : ""
  site_url    = local.has_domain ? "https://${var.domain_name}" : ""

  # Derived rather than required, because the only address guaranteed to pass
  # SES is one on the domain SES just verified. Empty without a domain, which is
  # what makes the app skip sending instead of erroring — the email module does
  # not exist in that case either, so there would be nothing to send through.
  ses_from_address = local.has_domain ? (
    var.ses_from_address != "" ? var.ses_from_address : "no-reply@${var.domain_name}"
  ) : ""
}

# Creates the hosted zone and carries over the existing records. Run this,
# verify, and only then repoint the registrar's nameservers — see the module.
module "dns" {
  count  = var.create_dns_zone ? 1 : 0
  source = "../../modules/dns"

  domain_name                = var.domain_name
  records                    = var.dns_records
  google_workspace_mx        = var.google_workspace_mx
  google_workspace_mx_legacy = var.google_workspace_mx_legacy
  spf_record                 = var.spf_record
  dkim_records               = var.dkim_records
  dmarc_record               = var.dmarc_record
  deletion_protection        = true
}

# Production should not stay domainless.
#
# Without a domain there is no ACM certificate, so the ALB has no HTTPS listener
# and CloudFront reaches the origin with origin_protocol_policy = "http-only".
# The ALB is internet-facing, so that hop crosses the public internet in
# plaintext — not "inside AWS", which is what the edge module's comment implies.
# This site collects names, phone numbers, ZIP codes and Scope of Appointment
# records.
#
# Deliberately a `check` (warns) rather than a variable `validation` (blocks),
# because phase 1 of the DNS cutover REQUIRES prod to run with
# create_dns_zone = true and use_domain = false while the zone is built and the
# nameservers are switched. Blocking it would make the documented migration
# impossible. The warning is here to stop that temporary state becoming
# permanent — during cutover nothing points at this stack yet, so the exposure
# only becomes real once traffic arrives.
check "prod_is_not_plaintext" {
  assert {
    condition     = var.use_domain
    error_message = "prod is running with use_domain = false, so CloudFront reaches the origin over the public internet in plaintext while carrying lead and SOA data. Acceptable ONLY during phase 1 of the DNS cutover. Finish it and set use_domain = true — see dns_cutover_runbook."
  }
}

# Advisory rather than fatal — a domain may legitimately have no DKIM. But
# creating the zone without carrying it over silently unpublishes DKIM, and
# mail keeps flowing while quietly failing authentication, which is the failure
# mode hardest to notice. A `check` warns; it does not block the apply.
check "mail_records_carried_over" {
  assert {
    condition     = !var.create_dns_zone || !var.google_workspace_mx || length(var.dkim_records) > 0
    error_message = "Creating a zone with Google Workspace MX but no dkim_records unpublishes DKIM. Read it off live DNS first: dig +short TXT google._domainkey.${var.domain_name}"
  }
}

module "network" {
  source = "../../modules/network"

  name     = local.name
  region   = var.region
  vpc_cidr = var.vpc_cidr

  # One NAT gateway per AZ: a single AZ outage must not remove egress for the
  # whole service.
  single_nat_gateway = false
}

module "data" {
  source = "../../modules/data"

  name                  = local.name
  vpc_id                = module.network.vpc_id
  private_subnet_ids    = module.network.private_subnet_ids
  app_security_group_id = module.network.app_security_group_id

  instance_class = var.db_instance_class
  multi_az       = true
  # Lead and Scope of Appointment records are regulatory artefacts retained for
  # 10 years; 30 days of PITR is the floor, not the target.
  backup_retention_days = 30
  deletion_protection   = true
  performance_insights  = true

  # 0, not 30. A 30-day recovery window is not a destroy blocker by itself, but
  # the five secret names are fixed (${name}/PAYLOAD_SECRET and friends), so a
  # destroy followed by any re-apply inside the window fails with "already
  # scheduled for deletion" and needs a manual
  # `aws secretsmanager delete-secret --force-delete-without-recovery` — exactly
  # the console/CLI step this stack is meant to avoid.
  #
  # Nothing irreplaceable lives in them: PAYLOAD_SECRET and OUTBOX_JOB_TOKEN are
  # Terraform-generated, DATABASE_URL is rebuilt with the instance, and the two
  # third-party values are re-pasted from their own sources. The database itself
  # is protected by deletion_protection and its final snapshot, which is where
  # the recovery guarantee actually belongs.
  secret_recovery_days = 0
}

module "app" {
  source = "../../modules/app"

  name                    = local.name
  region                  = var.region
  vpc_id                  = module.network.vpc_id
  public_subnet_ids       = module.network.public_subnet_ids
  private_subnet_ids      = module.network.private_subnet_ids
  alb_security_group_id   = module.network.alb_security_group_id
  app_security_group_id   = module.network.app_security_group_id
  certificate_arn         = module.edge.certificate_arn
  has_certificate         = local.has_domain
  database_url_secret_arn = module.data.database_url_secret_arn

  image = var.image
  # Empty when there is no custom domain; the app then derives its own URL
  # from the request, so canonical links and the sitemap stay correct.
  site_url       = local.site_url
  business_name  = var.business_name
  business_phone = var.business_phone

  # Was never passed, so it fell back to the module default of "" and the app
  # silently skipped every send — including with use_domain = true, where SES
  # would be fully verified and publishing DKIM while delivering nothing.
  ses_from_address = local.ses_from_address

  # Read at runtime by server components, so they belong in the task definition
  # rather than baked in at build time like NEXT_PUBLIC_SITE_URL. Empty is a
  # supported state for all three: the widget, the tag manager and the booking
  # embed each render nothing rather than erroring.
  turnstile_site_key      = var.turnstile_site_key
  gtm_id                  = var.gtm_id
  calendly_url            = var.calendly_url
  lead_notification_email = var.lead_notification_email

  # Leads are stored and queued but not delivered until the real MedicarePRO
  # credential is in place. See infra README.
  crm_transport = var.crm_transport

  desired_count       = 2
  max_capacity        = 6
  task_cpu            = "1024"
  task_memory         = "2048"
  container_insights  = true
  log_retention_days  = 90
  deletion_protection = true

  # 0, not 30. A 30-day recovery window is not a destroy blocker by itself, but
  # the five secret names are fixed (${name}/PAYLOAD_SECRET and friends), so a
  # destroy followed by any re-apply inside the window fails with "already
  # scheduled for deletion" and needs a manual
  # `aws secretsmanager delete-secret --force-delete-without-recovery` — exactly
  # the console/CLI step this stack is meant to avoid.
  #
  # Nothing irreplaceable lives in them: PAYLOAD_SECRET and OUTBOX_JOB_TOKEN are
  # Terraform-generated, DATABASE_URL is rebuilt with the instance, and the two
  # third-party values are re-pasted from their own sources. The database itself
  # is protected by deletion_protection and its final snapshot, which is where
  # the recovery guarantee actually belongs.
  secret_recovery_days = 0
}

module "edge" {
  source = "../../modules/edge"

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  name                              = local.name
  domain_name                       = local.domain_name
  hosted_zone_id                    = local.zone_id
  alb_has_certificate               = local.has_domain
  alb_dns_name                      = module.app.alb_dns_name
  media_bucket                      = module.app.media_bucket
  media_bucket_arn                  = module.app.media_bucket_arn
  media_bucket_regional_domain_name = module.app.media_bucket_regional_domain_name
}

# Email requires a verified domain, so it is skipped for domainless previews.
module "email" {
  count  = local.has_domain ? 1 : 0
  source = "../../modules/email"

  name           = local.name
  domain_name    = local.domain_name
  hosted_zone_id = local.zone_id
  region         = var.region
}

module "scheduler" {
  source = "../../modules/scheduler"

  name         = local.name
  site_url     = module.edge.site_url
  outbox_token = module.app.outbox_token
}

module "observability" {
  source = "../../modules/observability"

  name                    = local.name
  alb_arn_suffix          = module.app.alb_arn_suffix
  target_group_arn_suffix = module.app.target_group_arn_suffix
  db_instance_id          = module.data.instance_id
  log_group_name          = module.app.log_group_name
  alert_emails            = var.alert_emails
}

module "ci" {
  source = "../../modules/ci"

  name               = local.name
  ecr_repository_arn = module.app.ecr_repository_arn
  cluster_arn        = module.app.cluster_arn
  service_arn        = module.app.service_arn
  task_role_arns     = module.app.task_role_arns
  github_repository  = var.github_repository
  # Production deploys only from main.
  allowed_refs = ["ref:refs/heads/main"]
}
