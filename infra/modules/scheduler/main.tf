terraform {
  required_version = "~> 1.16"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.63" }
  }
}

# Drains queued leads to MedicarePRO on a schedule.
#
# This lives outside the app module so it can target the site's final public
# URL — which is the CloudFront domain when no custom domain is configured, and
# therefore is not known until the distribution exists.
#
# EventBridge cannot POST to an arbitrary HTTPS URL from a plain rule target;
# it needs a connection (holding the auth header) plus an API destination.

resource "aws_cloudwatch_event_connection" "outbox" {
  name               = "${var.name}-outbox"
  description        = "Bearer auth for the outbox drain endpoint"
  authorization_type = "API_KEY"

  auth_parameters {
    api_key {
      key   = "Authorization"
      value = "Bearer ${var.outbox_token}"
    }
  }
}

resource "aws_cloudwatch_event_api_destination" "outbox" {
  name                             = "${var.name}-outbox"
  invocation_endpoint              = "${var.site_url}/api/jobs/outbox"
  http_method                      = "POST"
  invocation_rate_limit_per_second = 10
  connection_arn                   = aws_cloudwatch_event_connection.outbox.arn
}

resource "aws_cloudwatch_event_rule" "outbox" {
  name                = "${var.name}-outbox-drain"
  description         = "Deliver queued leads to MedicarePRO"
  schedule_expression = var.schedule
}

data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["events.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "events" {
  name               = "${var.name}-events"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

data "aws_iam_policy_document" "invoke" {
  statement {
    actions   = ["events:InvokeApiDestination"]
    resources = [aws_cloudwatch_event_api_destination.outbox.arn]
  }
}

resource "aws_iam_role_policy" "invoke" {
  name   = "${var.name}-events-invoke"
  role   = aws_iam_role.events.id
  policy = data.aws_iam_policy_document.invoke.json
}

resource "aws_cloudwatch_event_target" "outbox" {
  rule     = aws_cloudwatch_event_rule.outbox.name
  arn      = aws_cloudwatch_event_api_destination.outbox.arn
  role_arn = aws_iam_role.events.arn
  input    = jsonencode({})
}
