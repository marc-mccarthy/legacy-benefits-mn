locals {
  site_hostnames = local.use_domain ? [var.domain_name, "www.${var.domain_name}"] : []

  cert_validation = {
    for dvo in flatten(aws_acm_certificate.this[*].domain_validation_options) : dvo.domain_name => dvo
  }

  site_alias_records = {
    for pair in setproduct(local.site_hostnames, ["A", "AAAA"]) : "${pair[1]}:${pair[0]}" => {
      name = pair[0]
      type = pair[1]
    }
  }
}

resource "aws_route53_zone" "this" {
  count = local.use_domain ? 1 : 0

  name = var.domain_name
}

resource "terraform_data" "name_servers" {
  count = local.use_domain ? 1 : 0

  triggers_replace = aws_route53_zone.this[0].name_servers

  provisioner "local-exec" {
    command = "echo 'Set these nameservers for ${var.domain_name} at Squarespace: ${join(" ", aws_route53_zone.this[0].name_servers)}'"
  }
}

resource "aws_acm_certificate" "this" {
  count = local.use_domain ? 1 : 0

  region                    = "us-east-1"
  domain_name               = var.domain_name
  subject_alternative_names = ["www.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = toset(local.site_hostnames)

  allow_overwrite = true
  zone_id         = aws_route53_zone.this[0].zone_id
  name            = local.cert_validation[each.key].resource_record_name
  type            = local.cert_validation[each.key].resource_record_type
  ttl             = 60
  records         = [local.cert_validation[each.key].resource_record_value]
}

resource "aws_acm_certificate_validation" "this" {
  count = local.use_domain ? 1 : 0

  region                  = "us-east-1"
  certificate_arn         = aws_acm_certificate.this[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]

  timeouts {
    create = "6h"
  }
}

resource "aws_route53_record" "site" {
  for_each = local.site_alias_records

  zone_id = aws_route53_zone.this[0].zone_id
  name    = each.value.name
  type    = each.value.type

  alias {
    name                   = aws_cloudfront_distribution.this.domain_name
    zone_id                = aws_cloudfront_distribution.this.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "extra" {
  for_each = local.use_domain ? var.dns_extra_records : {}

  zone_id = aws_route53_zone.this[0].zone_id
  name    = each.value.name == "" ? var.domain_name : "${each.value.name}.${var.domain_name}"
  type    = each.value.type
  ttl     = each.value.ttl
  records = each.value.records
}
