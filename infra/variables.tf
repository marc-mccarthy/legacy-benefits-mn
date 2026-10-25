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

variable "GITHUB_BRANCH" {
  description = "Branch the GitHub OIDC deploy and terraform roles trust."
  type        = string

  validation {
    condition     = contains(["main", "develop"], var.GITHUB_BRANCH)
    error_message = "GITHUB_BRANCH must be main or develop."
  }
}

variable "ROUTE53_ZONE_NAME" {
  description = "Existing Route 53 zone that holds this stack's records. Empty, or equal to DOMAIN_NAME, makes this stack create its own zone."
  type        = string
  default     = ""

  validation {
    condition     = var.ROUTE53_ZONE_NAME == "" || var.DOMAIN_NAME == var.ROUTE53_ZONE_NAME || endswith(var.DOMAIN_NAME, ".${var.ROUTE53_ZONE_NAME}")
    error_message = "ROUTE53_ZONE_NAME must be empty, equal to DOMAIN_NAME, or a parent domain of it."
  }
}

variable "CRM_TRANSPORT" {
  description = "How leads reach the CRM: relay posts to CRM_RELAY_URL, mock only logs."
  type        = string

  validation {
    condition     = contains(["relay", "mock"], var.CRM_TRANSPORT)
    error_message = "CRM_TRANSPORT must be relay or mock."
  }
}

variable "CRM_RELAY_URL" {
  type    = string
  default = ""

  validation {
    condition     = var.CRM_TRANSPORT != "relay" || startswith(var.CRM_RELAY_URL, "https://")
    error_message = "CRM_RELAY_URL must start with https:// when CRM_TRANSPORT is relay."
  }
}

variable "CRM_RELAY_SECRET" {
  type      = string
  default   = ""
  sensitive = true

  validation {
    condition     = var.CRM_TRANSPORT != "relay" || length(var.CRM_RELAY_SECRET) >= 16
    error_message = "CRM_RELAY_SECRET must be at least 16 characters when CRM_TRANSPORT is relay."
  }
}

variable "CRM_INBOX_ENABLED" {
  description = "Turns on the dev-only CRM inbox route that stands in for the relay."
  type        = bool
  default     = false
}

variable "BASIC_AUTH_USER" {
  type    = string
  default = ""
}

variable "BASIC_AUTH_PASSWORD" {
  description = "With BASIC_AUTH_USER, puts HTTP basic auth and noindex on the site pages. Both empty turns it off."
  type        = string
  default     = ""
  sensitive   = true

  validation {
    condition     = (var.BASIC_AUTH_USER == "") == (var.BASIC_AUTH_PASSWORD == "") && (var.BASIC_AUTH_PASSWORD == "" || length(var.BASIC_AUTH_PASSWORD) >= 12)
    error_message = "BASIC_AUTH_USER and BASIC_AUTH_PASSWORD must be both empty or both set, and the password at least 12 characters."
  }
}
