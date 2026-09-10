variable "name" {
  description = <<-EOT
    Prefix for every AWS resource name, combined with the environment suffix as
    local.name (legacybenefitsmn-prod).

    Supplied from the environment as TF_VAR_name, NOT from a default and not
    from terraform.tfvars. It is a client-specific value and belongs with the
    other client-specific values in .env, which is gitignored — a committed
    default is exactly how this ended up prefixed with the repo's folder name.

    Keep it under 23 characters. The binding constraint is the ALB, capped at
    32, and "<name>-prod-alb" is len + 9.

    Changing it after an apply destroys and recreates nearly everything: the S3
    bucket, RDS instance, ALB, ECR repository and all five Secrets Manager paths
    derive from it, and the old secret names stay reserved for their recovery
    window.
  EOT
  type        = string

  # Rejects everything AWS would reject, at plan time and with one message,
  # instead of three different resources failing mid-apply.
  #
  # An UNSET variable errors on its own ("No value for required variable"), but
  # an EMPTY one does not — Terraform treats "" as a supplied value. That made
  # `local.name` render as "-dev", and the first sign of trouble was the ALB
  # refusing "-dev-alb", the target group refusing the same, and RDS refusing
  # "-dev-pg" because an identifier must start with a letter. Three confusing
  # errors, none of which named the actual cause.
  #
  # The pattern is the intersection of the strictest consumers: RDS wants a
  # leading letter, S3 forbids uppercase and underscores, and ALB names cannot
  # start or end with a hyphen. 23 characters keeps "<name>-prod-alb" inside the
  # ALB's 32-character cap.
  validation {
    condition     = can(regex("^[a-z][a-z0-9]*(-[a-z0-9]+)*$", var.name)) && length(var.name) <= 23
    error_message = "name must be 1-23 chars, lowercase, start with a letter, and use single hyphens between alphanumerics (e.g. legacybenefitsmn). An empty value is the usual cause: it comes from TF_VAR_name, so run `set -a; source .env; set +a` from the repo root first."
  }
}

variable "region" {
  type    = string
  default = "us-east-1"
}

variable "vpc_cidr" {
  type    = string
  default = "10.20.0.0/16"
}

variable "use_domain" {
  description = <<-EOT
    Attach the site to domain_name.

    false: served on the CloudFront distribution's own *.cloudfront.net URL with
    CloudFront's certificate. No ACM certificate, no apex or www records, no SES
    identity. Every DNS value below is inert, so the real values can sit in
    terraform.tfvars ready to go without touching the domain.

    Dev is meant to run this way. If dev ever genuinely needs a hostname,
    delegate a subdomain from the production zone rather than creating a second
    zone for the same domain.

    Separate from create_dns_zone on purpose. ACM validates by reading a record
    over public DNS, so the certificate cannot be issued until the registrar
    already points at Route 53. Migrating a live domain therefore takes two
    applies: create_dns_zone = true with use_domain = false, switch the
    nameservers, then use_domain = true. See the README.
  EOT
  type        = bool
  default     = false
}

variable "domain_name" {
  description = "Public hostname. Ignored unless use_domain is true."
  type        = string
  default     = ""

  validation {
    condition     = !var.use_domain || var.domain_name != ""
    error_message = "use_domain = true requires domain_name to be set."
  }
}

variable "hosted_zone_id" {
  description = "Existing Route 53 zone containing domain_name. Only needed when use_domain is true and create_dns_zone is false."
  type        = string
  default     = ""

  validation {
    condition     = !(var.use_domain && !var.create_dns_zone) || var.hosted_zone_id != ""
    error_message = "use_domain = true with create_dns_zone = false requires hosted_zone_id. Find it with: aws route53 list-hosted-zones-by-name --dns-name <domain>"
  }
}

variable "image" {
  description = "Container image URI. Bootstrap with a placeholder, then let CI update it."
  type        = string
}

variable "business_name" {
  description = "Legal entity name. Interpolated into stored TCPA consent text."
  type        = string
}

variable "business_phone" {
  type    = string
  default = ""
}

variable "crm_transport" {
  description = "mock until the MedicarePRO credential exists, then webhook. Dev should stay on mock: pointing it at the real webhook pushes test leads into the client's live CRM."
  type        = string
  default     = "mock"

  validation {
    condition     = contains(["mock", "webhook"], var.crm_transport)
    error_message = "Must be \"mock\" or \"webhook\". \"zapier\" is accepted by the app but MEDICAREPRO_ZAPIER_HOOK_URL is not wired into the task definition, so selecting it makes getCrmTransport() throw and every submission 500."
  }
}

variable "ses_from_address" {
  description = <<-EOT
    Envelope sender for confirmation email. Leave empty to derive
    no-reply@<domain_name> whenever a domain is configured.

    Only meaningful with use_domain = true: SES needs a verified domain, so the
    email module is not created at all without one, and the app skips sending
    when this is empty (src/lib/email/index.ts). Dev runs domainless, so this
    normally stays empty and dev sends no mail at all.
  EOT
  type        = string
  default     = ""
}

variable "github_repository" {
  description = "owner/repo permitted to deploy via OIDC"
  type        = string
}

variable "alert_emails" {
  type    = list(string)
  default = []
}

variable "create_dns_zone" {
  description = "Create the Route 53 hosted zone here, for migrating DNS in from another provider. Leave false to use an existing zone via hosted_zone_id."
  type        = bool
  default     = false
}

variable "dns_records" {
  description = "Existing records to carry over when creating the zone. Export them from the current DNS host first."
  type = list(object({
    name    = string
    type    = string
    ttl     = optional(number, 3600)
    records = list(string)
  }))
  default = []
}

variable "google_workspace_mx" {
  description = "Add Google Workspace MX records to the new zone"
  type        = bool
  default     = false
}

variable "google_workspace_mx_legacy" {
  type    = bool
  default = false
}

variable "dkim_records" {
  description = "DKIM public keys keyed by selector. Unused while dev runs without a zone (create_dns_zone = false), but declared so dev and prod stay identical."
  type        = map(string)
  default     = {}
}

variable "spf_record" {
  type    = string
  default = ""
}

variable "dmarc_record" {
  type    = string
  default = ""
}

# --- Third-party keys read at runtime ---------------------------------------
# None of these are secret. The Turnstile SITE key is public by design (its
# secret half lives in Secrets Manager); a GTM container ID and a Calendly URL
# are both visible in page source. They sit here rather than in Secrets Manager
# because putting public values behind a secret only adds a failure mode.

variable "turnstile_site_key" {
  description = "Cloudflare Turnstile public site key. Without it the widget never renders, so the form produces no token and submission is refused whenever TURNSTILE_SECRET is set to anything non-empty."
  type        = string
  default     = ""
}

variable "gtm_id" {
  description = "Google Tag Manager container ID, e.g. GTM-XXXXXXX. Empty means analytics never load, which is a valid state."
  type        = string
  default     = ""
}

variable "calendly_url" {
  description = "Calendly scheduling URL. Empty hides the booking embed."
  type        = string
  default     = ""
}

variable "lead_notification_email" {
  description = "Fallback lead-notification recipient used only when Site Settings has none. Comma-separated."
  type        = string
  default     = ""
}

