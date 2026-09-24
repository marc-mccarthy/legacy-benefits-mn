# The workflow needs values that only exist after an apply — the deploy role ARN
# above all. Managing the repository variables here removes the manual step of
# copying Terraform outputs into GitHub's UI.
#
# Authenticates with GITHUB_TOKEN from the environment; the token needs `repo`.
provider "github" {
  owner = split("/", var.github_repository)[0]
}

locals {
  github_repo = split("/", var.github_repository)[1]

  # Every value CI needs. TF_VAR_* are the variables with no default, which a
  # runner cannot read from .env because .env is gitignored.
  github_variables = {
    AWS_REGION            = var.region
    AWS_DEPLOY_ROLE_ARN   = aws_iam_role.deploy.arn
    ASSETS_BUCKET         = aws_s3_bucket.assets.bucket
    LAMBDA_FUNCTION_NAME  = aws_lambda_function.app.function_name
    MIGRATE_FUNCTION_NAME = aws_lambda_function.migrate.function_name
    CLOUDFRONT_ID         = aws_cloudfront_distribution.this.id
    SITE_URL              = local.site_url

    # Read by the Build step. They are baked into the static HTML, so they have
    # to exist before the build, not at Lambda runtime.
    NEXT_PUBLIC_SITE_URL           = local.site_url
    NEXT_PUBLIC_TURNSTILE_SITE_KEY = var.turnstile_site_key
    NEXT_PUBLIC_GTM_ID             = var.gtm_id
    NEXT_PUBLIC_CALENDLY_URL       = var.calendly_url
    NEXT_PUBLIC_MEDIA_HOST         = var.media_host
    BUSINESS_NAME                  = var.business_name
    BUSINESS_PHONE                 = var.business_phone
    BUSINESS_EMAIL                 = var.business_email
    BUSINESS_ADDRESS               = var.business_address
  }
}

resource "github_actions_variable" "this" {
  # The API rejects an empty value with a 422, so an unset optional variable is
  # omitted rather than written blank.
  for_each = var.manage_github_variables ? {
    for k, v in local.github_variables : k => v if v != ""
  } : {}

  repository    = local.github_repo
  variable_name = each.key
  value         = each.value
}
