variable "domain_name" {
  description = "Apex domain, e.g. legacybenefitsmn.com"
  type        = string
}

variable "records" {
  description = <<-EOT
    Every record the domain currently answers for, copied from the existing DNS
    host before the nameserver switch. `name` is relative to the apex ("" for
    the apex itself, "www" for www.example.com).

    Export these from the current provider rather than typing them from memory.
  EOT
  type = list(object({
    name    = string
    type    = string
    ttl     = optional(number, 3600)
    records = list(string)
  }))
  default = []
}

variable "google_workspace_mx" {
  description = "Add Google Workspace MX records. Verify against the live records first."
  type        = bool
  default     = false
}

variable "google_workspace_mx_legacy" {
  description = "Use the older five-record ASPMX set instead of the single SMTP.GOOGLE.COM record"
  type        = bool
  default     = false
}

variable "spf_record" {
  description = "Full SPF TXT value. A domain may publish only one. Example: v=spf1 include:_spf.google.com include:amazonses.com ~all"
  type        = string
  default     = ""
}

variable "dmarc_record" {
  description = "DMARC TXT value, e.g. v=DMARC1; p=none; rua=mailto:dmarc@example.com"
  type        = string
  default     = ""
}

variable "dkim_records" {
  description = <<-EOT
    DKIM public keys, keyed by selector — for Google Workspace the selector is
    usually "google". Pass the complete value including the "v=DKIM1; k=rsa; p="
    prefix; it is split into 255-character strings automatically.
  EOT
  type        = map(string)
  default     = {}
}

variable "deletion_protection" {
  description = "Mirrors the switch used across the other modules. False lets `terraform destroy` remove the zone even if records were added outside Terraform."
  type        = bool
  default     = true
}
