variable "name" { type = string }

variable "site_url" {
  description = "Public origin of the site, without a trailing slash"
  type        = string
}

variable "outbox_token" {
  description = "Bearer token accepted by /api/jobs/outbox"
  type        = string
  sensitive   = true
}

variable "schedule" {
  type    = string
  default = "rate(1 minute)"
}
