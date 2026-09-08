variable "name" { type = string }
variable "region" { type = string }
variable "vpc_id" { type = string }
variable "public_subnet_ids" { type = list(string) }
variable "private_subnet_ids" { type = list(string) }
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

variable "media_host" {
  description = "CloudFront host serving media, used by next/image"
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
  type    = string
  default = ""
}

variable "outbox_schedule" {
  description = "How often to drain queued leads to the CRM"
  type        = string
  default     = "rate(1 minute)"
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
