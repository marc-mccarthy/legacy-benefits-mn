output "domain_identity_arn" {
  value = aws_ses_domain_identity.this.arn
}

output "notifications_topic_arn" {
  value = aws_sns_topic.notifications.arn
}
