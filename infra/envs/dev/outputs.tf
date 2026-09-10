output "site_url" {
  description = "Visit this. Custom domain when configured, otherwise the CloudFront URL."
  value       = module.edge.site_url
}

output "cloudfront_domain" {
  value = module.edge.distribution_domain_name
}

output "ecr_repository_url" {
  value = module.app.ecr_repository_url
}

output "ecs_cluster_name" {
  value = module.app.cluster_name
}

output "ecs_service_name" {
  value = module.app.service_name
}

output "cloudfront_distribution_id" {
  value = module.edge.distribution_id
}

output "github_deploy_role_arn" {
  description = "Set as AWS_DEPLOY_ROLE_ARN in GitHub repository variables"
  value       = module.ci.deploy_role_arn
}

output "medicarepro_webhook_secret_arn" {
  description = "Populate by hand with the one-time URL from MedicarePRO, then set crm_transport = \"webhook\""
  value       = module.app.medicarepro_webhook_secret_arn
}

output "turnstile_secret_arn" {
  description = "Populate by hand with the Cloudflare Turnstile secret key. Ships as REPLACE_ME; until it is set, form submissions fail verification."
  value       = module.app.turnstile_secret_arn
}

# --- Diagnostics ------------------------------------------------------------
# Everything below exists to answer "it is not working, why". The ALB name in
# particular is the one that separates "CloudFront is misconfigured" from "the
# app is down", which is otherwise guesswork from a 503.

output "alb_dns_name" {
  description = "The origin hostname. NOT reachable from your laptop — the ALB security group only admits the CloudFront prefix list, deliberately, so the WAF cannot be bypassed. Useful for reading target health, not for curl."
  value       = module.app.alb_dns_name
}

output "target_health_command" {
  description = "Whether the ALB considers any task healthy. Replaces curling the origin, which the CloudFront-only ingress rule now blocks."
  value       = "aws elbv2 describe-target-health --target-group-arn $(aws elbv2 describe-target-groups --names ${module.app.target_group_name} --query 'TargetGroups[0].TargetGroupArn' --output text)"
}

output "log_group_name" {
  description = "aws logs tail <this> --follow — the first place to look when tasks will not start."
  value       = module.app.log_group_name
}

output "database_endpoint" {
  description = "RDS endpoint. Reachable only from inside the VPC, by design."
  value       = module.data.endpoint
}

output "database_url_secret_arn" {
  description = "Connection string, including the generated password. Read it to run migrations by hand."
  value       = module.data.database_url_secret_arn
}

output "media_bucket" {
  description = "Payload uploads land here. Empty after a fresh apply until something is uploaded or seeded."
  value       = module.app.media_bucket
}

output "alerts_topic_arn" {
  description = "SNS topic behind the CloudWatch alarms. Each alert_emails address must confirm its subscription before it ever receives one."
  value       = module.observability.alerts_topic_arn
}

output "deployment_runbook" {
  description = "What to expect from an apply, and the commands to check it. Read this first when the site is not up."
  value       = <<-EOT
    Deployment runbook — ${local.name}

    A BOOTSTRAP APPLY IS EXPECTED TO SERVE 503. That is not a broken deploy.
    ECS will not create a service without a resolvable image and the registry
    is empty on day one, so the first apply runs the placeholder from
    terraform.tfvars — nginx, listening on port 80. The target group health
    checks port 3000 at /api/health, so the check gets connection-refused,
    tasks never turn healthy, and the load balancer has nothing to route to.
    The site comes up once a real image is pushed, not before.

      1. Push an image. Either let CI do it (Actions -> Deploy), or by hand:

           aws ecr get-login-password --region ${var.region} \
             | docker login --username AWS --password-stdin \
               ${split("/", module.app.ecr_repository_url)[0]}
           docker build --platform linux/arm64 -t ${module.app.ecr_repository_url}:bootstrap .
           docker push ${module.app.ecr_repository_url}:bootstrap

         CI needs these as GitHub ENVIRONMENT variables (not repository ones,
         or dev and prod deploy to the same place):

           AWS_REGION            ${var.region}
           AWS_DEPLOY_ROLE_ARN   ${module.ci.deploy_role_arn}
           ECR_REPOSITORY        ${module.app.ecr_repository_url}
           ECS_CLUSTER           ${module.app.cluster_name}
           ECS_SERVICE           ${module.app.service_name}
           SITE_URL              ${module.edge.site_url}

      2. Watch the rollout settle:

           aws ecs describe-services --cluster ${module.app.cluster_name} \
             --services ${module.app.service_name} \
             --query 'services[0].deployments'

      3. If tasks keep restarting, the reason is in the logs, not the console:

           aws logs tail ${module.app.log_group_name} --follow

      4. Check whether the ALB has a healthy task. The origin cannot be
         curled from outside — its security group admits only CloudFront, so
         the WAF cannot be bypassed — so ask the target group instead:

           aws elbv2 describe-target-health --target-group-arn \\
             $(aws elbv2 describe-target-groups --names ${module.app.target_group_name} \\
               --query 'TargetGroups[0].TargetGroupArn' --output text)

         healthy targets but a failure at ${module.edge.site_url} means the
         edge is at fault. No healthy targets means the application is.

      5. Two secrets ship as REPLACE_ME and nothing will remind you:

           ${module.app.turnstile_secret_arn}
           ${module.app.medicarepro_webhook_secret_arn}

         Until Turnstile is set, the contact form submits and then fails
         verification, which looks like a broken form. Leads are written to
         Postgres and queued in crm_outbox regardless, so nothing is lost while
         the MedicarePRO URL is still a placeholder.

      6. SES starts in the sandbox and can only mail verified addresses.
         Leaving it needs an AWS support case — there is no API for it.
  EOT
}

output "route53_nameservers" {
  description = "Paste into the registrar only after dns_cutover_runbook's checks pass — records resolving AND the registrar's DNSSEC DS record gone. Empty unless create_dns_zone is true."
  value       = var.create_dns_zone ? module.dns[0].nameservers : []
}

output "dns_verify_command" {
  value = var.create_dns_zone ? module.dns[0].verify_command : ""
}

output "route53_zone_id" {
  description = "Zone created here. Read by infra/scripts/preflight-cutover.sh. Empty unless create_dns_zone is true."
  value       = var.create_dns_zone ? module.dns[0].zone_id : ""
}

output "dns_cutover_runbook" {
  description = "Ordered steps for the nameserver switch. Read this before touching the registrar."
  value       = var.create_dns_zone ? module.dns[0].cutover_runbook : ""
}
