terraform {
  required_version = "~> 1.16"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.63" }
  }
}

resource "aws_ses_domain_identity" "this" {
  domain = var.domain_name
}

# Without these two the apply reported success while the identity might never
# verify. DKIM and MAIL FROM records were published, which looks complete, but
# SES will not send from an unverified domain — every send fails with
# MessageRejected, and src/lib/email/index.ts swallows that into a console.error
# with no alarm behind it. Lead notification email would simply stop existing,
# silently, with a green apply.
#
# The verification resource makes the apply block until SES confirms, so a
# broken identity fails the deploy instead of surfacing weeks later.
resource "aws_route53_record" "verification" {
  zone_id = var.hosted_zone_id
  name    = "_amazonses.${var.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = [aws_ses_domain_identity.this.verification_token]
}

resource "aws_ses_domain_identity_verification" "this" {
  domain     = aws_ses_domain_identity.this.id
  depends_on = [aws_route53_record.verification]
}

resource "aws_ses_domain_dkim" "this" {
  domain = aws_ses_domain_identity.this.domain
}

resource "aws_route53_record" "dkim" {
  count = 3

  zone_id = var.hosted_zone_id
  name    = "${aws_ses_domain_dkim.this.dkim_tokens[count.index]}._domainkey.${var.domain_name}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_ses_domain_dkim.this.dkim_tokens[count.index]}.dkim.amazonses.com"]
}

resource "aws_ses_domain_mail_from" "this" {
  domain           = aws_ses_domain_identity.this.domain
  mail_from_domain = "mail.${var.domain_name}"
}

resource "aws_route53_record" "mail_from_mx" {
  zone_id = var.hosted_zone_id
  name    = aws_ses_domain_mail_from.this.mail_from_domain
  type    = "MX"
  ttl     = 600
  records = ["10 feedback-smtp.${var.region}.amazonses.com"]
}

resource "aws_route53_record" "mail_from_spf" {
  zone_id = var.hosted_zone_id
  name    = aws_ses_domain_mail_from.this.mail_from_domain
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com ~all"]
}

# Bounces and complaints must be actioned: repeatedly emailing an address that
# hard-bounces damages deliverability and, for a marketing list, is a
# compliance problem as well as a technical one.
resource "aws_sns_topic" "notifications" {
  name = "${var.name}-ses-notifications"
}

resource "aws_ses_identity_notification_topic" "bounce" {
  identity                 = aws_ses_domain_identity.this.arn
  notification_type        = "Bounce"
  topic_arn                = aws_sns_topic.notifications.arn
  include_original_headers = true
}

resource "aws_ses_identity_notification_topic" "complaint" {
  identity                 = aws_ses_domain_identity.this.arn
  notification_type        = "Complaint"
  topic_arn                = aws_sns_topic.notifications.arn
  include_original_headers = true
}
