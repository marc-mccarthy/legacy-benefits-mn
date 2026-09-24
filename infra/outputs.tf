output "name" {
  value = var.name
}

output "region" {
  value = var.region
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
