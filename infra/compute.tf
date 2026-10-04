# Placeholder payload. CI replaces the code on every deploy, so the archive here
# only has to be a valid zip that Terraform can create the function from.
data "archive_file" "bootstrap" {
  type        = "zip"
  output_path = "${path.root}/.terraform/bootstrap.zip"

  source {
    filename = "index.mjs"
    content  = "export const handler = async () => ({ statusCode: 503, body: 'no bundle deployed yet' });\n"
  }
}

resource "aws_lambda_function" "app" {
  function_name = var.name
  role          = aws_iam_role.lambda.arn
  architectures = ["arm64"]
  runtime       = "nodejs22.x"
  handler       = "index.handler"
  memory_size   = var.lambda_memory_mb
  timeout       = 60

  filename         = data.archive_file.bootstrap.output_path
  source_code_hash = data.archive_file.bootstrap.output_base64sha256

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      NODE_ENV         = "production"
      PGPOOL_MAX       = "2"
      DATABASE_URL     = "postgres://postgres:${random_password.db.result}@${aws_rds_cluster.this.endpoint}:5432/${local.db_name}"
      PAYLOAD_SECRET   = random_password.payload_secret.result
      OUTBOX_JOB_TOKEN = random_password.outbox_token.result
      TURNSTILE_SECRET = var.turnstile_secret
      # Not local.site_url: that reads the CloudFront domain, and this function
      # is an origin of that distribution, so the reference is a cycle.
      NEXT_PUBLIC_SITE_URL           = local.use_domain ? "https://${var.domain_name}" : ""
      BUSINESS_NAME                  = var.business_name
      BUSINESS_PHONE                 = var.business_phone
      BUSINESS_EMAIL                 = var.business_email
      BUSINESS_ADDRESS               = var.business_address
      CRM_TRANSPORT                  = "mock"
      NEXT_PUBLIC_TURNSTILE_SITE_KEY = var.turnstile_site_key
      NEXT_PUBLIC_GTM_ID             = var.gtm_id
      NEXT_PUBLIC_CALENDLY_URL       = var.calendly_url
      LEAD_NOTIFICATION_EMAILS       = var.lead_notification_email
    }
  }

  # CI owns the code; Terraform owns the function's shape.
  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}

resource "aws_lambda_function_url" "app" {
  function_name      = aws_lambda_function.app.function_name
  authorization_type = "NONE"
  invoke_mode        = "BUFFERED"
}

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.name}"
  retention_in_days = 14
}

resource "aws_cloudfront_origin_access_control" "s3" {
  name                              = "${var.name}-s3"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_function" "rewrite" {
  name    = "${var.name}-rewrite"
  runtime = "cloudfront-js-2.0"
  publish = true

  code = <<-JS
    function handler(event) {
      // www redirects to the apex, so one address is canonical. Must run before
      // the URI rewrite below, and returns a response rather than a request.
      var host = event.request.headers.host.value;
      if (host.indexOf("www.") === 0) {
        var qs = event.request.querystring;
        var q = Object.keys(qs).map(function (k) {
          return qs[k].value ? k + "=" + qs[k].value : k;
        }).join("&");
        return {
          statusCode: 301,
          statusDescription: "Moved Permanently",
          headers: {
            location: {
              value: "https://" + host.slice(4) + event.request.uri + (q ? "?" + q : ""),
            },
          },
        };
      }

      var uri = event.request.uri;
      // Nothing the export emits ends in a slash, but a typed URL, an old
      // bookmark or a mail client that normalises links can. Without this the
      // path would become "/services/.html". The "/" guard keeps the root from
      // being trimmed to "" and then to ".html".
      if (uri !== "/" && uri.endsWith("/")) {
        uri = uri.slice(0, -1);
      }
      if (uri === "/") {
        uri = "/index.html";
      } else if (!uri.includes(".")) {
        uri = uri + ".html";
      }
      event.request.uri = uri;
      return event.request;
    }
  JS
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

resource "aws_cloudfront_distribution" "this" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = var.name
  price_class         = "PriceClass_100"
  default_root_object = "index.html"

  aliases = local.use_domain ? [var.domain_name, "www.${var.domain_name}"] : []

  origin {
    origin_id                = "s3"
    domain_name              = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.s3.id
  }

  origin {
    origin_id   = "lambda"
    domain_name = replace(replace(aws_lambda_function_url.app.function_url, "https://", ""), "/", "")

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]

      # A cold Lambda plus an Aurora resume from min_capacity 0 can exceed the
      # 30s default, which surfaces to the visitor as a 502.
      origin_read_timeout = 60
    }
  }

  default_cache_behavior {
    target_origin_id       = "s3"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = data.aws_cloudfront_cache_policy.optimized.id

    # The export writes `services.html`; every link and sitemap entry says
    # `/services`. Nothing maps between them, so without this the S3 origin
    # answers a key that does not exist for every route but the home page.
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.rewrite.arn
    }
  }

  # Ordered before the default so `/api/*` reaches the Lambda, and so the
  # rewrite function above never sees an API path.
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "lambda"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]

    cache_policy_id          = data.aws_cloudfront_cache_policy.disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
  }

  # Immutable, content-hashed build output. Served from S3 so Lambda is never
  # invoked for a stylesheet.
  ordered_cache_behavior {
    path_pattern           = "/_next/static/*"
    target_origin_id       = "s3"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = data.aws_cloudfront_cache_policy.optimized.id
  }

  # 27 MB of images and 2.4 MB of video. Next serves public/media/x at /media/x,
  # so the pattern is the directory name, not "public". Filenames are not content
  # hashed, so the deploy invalidates these two prefixes.
  ordered_cache_behavior {
    path_pattern           = "/media/*"
    target_origin_id       = "s3"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = data.aws_cloudfront_cache_policy.optimized.id
  }

  ordered_cache_behavior {
    path_pattern           = "/video/*"
    target_origin_id       = "s3"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = data.aws_cloudfront_cache_policy.optimized.id
  }

  # Both codes, and 403 is the one that fires. The bucket policy grants
  # s3:GetObject without s3:ListBucket, so S3 answers a missing key with 403
  # rather than 404; mapping only 404 would serve an S3 XML error document.
  custom_error_response {
    error_code            = 403
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 10
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
  function_name = "${var.name}-migrate"
  role          = aws_iam_role.lambda.arn
  architectures = ["arm64"]
  runtime       = "nodejs22.x"
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
  name              = "/aws/lambda/${var.name}-migrate"
  retention_in_days = 14
}
