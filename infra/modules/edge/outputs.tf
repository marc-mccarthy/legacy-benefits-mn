output "distribution_id" {
  value = aws_cloudfront_distribution.this.id
}

output "distribution_domain_name" {
  value = aws_cloudfront_distribution.this.domain_name
}

output "certificate_arn" {
  description = "Empty when there is no custom domain"
  value       = local.has_domain ? aws_acm_certificate_validation.this[0].certificate_arn : ""
}

output "site_url" {
  description = "The public URL, whether custom or CloudFront-assigned"
  value       = local.has_domain ? "https://${var.domain_name}" : "https://${aws_cloudfront_distribution.this.domain_name}"
}
