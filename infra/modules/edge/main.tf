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
  #
  # Keyed on domain_name alone. hosted_zone_id is module.dns[0].zone_id whenever
  # the zone is created in the same run, so it is unknown until apply — and this
  # local gates `count` on the ACM certificate. Terraform cannot plan a count it
  # cannot resolve, which made a greenfield apply with a domain fail with
  # "Invalid count argument". The caller already guarantees the pairing: it
  # passes an empty domain_name whenever there is no domain, and its own
  # variable validations require a zone whenever there is one.
  #
  # hosted_zone_id is still used below, but only as an attribute on records,
  # where an apply-time value is perfectly fine.
  has_domain = var.domain_name != ""

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
  # Keyed by domain name, which is an input and therefore known at plan time.
  #
  # This used to key on opt.resource_record_name, taken from the certificate's
  # domain_validation_options. Those are only populated once ACM issues the
  # request, so for a NEW certificate the map keys were unknown and the plan
  # failed with "Invalid for_each argument" — Terraform will tolerate unknown
  # for_each *values*, never unknown *keys*.
  #
  # The original comment worried about a duplicate key when the apex and a SAN
  # emit the same validation record. That case is why allow_overwrite is set:
  # two instances writing one record is a harmless overwrite rather than a
  # planning error. Distinct SANs like www get distinct records anyway.
  for_each = local.has_domain ? toset(local.all_domains) : toset([])

  zone_id = var.hosted_zone_id
  name = one([
    for opt in aws_acm_certificate.this[0].domain_validation_options :
    opt.resource_record_name if opt.domain_name == each.value
  ])
  type = one([
    for opt in aws_acm_certificate.this[0].domain_validation_options :
    opt.resource_record_type if opt.domain_name == each.value
  ])
  records = [one([
    for opt in aws_acm_certificate.this[0].domain_validation_options :
    opt.resource_record_value if opt.domain_name == each.value
  ])]
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

        # SizeRestrictions_BODY blocks request bodies over 8 KB, which is every
        # real photograph. Left on, the CMS is effectively read-only for images:
        # the upload 403s at the edge, the admin shows a generic failure, and
        # nothing appears in the ECS logs because the request never reaches the
        # origin. Counted rather than removed, so the hits are still visible in
        # the WAF metrics.
        #
        # Payload's own limits remain the real bound on upload size.
        rule_action_override {
          name = "SizeRestrictions_BODY"
          action_to_use {
            count {}
          }
        }

        # Same class of problem: rich-text content from the Lexical editor is
        # HTML-shaped by nature, and this rule reads legitimate CMS bodies as
        # reflected XSS. It fires on saving a page, not on visitor traffic.
        rule_action_override {
          name = "CrossSiteScripting_BODY"
          action_to_use {
            count {}
          }
        }
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

  # /api/media/file/*, not /media/*.
  #
  # The old pattern could never match. Payload's s3Storage is configured without
  # generateFileURL or disablePayloadAccessControl, so uploads are served from
  # /api/media/file/<name> — verified against the rendered page. Every image
  # therefore fell through to the default behaviour, which uses CachingDisabled,
  # so each one streamed S3 -> ECS task -> ALB -> CloudFront on every request,
  # uncached, burning Fargate CPU on a photograph-heavy site.
  #
  # Pointed at the ALB rather than the S3 origin because that is genuinely where
  # these URLs resolve: Payload applies its own access control on the way past.
  ordered_cache_behavior {
    path_pattern           = "/api/media/file/*"
    target_origin_id       = local.alb_origin_id
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
