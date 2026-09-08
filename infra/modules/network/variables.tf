variable "name" {
  description = "Name prefix for all resources"
  type        = string
}

variable "region" {
  description = "AWS region"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.20.0.0/16"
}

variable "single_nat_gateway" {
  description = "Use one NAT gateway for all AZs. Cheaper, but a single point of failure — false in production."
  type        = bool
  default     = true
}

variable "container_port" {
  description = "Port the application listens on inside the task"
  type        = number
  default     = 3000
}
