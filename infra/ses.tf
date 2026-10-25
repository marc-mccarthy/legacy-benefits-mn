locals {
  use_ses = local.use_domain && var.SES_FROM_ADDRESS != ""

  ses_env = local.use_ses ? {
    SES_FROM_ADDRESS           = var.SES_FROM_ADDRESS
    AWS_USE_DUALSTACK_ENDPOINT = "true"
  } : {}
}

resource "aws_sesv2_email_identity" "sender" {
  count = local.use_ses ? 1 : 0

  email_identity = var.DOMAIN_NAME
}

resource "aws_route53_record" "ses_dkim" {
  count = local.use_ses ? 3 : 0

  zone_id = local.zone_id
  name    = "${aws_sesv2_email_identity.sender[0].dkim_signing_attributes[0].tokens[count.index]}._domainkey.${var.DOMAIN_NAME}"
  type    = "CNAME"
  ttl     = 1800
  records = ["${aws_sesv2_email_identity.sender[0].dkim_signing_attributes[0].tokens[count.index]}.dkim.amazonses.com"]
}

data "aws_iam_policy_document" "lambda_ses" {
  count = local.use_ses ? 1 : 0

  statement {
    actions   = ["ses:SendEmail", "ses:SendRawEmail"]
    resources = [aws_sesv2_email_identity.sender[0].arn]
  }
}

resource "aws_iam_role_policy" "lambda_ses" {
  count = local.use_ses ? 1 : 0

  name   = "${var.NAME}-lambda-ses"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.lambda_ses[0].json
}
