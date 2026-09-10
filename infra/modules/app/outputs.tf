output "ecr_repository_url" {
  value = aws_ecr_repository.this.repository_url
}

output "alb_dns_name" {
  value = aws_lb.this.dns_name
}

output "alb_zone_id" {
  value = aws_lb.this.zone_id
}

output "alb_arn_suffix" {
  value = aws_lb.this.arn_suffix
}

output "media_bucket" {
  value = aws_s3_bucket.media.bucket
}

output "media_bucket_arn" {
  value = aws_s3_bucket.media.arn
}

output "media_bucket_regional_domain_name" {
  value = aws_s3_bucket.media.bucket_regional_domain_name
}

output "cluster_name" {
  value = aws_ecs_cluster.this.name
}

output "service_name" {
  value = aws_ecs_service.this.name
}

output "log_group_name" {
  value = aws_cloudwatch_log_group.app.name
}

output "ecr_repository_arn" {
  value = aws_ecr_repository.this.arn
}

output "target_group_arn_suffix" {
  value = aws_lb_target_group.this.arn_suffix
}

output "task_role_arns" {
  value = [aws_iam_role.task.arn, aws_iam_role.execution.arn]
}

output "task_family" {
  value = aws_ecs_task_definition.this.family
}

output "outbox_token_secret_arn" {
  value = aws_secretsmanager_secret.outbox_token.arn
}

output "medicarepro_webhook_secret_arn" {
  description = "Populate this secret by hand with the one-time URL from MedicarePRO"
  value       = aws_secretsmanager_secret.medicarepro_webhook.arn
}

# Surfaced for the same reason as the one above: it ships as REPLACE_ME with
# ignore_changes, so nothing will ever tell you it is still a placeholder. An
# unpopulated Turnstile secret does not break the page — the form renders and
# submits, and verification simply fails, which reads as "the form is broken"
# rather than "a secret was never filled in".
output "turnstile_secret_arn" {
  description = "Populate this secret by hand with the Cloudflare Turnstile secret key"
  value       = aws_secretsmanager_secret.turnstile.arn
}

output "outbox_token" {
  description = "Bearer token the scheduler presents to the outbox drain endpoint"
  value       = random_password.outbox_token.result
  sensitive   = true
}

output "has_certificate" {
  value = local.has_certificate
}

output "target_group_name" {
  description = "Used to look up target health, which is how you check the app now that the ALB itself only answers CloudFront."
  value       = aws_lb_target_group.this.name
}

output "cluster_arn" {
  value = aws_ecs_cluster.this.arn
}

output "service_arn" {
  value = aws_ecs_service.this.id
}
