variable "name" {
  description = "Project name prefix"
  type        = string
  default     = "nates-website"
}

variable "region" {
  type    = string
  default = "us-east-1"
}

variable "vpc_cidr" {
  type    = string
  default = "10.20.0.0/16"
}

variable "domain_name" {
  description = "Public hostname. Leave empty to be served on the CloudFront default URL."
  type        = string
  default     = ""
}

variable "hosted_zone_id" {
  description = "Route 53 zone containing domain_name. Only needed when domain_name is set."
  type        = string
  default     = ""
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
  description = "mock until the MedicarePRO credential exists, then webhook"
  type        = string
  default     = "mock"
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

variable "spf_record" {
  type    = string
  default = ""
}

variable "dmarc_record" {
  type    = string
  default = ""
}
