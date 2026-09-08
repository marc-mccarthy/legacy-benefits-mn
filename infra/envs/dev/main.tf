terraform {
  required_version = "~> 1.16"

  required_providers {
    aws    = { source = "hashicorp/aws", version = "~> 6.63" }
    random = { source = "hashicorp/random", version = "~> 3.6" }
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = var.name
      Environment = "dev"
      ManagedBy   = "terraform"
    }
  }
}

# CloudFront certificates and WAF web ACLs must be created in us-east-1.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = var.name
      Environment = "dev"
      ManagedBy   = "terraform"
    }
  }
}

locals {
  name = "${var.name}-dev"

  # A custom domain is optional. Without one the stack still comes up and is
  # served on the CloudFront distribution's own *.cloudfront.net URL, which is
  # what `terraform output site_url` reports.
  has_domain = var.domain_name != "" && var.hosted_zone_id != ""
  site_url   = local.has_domain ? "https://${var.domain_name}" : ""
}

module "network" {
  source = "../../modules/network"

  name     = local.name
  region   = var.region
  vpc_cidr = var.vpc_cidr

  # One NAT gateway is enough for a non-production environment.
  single_nat_gateway = true
}

module "data" {
  source = "../../modules/data"

  name                  = local.name
  vpc_id                = module.network.vpc_id
  private_subnet_ids    = module.network.private_subnet_ids
  app_security_group_id = module.network.app_security_group_id

  instance_class        = "db.t4g.micro"
  multi_az              = false
  backup_retention_days = 7
  deletion_protection   = false
  performance_insights  = false
  secret_recovery_days  = 0
}

module "app" {
  source = "../../modules/app"

  name                    = local.name
  region                  = var.region
  vpc_id                  = module.network.vpc_id
  public_subnet_ids       = module.network.public_subnet_ids
  private_subnet_ids      = module.network.private_subnet_ids
  alb_security_group_id   = module.network.alb_security_group_id
  app_security_group_id   = module.network.app_security_group_id
  certificate_arn         = module.edge.certificate_arn
  database_url_secret_arn = module.data.database_url_secret_arn

  image = var.image
  # Empty when there is no custom domain; the app then derives its own URL
  # from the request, so canonical links and the sitemap stay correct.
  site_url       = local.site_url
  media_host     = var.domain_name
  business_name  = var.business_name
  business_phone = var.business_phone

  # Leads are stored and queued but not delivered until the real MedicarePRO
  # credential is in place. See infra README.
  crm_transport = var.crm_transport

  desired_count        = 1
  max_capacity         = 2
  log_retention_days   = 14
  deletion_protection  = false
  secret_recovery_days = 0
}

module "edge" {
  source = "../../modules/edge"

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  name                              = local.name
  domain_name                       = var.domain_name
  hosted_zone_id                    = var.hosted_zone_id
  alb_has_certificate               = local.has_domain
  alb_dns_name                      = module.app.alb_dns_name
  media_bucket                      = module.app.media_bucket
  media_bucket_arn                  = module.app.media_bucket_arn
  media_bucket_regional_domain_name = module.app.media_bucket_regional_domain_name
}

# Email requires a verified domain, so it is skipped for domainless previews.
module "email" {
  count  = local.has_domain ? 1 : 0
  source = "../../modules/email"

  name           = local.name
  domain_name    = var.domain_name
  hosted_zone_id = var.hosted_zone_id
  region         = var.region
}

module "scheduler" {
  source = "../../modules/scheduler"

  name         = local.name
  site_url     = module.edge.site_url
  outbox_token = module.app.outbox_token
}

module "observability" {
  source = "../../modules/observability"

  name                    = local.name
  alb_arn_suffix          = module.app.alb_arn_suffix
  target_group_arn_suffix = module.app.target_group_arn_suffix
  db_instance_id          = module.data.instance_id
  log_group_name          = module.app.log_group_name
  alert_emails            = var.alert_emails
}

module "ci" {
  source = "../../modules/ci"

  name               = local.name
  ecr_repository_arn = module.app.ecr_repository_arn
  task_role_arns     = module.app.task_role_arns
  github_repository  = var.github_repository
  allowed_refs       = ["ref:refs/heads/main", "ref:refs/heads/develop"]
}
