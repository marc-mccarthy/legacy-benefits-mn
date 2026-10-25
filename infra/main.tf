terraform {
  required_version = "~> 1.16"

  required_providers {
    aws     = { source = "hashicorp/aws", version = "~> 6.63" }
    random  = { source = "hashicorp/random", version = "~> 3.6" }
    archive = { source = "hashicorp/archive", version = "~> 2.7" }
  }
}

provider "aws" {
  region = var.REGION

  default_tags {
    tags = {
      Project   = var.NAME
      ManagedBy = "terraform"
    }
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

data "aws_kms_alias" "rds" {
  name = "alias/aws/rds"
}

locals {
  db_name    = replace(var.NAME, "-", "_")
  use_domain = var.DOMAIN_NAME != ""
  site_url   = local.use_domain ? "https://${var.DOMAIN_NAME}" : "https://${aws_cloudfront_distribution.this.domain_name}"

  zone_name   = var.ROUTE53_ZONE_NAME != "" ? var.ROUTE53_ZONE_NAME : var.DOMAIN_NAME
  create_zone = local.use_domain && local.zone_name == var.DOMAIN_NAME
  with_www    = local.create_zone
  basic_auth  = var.BASIC_AUTH_USER != "" ? base64encode("${var.BASIC_AUTH_USER}:${var.BASIC_AUTH_PASSWORD}") : ""
}

resource "aws_vpc" "this" {
  cidr_block                       = "10.20.0.0/16"
  assign_generated_ipv6_cidr_block = true
  enable_dns_support               = true
  enable_dns_hostnames             = true

  tags = { Name = var.NAME }
}

resource "aws_subnet" "private" {
  count = 2

  vpc_id                          = aws_vpc.this.id
  cidr_block                      = "10.20.${count.index + 1}.0/24"
  ipv6_cidr_block                 = cidrsubnet(aws_vpc.this.ipv6_cidr_block, 8, count.index)
  assign_ipv6_address_on_creation = true
  availability_zone               = data.aws_availability_zones.available.names[count.index]

  tags = { Name = "${var.NAME}-${count.index + 1}" }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.this.id
  tags   = { Name = var.NAME }
}

resource "aws_route_table_association" "private" {
  count = 2

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

resource "aws_egress_only_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id
  tags   = { Name = var.NAME }
}

resource "aws_route" "private_ipv6_egress" {
  route_table_id              = aws_route_table.private.id
  destination_ipv6_cidr_block = "::/0"
  egress_only_gateway_id      = aws_egress_only_internet_gateway.this.id
}

resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.this.id
  service_name      = "com.amazonaws.${var.REGION}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.private.id]

  tags = { Name = var.NAME }
}

resource "aws_security_group" "lambda" {
  name   = "${var.NAME}-lambda"
  vpc_id = aws_vpc.this.id
  tags   = { Name = "${var.NAME}-lambda" }
}

resource "aws_security_group" "db" {
  name   = "${var.NAME}-db"
  vpc_id = aws_vpc.this.id
  tags   = { Name = "${var.NAME}-db" }
}

resource "aws_vpc_security_group_egress_rule" "lambda_all" {
  security_group_id = aws_security_group.lambda.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

resource "aws_vpc_security_group_egress_rule" "lambda_https_ipv6" {
  security_group_id = aws_security_group.lambda.id
  cidr_ipv6         = "::/0"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}

resource "aws_vpc_security_group_ingress_rule" "db_from_lambda" {
  security_group_id            = aws_security_group.db.id
  referenced_security_group_id = aws_security_group.lambda.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
}

resource "aws_db_subnet_group" "this" {
  name       = var.NAME
  subnet_ids = aws_subnet.private[*].id
}

resource "random_password" "db" {
  length  = 32
  special = false
}

resource "random_password" "payload_secret" {
  length  = 48
  special = false
}

resource "random_password" "outbox_token" {
  length  = 32
  special = false
}

resource "aws_rds_cluster" "this" {
  cluster_identifier = var.NAME
  engine             = "aurora-postgresql"
  engine_mode        = "provisioned"
  engine_version     = "16.8"
  database_name      = local.db_name
  master_username    = "postgres"
  master_password    = random_password.db.result
  storage_encrypted  = true
  kms_key_id         = data.aws_kms_alias.rds.target_key_arn

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.db.id]

  serverlessv2_scaling_configuration {
    min_capacity             = 0
    max_capacity             = var.DB_MAX_ACU
    seconds_until_auto_pause = var.DB_SECONDS_UNTIL_AUTO_PAUSE
  }

  deletion_protection       = true
  backup_retention_period   = 7
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.NAME}-final"
  apply_immediately         = true

  lifecycle {
    ignore_changes = [engine_version]
  }
}

resource "aws_rds_cluster_instance" "this" {
  identifier         = var.NAME
  cluster_identifier = aws_rds_cluster.this.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.this.engine
  engine_version     = aws_rds_cluster.this.engine_version

  lifecycle {
    ignore_changes = [engine_version]
  }
}

resource "aws_s3_bucket" "assets" {
  bucket        = "${var.NAME}-assets-${data.aws_caller_identity.current.account_id}"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket                  = aws_s3_bucket.assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

data "aws_iam_policy_document" "assets" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.assets.arn}/*"]

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

  statement {
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.assets.arn]

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

  statement {
    effect    = "Deny"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.assets.arn}/releases/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
  }
}

resource "aws_s3_bucket_policy" "assets" {
  bucket = aws_s3_bucket.assets.id
  policy = data.aws_iam_policy_document.assets.json
}

resource "aws_s3_bucket_lifecycle_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  rule {
    id     = "expire-releases"
    status = "Enabled"

    filter {
      prefix = "releases/"
    }

    expiration {
      days = 30
    }
  }
}
