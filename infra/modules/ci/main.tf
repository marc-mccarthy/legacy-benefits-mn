terraform {
  required_version = "~> 1.16"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.63" }
  }
}

data "aws_caller_identity" "current" {}

# GitHub Actions authenticates via OIDC. No long-lived AWS access keys are
# created, stored in GitHub, or rotated by hand.
resource "aws_iam_openid_connect_provider" "github" {
  count = var.create_oidc_provider ? 1 : 0

  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

locals {
  # Derived, never passed in. GitHub's OIDC provider ARN is fully determined by
  # the account id and a fixed issuer host, so when this root is not the one
  # creating it there is still nothing for a human to look up or paste.
  oidc_arn = var.create_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
}

data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [local.oidc_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # Scoped to this repository, and to the branches allowed to deploy.
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = [for ref in var.allowed_refs : "repo:${var.github_repository}:${ref}"]
    }
  }
}

resource "aws_iam_role" "deploy" {
  name               = "${var.name}-github-deploy"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

data "aws_iam_policy_document" "deploy" {
  statement {
    sid       = "EcrAuth"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid = "EcrPush"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:CompleteLayerUpload",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
    ]
    resources = [var.ecr_repository_arn]
  }

  # Scoped to THIS environment's cluster and service.
  #
  # These were on resources = ["*"], and dev's trust policy admits
  # refs/heads/develop while prod's admits only main. Since both environments
  # share an AWS account, a push to develop could register a task definition
  # pointing at any image and UpdateService the production cluster — privilege
  # escalation from the least-protected branch into the most protected one.
  statement {
    sid = "EcsDeploy"
    actions = [
      "ecs:DescribeServices",
      "ecs:UpdateService",
    ]
    resources = [var.service_arn]
  }

  statement {
    sid = "EcsRunMigrationTask"
    actions = [
      "ecs:RunTask",
      "ecs:DescribeTasks",
      "ecs:ListTasks",
    ]
    resources = ["*"]

    # RunTask takes the task-definition ARN as its resource and DescribeTasks
    # takes the task ARN, neither of which is known here — task definitions gain
    # a revision on every deploy. The cluster condition is what actually bounds
    # this: it cannot touch another environment's cluster.
    condition {
      test     = "ArnEquals"
      variable = "ecs:cluster"
      values   = [var.cluster_arn]
    }
  }

  # Unavoidably account-wide: RegisterTaskDefinition and DescribeTaskDefinition
  # take no resource ARN, and support no useful condition key. The real bound on
  # the damage is PassTaskRoles below — a task definition that cannot pass a
  # role cannot run anything.
  statement {
    sid = "EcsTaskDefinitions"
    actions = [
      "ecs:RegisterTaskDefinition",
      "ecs:DescribeTaskDefinition",
    ]
    resources = ["*"]
  }

  # Registering a task definition requires passing the task roles.
  statement {
    sid       = "PassTaskRoles"
    actions   = ["iam:PassRole"]
    resources = var.task_role_arns

    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy" "deploy" {
  name   = "${var.name}-github-deploy"
  role   = aws_iam_role.deploy.id
  policy = data.aws_iam_policy_document.deploy.json
}
