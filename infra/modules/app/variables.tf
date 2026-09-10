variable "name" { type = string }
variable "region" { type = string }
variable "vpc_id" { type = string }
variable "public_subnet_ids" { type = list(string) }
variable "private_subnet_ids" { type = list(string) }
variable "has_certificate" {
  description = "Whether certificate_arn will be a real ARN. Passed explicitly because the ARN itself is unknown at plan time and this gates a count."
  type        = bool
  default     = false
}

variable "certificate_arn" {
  description = "ACM certificate for the ALB. Empty means no custom domain: the ALB serves HTTP and CloudFront terminates TLS with its default certificate."
  type        = string
  default     = ""
}
variable "alb_security_group_id" { type = string }
variable "app_security_group_id" { type = string }
variable "database_url_secret_arn" { type = string }

variable "image" {
  description = "Container image URI. CI updates the service with new tags."
  type        = string
}

variable "container_port" {
  type    = number
  default = 3000
}

variable "task_cpu" {
  type    = string
  default = "512"
}

variable "task_memory" {
  type    = string
  default = "1024"
}

variable "desired_count" {
  type    = number
  default = 1
}

variable "max_capacity" {
  type    = number
  default = 4
}

variable "site_url" {
  description = "Public origin, e.g. https://example.com. Leave empty when there is no custom domain — the app then derives its own URL from the incoming request."
  type        = string
  default     = ""
}

variable "crm_transport" {
  description = "mock | webhook | zapier"
  type        = string
  default     = "mock"
}

variable "business_name" { type = string }

variable "business_phone" {
  type    = string
  default = ""
}

variable "ses_from_address" {
  description = "Envelope sender. Empty makes the app skip sending rather than fail (src/lib/email/index.ts:41)."
  type        = string
  default     = ""
}

# The four below are read at RUNTIME by server components, so they are plain
# environment entries rather than Docker build args. Only NEXT_PUBLIC_SITE_URL
# is baked at build time (see the Dockerfile), because it is the one a client
# bundle needs inlined.
#
# All four were absent from the task definition entirely, so the container ran
# without them regardless of what was configured anywhere else.

variable "turnstile_site_key" {
  description = "Cloudflare Turnstile PUBLIC site key. Pairs with the TURNSTILE_SECRET secret; without it the widget never renders and no token is produced."
  type        = string
  default     = ""
}

variable "gtm_id" {
  description = "Google Tag Manager container ID. Empty means the tag manager is never loaded, which is a valid state."
  type        = string
  default     = ""
}

variable "calendly_url" {
  description = "Calendly scheduling URL. Empty hides the booking embed."
  type        = string
  default     = ""
}

variable "lead_notification_email" {
  description = "Fallback recipient for lead notifications when Site Settings has none. Comma-separated."
  type        = string
  default     = ""
}

variable "log_retention_days" {
  type    = number
  default = 30
}

variable "container_insights" {
  type    = bool
  default = false
}

variable "deletion_protection" {
  type    = bool
  default = false
}

variable "secret_recovery_days" {
  type    = number
  default = 7
}
