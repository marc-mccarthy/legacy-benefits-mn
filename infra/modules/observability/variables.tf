variable "name" { type = string }
variable "alb_arn_suffix" { type = string }
variable "target_group_arn_suffix" { type = string }
variable "db_instance_id" { type = string }
variable "log_group_name" { type = string }

variable "alert_emails" {
  description = "Addresses that receive alarm notifications. Each must confirm the SNS subscription by email."
  type        = list(string)
  default     = []
}
