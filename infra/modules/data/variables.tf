variable "name" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "app_security_group_id" { type = string }

variable "engine_version" {
  type    = string
  default = "17.5"
}

variable "instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "allocated_storage" {
  type    = number
  default = 20
}

variable "max_allocated_storage" {
  description = "Upper bound for storage autoscaling"
  type        = number
  default     = 100
}

variable "database_name" {
  type    = string
  default = "nates_website"
}

variable "master_username" {
  type    = string
  default = "app"
}

variable "multi_az" {
  type    = bool
  default = false
}

variable "backup_retention_days" {
  type    = number
  default = 7
}

variable "deletion_protection" {
  type    = bool
  default = false
}

variable "performance_insights" {
  type    = bool
  default = false
}

variable "secret_recovery_days" {
  description = "Set to 0 in dev so secrets can be recreated immediately"
  type        = number
  default     = 7
}
