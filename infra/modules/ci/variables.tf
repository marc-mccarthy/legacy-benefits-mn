variable "name" { type = string }
variable "ecr_repository_arn" { type = string }
variable "task_role_arns" { type = list(string) }

variable "github_repository" {
  description = "owner/repo"
  type        = string
}

variable "allowed_refs" {
  description = "Git refs permitted to assume the deploy role"
  type        = list(string)
  default     = ["ref:refs/heads/main"]
}

variable "create_oidc_provider" {
  description = "False if the account already has the GitHub OIDC provider"
  type        = bool
  default     = true
}

variable "existing_oidc_provider_arn" {
  type    = string
  default = ""
}
