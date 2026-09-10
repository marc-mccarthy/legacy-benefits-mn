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

# The GitHub OIDC provider is an account-level singleton: one per AWS account,
# no matter how many environments live there.
#
# Default true, because the expected layout is one environment per account, and
# then this root owns the provider outright — created on apply, removed on
# destroy, nothing left behind.
#
# Put dev and prod in the SAME account and the second apply fails with
# EntityAlreadyExists. Set this to false on whichever one you apply second; the
# ARN does not need to be supplied, because it is fully determined by the
# account id (see locals in main.tf). Nothing is ever pasted between roots.
variable "create_oidc_provider" {
  description = "Create the account's GitHub OIDC provider here. True for one-environment-per-account (the default layout). Set false on the second environment if two share an account — the ARN is derived, not passed."
  type        = bool
  default     = true
}

variable "cluster_arn" {
  description = "Bounds RunTask to this environment's cluster. Without it a deploy role could run tasks on any cluster in the account."
  type        = string
}

variable "service_arn" {
  description = "Bounds UpdateService to this environment's service, so dev's more permissive branch rules cannot reach prod."
  type        = string
}
