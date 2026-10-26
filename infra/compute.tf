data "archive_file" "bootstrap" {
  type        = "zip"
  output_path = "${path.root}/.terraform/bootstrap.zip"

  source {
    filename = "index.mjs"
    content  = "export const handler = async () => ({ statusCode: 503, body: 'no bundle deployed yet' });\n"
  }
}

resource "aws_lambda_function" "app" {
  function_name = var.NAME
  role          = aws_iam_role.lambda.arn
  architectures = ["arm64"]
  runtime       = "nodejs24.x"
  handler       = "index.handler"
  memory_size   = var.LAMBDA_MEMORY_MB
  timeout       = 60

  filename         = data.archive_file.bootstrap.output_path
  source_code_hash = data.archive_file.bootstrap.output_base64sha256

  vpc_config {
    subnet_ids                  = aws_subnet.private[*].id
    security_group_ids          = [aws_security_group.lambda.id]
    ipv6_allowed_for_dual_stack = true
  }

  environment {
    variables = merge({
      NODE_ENV                       = "production"
      PGPOOL_MAX                     = "2"
      DATABASE_URL                   = "postgres://postgres:${random_password.db.result}@${aws_rds_cluster.this.endpoint}:5432/${local.db_name}"
      PAYLOAD_SECRET                 = random_password.payload_secret.result
      OUTBOX_JOB_TOKEN               = random_password.outbox_token.result
      TURNSTILE_SECRET               = var.TURNSTILE_SECRET
      NEXT_PUBLIC_SITE_URL           = local.use_domain ? "https://${var.DOMAIN_NAME}" : ""
      BUSINESS_NAME                  = var.BUSINESS_NAME
      BUSINESS_PHONE                 = var.BUSINESS_PHONE
      BUSINESS_EMAIL                 = var.BUSINESS_EMAIL
      BUSINESS_ADDRESS               = var.BUSINESS_ADDRESS
      CRM_TRANSPORT                  = var.CRM_TRANSPORT
      CRM_RELAY_URL                  = var.CRM_RELAY_URL
      CRM_RELAY_SECRET               = var.CRM_RELAY_SECRET
      NEXT_PUBLIC_TURNSTILE_SITE_KEY = var.TURNSTILE_SITE_KEY
      NEXT_PUBLIC_GTM_ID             = var.GTM_ID
      NEXT_PUBLIC_CALENDLY_URL       = var.CALENDLY_URL
      LEAD_NOTIFICATION_EMAIL        = var.LEAD_NOTIFICATION_EMAIL
    }, local.ses_env, var.CRM_INBOX_ENABLED ? { CRM_INBOX_ENABLED = "true" } : {})
  }

  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}

resource "aws_lambda_function_url" "app" {
  function_name      = aws_lambda_function.app.function_name
  authorization_type = "AWS_IAM"
  invoke_mode        = "BUFFERED"
}

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.NAME}"
  retention_in_days = 14
}

resource "aws_cloudfront_origin_access_control" "s3" {
  name                              = "${var.NAME}-s3"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_origin_access_control" "lambda" {
  name                              = "${var.NAME}-lambda"
  origin_access_control_origin_type = "lambda"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_function" "rewrite" {
  name    = "${var.NAME}-rewrite"
  runtime = "cloudfront-js-2.0"
  publish = true

  code = templatefile("${path.module}/rewrite.js.tftpl", { basic_auth = local.basic_auth })
}

data "aws_cloudfront_cache_policy" "optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_cache_policy" "disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_viewer_except_host" {
  name = "Managed-AllViewerExceptHostHeader"
}

locals {
  media_origin = var.MEDIA_HOST != "" ? " https://${var.MEDIA_HOST}" : ""
}

resource "aws_cloudfront_response_headers_policy" "security" {
  name = "${var.NAME}-security"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 63072000
      include_subdomains         = false
      override                   = true
    }

    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
  }

  custom_headers_config {
    dynamic "items" {
      for_each = local.basic_auth != "" ? [1] : []

      content {
        header   = "X-Robots-Tag"
        override = true
        value    = "noindex, nofollow"
      }
    }

    items {
      header   = "Content-Security-Policy-Report-Only"
      override = true
      value    = "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://challenges.cloudflare.com https://assets.calendly.com; style-src 'self' 'unsafe-inline' https://assets.calendly.com; img-src 'self' data: blob: https://*.google-analytics.com https://*.googletagmanager.com${local.media_origin}; media-src 'self'${local.media_origin}; font-src 'self'; connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://www.google.com; frame-src https://challenges.cloudflare.com https://calendly.com https://www.googletagmanager.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
    }
  }
}

resource "aws_cloudfront_distribution" "this" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = var.NAME
  price_class         = "PriceClass_100"
  default_root_object = "index.html"

  aliases = local.site_hostnames

  origin {
    origin_id                = "s3"
    domain_name              = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.s3.id
  }

  origin {
    origin_id                = "lambda"
    domain_name              = replace(replace(aws_lambda_function_url.app.function_url, "https://", ""), "/", "")
    origin_access_control_id = aws_cloudfront_origin_access_control.lambda.id

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
      origin_read_timeout    = 60
    }
  }

  default_cache_behavior {
    target_origin_id       = "s3"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = data.aws_cloudfront_cache_policy.optimized.id

    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.rewrite.arn
    }
  }

  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "lambda"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]

    cache_policy_id          = data.aws_cloudfront_cache_policy.disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
  }

  ordered_cache_behavior {
    path_pattern           = "/_next/static/*"
    target_origin_id       = "s3"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = data.aws_cloudfront_cache_policy.optimized.id

    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
  }

  ordered_cache_behavior {
    path_pattern           = "/media/*"
    target_origin_id       = "s3"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = data.aws_cloudfront_cache_policy.optimized.id

    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
  }

  ordered_cache_behavior {
    path_pattern           = "/video/*"
    target_origin_id       = "s3"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = data.aws_cloudfront_cache_policy.optimized.id

    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
  }

  custom_error_response {
    error_code            = 404
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 10
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = local.use_domain ? null : true
    acm_certificate_arn            = one(aws_acm_certificate_validation.this[*].certificate_arn)
    ssl_support_method             = local.use_domain ? "sni-only" : null
    minimum_protocol_version       = local.use_domain ? "TLSv1.2_2021" : null
  }
}

resource "aws_lambda_function" "migrate" {
  function_name = "${var.NAME}-migrate"
  role          = aws_iam_role.lambda.arn
  architectures = ["arm64"]
  runtime       = "nodejs24.x"
  handler       = "migrate.handler"
  memory_size   = 1024
  timeout       = 300

  filename         = data.archive_file.bootstrap.output_path
  source_code_hash = data.archive_file.bootstrap.output_base64sha256

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      NODE_ENV     = "production"
      DATABASE_URL = "postgres://postgres:${random_password.db.result}@${aws_rds_cluster.this.endpoint}:5432/${local.db_name}"
      PGPOOL_MAX   = "2"
    }
  }

  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}

resource "aws_cloudwatch_log_group" "migrate" {
  name              = "/aws/lambda/${var.NAME}-migrate"
  retention_in_days = 14
}
