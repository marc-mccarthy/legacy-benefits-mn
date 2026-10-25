locals {
  run_outbox = var.CRM_TRANSPORT == "relay"
}

data "aws_iam_policy_document" "scheduler_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["scheduler.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "scheduler" {
  count = local.run_outbox ? 1 : 0

  name               = "${var.NAME}-scheduler"
  assume_role_policy = data.aws_iam_policy_document.scheduler_assume.json
}

data "aws_iam_policy_document" "scheduler" {
  statement {
    actions   = ["lambda:InvokeFunction"]
    resources = [aws_lambda_function.app.arn]
  }
}

resource "aws_iam_role_policy" "scheduler" {
  count = local.run_outbox ? 1 : 0

  name   = "${var.NAME}-scheduler"
  role   = aws_iam_role.scheduler[0].id
  policy = data.aws_iam_policy_document.scheduler.json
}

resource "aws_scheduler_schedule" "outbox" {
  count = local.run_outbox ? 1 : 0

  name                = "${var.NAME}-outbox"
  schedule_expression = "rate(15 minutes)"

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = aws_lambda_function.app.arn
    role_arn = aws_iam_role.scheduler[0].arn

    input = jsonencode({
      rawPath        = "/api/jobs/outbox"
      requestContext = { http = { method = "POST", path = "/api/jobs/outbox" } }
      headers        = { authorization = "Bearer ${random_password.outbox_token.result}", host = var.DOMAIN_NAME }
    })
  }
}
