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

output "route53_nameservers" {
  description = "Paste into the registrar AFTER verifying records resolve. Empty unless create_dns_zone is true."
  value       = var.create_dns_zone ? module.dns[0].nameservers : []
}

output "dns_verify_command" {
  value = var.create_dns_zone ? module.dns[0].verify_command : ""
}
