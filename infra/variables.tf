variable "NAME" {
  type = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*$", var.NAME)) && length(var.NAME) <= 32
    error_message = "NAME must be lowercase alphanumeric with hyphens, 32 chars max."
  }
}

variable "REGION" {
  type = string
}

variable "LAMBDA_MEMORY_MB" {
  type = number

  validation {
    condition     = var.LAMBDA_MEMORY_MB >= 1024
    error_message = "Lambda scales CPU with memory; Next.js SSR under 1024 MB is CPU-starved."
  }
}

variable "DB_MAX_ACU" {
  type = number

  validation {
    condition     = var.DB_MAX_ACU >= 1 && var.DB_MAX_ACU <= 256
    error_message = "DB_MAX_ACU must be between 1 and 256."
  }
}

variable "DB_SECONDS_UNTIL_AUTO_PAUSE" {
  type = number

  validation {
    condition     = var.DB_SECONDS_UNTIL_AUTO_PAUSE >= 300 && var.DB_SECONDS_UNTIL_AUTO_PAUSE <= 86400
    error_message = "DB_SECONDS_UNTIL_AUTO_PAUSE must be 300-86400."
  }
}

variable "GITHUB_SUBJECT_PREFIX" {
  type = string

  validation {
    condition     = can(regex("^repo:[^/]+@[0-9]+/[^/]+@[0-9]+$", var.GITHUB_SUBJECT_PREFIX))
    error_message = "GITHUB_SUBJECT_PREFIX must look like repo:<owner>@<owner_id>/<repo>@<repo_id>."
  }
}

variable "DOMAIN_NAME" {
  type    = string
  default = ""
}

variable "DNS_EXTRA_RECORDS" {
  description = "Records carried over from the previous DNS host, keyed by any unique label. name is relative to DOMAIN_NAME, \"\" for the apex."
  type = map(object({
    name    = string
    type    = string
    ttl     = number
    records = list(string)
  }))
  default = {}

  validation {
    condition = alltrue([
      for r in values(var.DNS_EXTRA_RECORDS) : !(contains(["A", "AAAA", "CNAME"], r.type) && contains(["", "www"], r.name))
    ])
    error_message = "Apex and www A, AAAA and CNAME records point at CloudFront and cannot be carried over."
  }
}

variable "BUSINESS_NAME" {
  type = string
}

variable "BUSINESS_PHONE" {
  type = string
}

variable "BUSINESS_EMAIL" {
  type = string
}

variable "BUSINESS_ADDRESS" {
  type = string
}

variable "MEDIA_HOST" {
  type = string
}

variable "TURNSTILE_SITE_KEY" {
  type = string
}

variable "TURNSTILE_SECRET" {
  type      = string
  sensitive = true
}

variable "GTM_ID" {
  type = string
}

variable "CALENDLY_URL" {
  type = string
}

variable "LEAD_NOTIFICATION_EMAIL" {
  type = string
}

variable "SES_FROM_ADDRESS" {
  description = "From address for lead emails sent through SES. Must be on DOMAIN_NAME; empty turns SES off. Use a real Google Workspace mailbox so replies are delivered."
  type        = string
  default     = ""

  validation {
    condition     = var.SES_FROM_ADDRESS == "" || var.DOMAIN_NAME == "" || (endswith(lower(var.SES_FROM_ADDRESS), "@${lower(var.DOMAIN_NAME)}") && can(regex("^[^@\\s]+@[^@\\s]+$", var.SES_FROM_ADDRESS)))
    error_message = "SES_FROM_ADDRESS must be empty or one address on DOMAIN_NAME, e.g. nbest@<DOMAIN_NAME>. It is ignored while DOMAIN_NAME is empty."
  }
}
