variable "name" {
  type = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*$", var.name)) && length(var.name) <= 32
    error_message = "name must be lowercase alphanumeric with hyphens, 32 chars max."
  }
}

variable "region" {
  type = string
}

variable "lambda_memory_mb" {
  type = number

  validation {
    condition     = var.lambda_memory_mb >= 1024
    error_message = "Lambda scales CPU with memory; Next.js SSR under 1024 MB is CPU-starved."
  }
}

variable "db_max_acu" {
  type = number

  validation {
    condition     = var.db_max_acu >= 1 && var.db_max_acu <= 256
    error_message = "db_max_acu must be between 1 and 256."
  }
}

variable "db_seconds_until_auto_pause" {
  type = number

  validation {
    condition     = var.db_seconds_until_auto_pause >= 300 && var.db_seconds_until_auto_pause <= 86400
    error_message = "db_seconds_until_auto_pause must be 300-86400."
  }
}

variable "github_subject_prefix" {
  type = string

  validation {
    condition     = can(regex("^repo:[^/]+@[0-9]+/[^/]+@[0-9]+$", var.github_subject_prefix))
    error_message = "github_subject_prefix must look like repo:<owner>@<owner_id>/<repo>@<repo_id>."
  }
}

variable "domain_name" {
  type    = string
  default = ""
}

variable "dns_extra_records" {
  description = "Records carried over from the previous DNS host, keyed by any unique label. name is relative to domain_name, \"\" for the apex."
  type = map(object({
    name    = string
    type    = string
    ttl     = number
    records = list(string)
  }))
  default = {}

  validation {
    condition = alltrue([
      for r in values(var.dns_extra_records) : !(contains(["A", "AAAA", "CNAME"], r.type) && contains(["", "www"], r.name))
    ])
    error_message = "Apex and www A, AAAA and CNAME records point at CloudFront and cannot be carried over."
  }
}

variable "business_name" {
  type = string
}

variable "business_phone" {
  type = string
}

variable "business_email" {
  type = string
}

variable "business_address" {
  type = string
}

variable "media_host" {
  type = string
}

variable "turnstile_site_key" {
  type = string
}

variable "turnstile_secret" {
  type      = string
  sensitive = true
}

variable "gtm_id" {
  type = string
}

variable "calendly_url" {
  type = string
}

variable "lead_notification_email" {
  type = string
}

variable "ses_from_address" {
  description = "From address for lead emails sent through SES. Must be on domain_name; empty turns SES off. Use a real Google Workspace mailbox so replies are delivered."
  type        = string
  default     = ""

  validation {
    condition     = var.ses_from_address == "" || var.domain_name == "" || (endswith(lower(var.ses_from_address), "@${lower(var.domain_name)}") && can(regex("^[^@\\s]+@[^@\\s]+$", var.ses_from_address)))
    error_message = "ses_from_address must be empty or one address on domain_name, e.g. nbest@<domain_name>. It is ignored while domain_name is empty."
  }
}
