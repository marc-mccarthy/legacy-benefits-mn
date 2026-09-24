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

variable "github_repository" {
  type = string

  validation {
    condition     = can(regex("^[^/]+/[^/]+$", var.github_repository))
    error_message = "github_repository must be owner/repo."
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

variable "acm_certificate_arn" {
  type    = string
  default = ""

  validation {
    condition     = var.domain_name == "" || var.acm_certificate_arn != ""
    error_message = "domain_name requires acm_certificate_arn issued in us-east-1, covering the apex and www."
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

# The private half of the Turnstile pair. Reaches the Lambda environment only —
# never a GitHub Actions variable, which is readable by anyone who can read the
# repository's settings.
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

# The GitHub provider needs a token CI does not have: Actions' default
# GITHUB_TOKEN cannot write repository variables, and the permissions block has
# no `administration` or `variables` key to grant. So the variables are created
# by the local bootstrap apply and CI leaves them alone.
variable "manage_github_variables" {
  type    = bool
  default = false
}
