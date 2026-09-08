variable "name" { type = string }
variable "domain_name" {
  description = "Custom hostname. Empty means the site is served on the CloudFront default domain."
  type        = string
  default     = ""
}
variable "hosted_zone_id" {
  description = "Route 53 zone containing domain_name. Required only when domain_name is set."
  type        = string
  default     = ""
}
variable "alb_dns_name" { type = string }
variable "media_bucket" { type = string }
variable "media_bucket_arn" { type = string }
variable "media_bucket_regional_domain_name" { type = string }

variable "subject_alternative_names" {
  type    = list(string)
  default = []
}

variable "price_class" {
  type    = string
  default = "PriceClass_100"
}

variable "form_rate_limit" {
  description = "Requests to /api/* per 5 minutes per IP before blocking"
  type        = number
  default     = 300
}

variable "alb_has_certificate" {
  description = "Whether the ALB has an HTTPS listener, which decides how CloudFront reaches the origin"
  type        = bool
  default     = false
}

variable "include_www" {
  description = "Also serve www.<domain>, covered by the certificate and aliased to the distribution"
  type        = bool
  default     = true
}
