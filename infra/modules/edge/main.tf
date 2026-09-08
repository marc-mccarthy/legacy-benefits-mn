terraform {
  required_version = "~> 1.16"
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = "~> 6.63"
      configuration_aliases = [aws.us_east_1]
    }
  }
}

locals {
  # No domain: CloudFront serves on its own *.cloudfront.net hostname with the
  # default certificate, so no ACM certificate and no Route 53 records are
  # created at all.
  has_domain = var.domain_name != "" && var.hosted_zone_id != ""

  # People type "www" whether or not it is advertised, so it is covered by
  # default: added to the certificate, aliased on the distribution, and given
  # its own record.
  www_domain = "www.${var.domain_name}"
  alternate_names = compact(concat(
    var.include_www ? [local.www_domain] : [],
    var.subject_alternative_names,
  ))
  all_domains = local.has_domain ? concat([var.domain_name], local.alternate_names) : []
}

# ACM certificates for CloudFront must live in us-east-1 regardless of where
# the rest of the stack runs.
resource "aws_acm_certificate" "this" {
  count                     = local.has_domain ? 1 : 0
  provider                  = aws.us_east_1
  domain_name               = var.domain_name
  subject_alternative_names = local.alternate_names
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "validation" {
  for_each = local.has_domain ? {
    # Keyed by the record name, not the domain: a certificate covering both
    # example.com and www.example.com can emit the same validation record
    # twice, which would be a duplicate map key.
    for opt in aws_acm_certificate.this[0].domain_validation_options :
    opt.resource_record_name => {
      name   = opt.resource_record_name
      record = opt.resource_record_value
      type   = opt.resource_record_type
    }
  } : {}

  zone_id         = var.hosted_zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "this" {
  count                   = local.has_domain ? 1 : 0
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.this[0].arn
  validation_record_fqdns = [for r in aws_route53_record.validation : r.fqdn]
}

# --- WAF --------------------------------------------------------------------

resource "aws_wafv2_web_acl" "this" {
  provider    = aws.us_east_1
  name        = "${var.name}-waf"
  description = "Managed rules plus rate limiting for the public site"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  rule {
    name     = "common"
    priority = 1
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesCommonRuleSet"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.name}-common"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "bad-inputs"
    priority = 2
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.name}-bad-inputs"
      sampled_requests_enabled   = true
    }
  }

  # Form endpoints are the abuse target on a lead-generation site: cheap to
  # submit, expensive to clean up downstream in the CRM.
  rule {
    name     = "rate-limit-forms"
    priority = 3
    action {
      block {}
    }
    statement {
      rate_based_statement {
        limit              = var.form_rate_limit
        aggregate_key_type = "IP"
        scope_down_statement {
          byte_match_statement {
            positional_constraint = "STARTS_WITH"
            search_string         = "/api/"
            field_to_match {
              uri_path {}
            }
            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
          }
        }
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.name}-rate-forms"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.name}-waf"
    sampled_requests_enabled   = true
  }
}

# --- CloudFront -------------------------------------------------------------

resource "aws_cloudfront_origin_access_control" "media" {
  name                              = "${var.name}-media-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

locals {
  alb_origin_id   = "alb"
  media_origin_id = "media"
}

resource "aws_cloudfront_distribution" "this" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = var.name
  aliases         = local.all_domains
  price_class     = var.price_class
  web_acl_id      = aws_wafv2_web_acl.this.arn

  origin {
    domain_name = var.alb_dns_name
    origin_id   = local.alb_origin_id

    custom_origin_config {
      http_port  = 80
      https_port = 443
      # The ALB only has a usable certificate when there is a custom domain.
      origin_protocol_policy = var.alb_has_certificate ? "https-only" : "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  origin {
    domain_name              = var.media_bucket_regional_domain_name
    origin_id                = local.media_origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.media.id
  }

  # Dynamic by default: this is a server-rendered app, and caching a page that
  # embeds a form or a consent state would be wrong.
  default_cache_behavior {
    target_origin_id       = local.alb_origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    cache_policy_id          = data.aws_cloudfront_cache_policy.disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer.id
  }

  ordered_cache_behavior {
    path_pattern           = "/_next/static/*"
    target_origin_id       = local.alb_origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = data.aws_cloudfront_cache_policy.optimized.id
  }

  ordered_cache_behavior {
    path_pattern           = "/media/*"
    target_origin_id       = local.media_origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = data.aws_cloudfront_cache_policy.optimized.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = local.has_domain ? null : true
    acm_certificate_arn            = local.has_domain ? aws_acm_certificate_validation.this[0].certificate_arn : null
    ssl_support_method             = local.has_domain ? "sni-only" : null
    minimum_protocol_version       = local.has_domain ? "TLSv1.2_2021" : null
  }

  tags = { Name = var.name }
}

data "aws_cloudfront_cache_policy" "optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_cache_policy" "disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_viewer" {
  name = "Managed-AllViewer"
}

# Only CloudFront may read the media bucket.
data "aws_iam_policy_document" "media_bucket" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${var.media_bucket_arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.this.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "media" {
  bucket = var.media_bucket
  policy = data.aws_iam_policy_document.media_bucket.json
}

# Apex and www both alias the distribution. An alias A record is used rather
# than a CNAME because the apex of a zone cannot hold a CNAME.
resource "aws_route53_record" "site" {
  for_each = local.has_domain ? toset(local.all_domains) : toset([])

  zone_id = var.hosted_zone_id
  name    = each.value
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.this.domain_name
    zone_id                = aws_cloudfront_distribution.this.hosted_zone_id
    evaluate_target_health = false
  }
}

# IPv6. Without this, visitors on IPv6-only networks cannot reach the site at
# all, and CloudFront already serves IPv6.
resource "aws_route53_record" "site_ipv6" {
  for_each = local.has_domain ? toset(local.all_domains) : toset([])

  zone_id = var.hosted_zone_id
  name    = each.value
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.this.domain_name
    zone_id                = aws_cloudfront_distribution.this.hosted_zone_id
    evaluate_target_health = false
  }
}
