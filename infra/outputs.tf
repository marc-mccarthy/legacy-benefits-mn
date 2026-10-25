output "name" {
  value = var.NAME
}

output "business_name" {
  value = var.BUSINESS_NAME
}

output "region" {
  value = var.REGION
}

output "site_url" {
  value = local.site_url
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.this.domain_name
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.this.id
}

output "lambda_function_name" {
  value = aws_lambda_function.app.function_name
}

output "assets_bucket" {
  value = aws_s3_bucket.assets.bucket
}

output "deploy_role_arn" {
  value = aws_iam_role.deploy.arn
}

output "db_endpoint" {
  value = aws_rds_cluster.this.endpoint
}

output "migrate_function_name" {
  value = aws_lambda_function.migrate.function_name
}

output "name_servers" {
  description = "Route 53 nameservers to set as the domain's custom nameservers at the registrar."
  value       = one(aws_route53_zone.this[*].name_servers)
}

output "acm_validation_records" {
  description = "ACM DNS validation CNAMEs, name to value, for adding at the current DNS host before the nameserver switch."
  value = {
    for dvo in flatten(aws_acm_certificate.this[*].domain_validation_options) : dvo.resource_record_name => dvo.resource_record_value
  }
}

output "route53_zone_id" {
  value = local.use_domain ? local.zone_id : null
}
