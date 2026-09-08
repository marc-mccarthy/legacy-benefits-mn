# Remote state in S3 with native S3 locking (Terraform 1.10+). A DynamoDB lock
# table is no longer required.
#
# Bootstrap once, before the first init:
#   aws s3 mb s3://<state-bucket>
#   aws s3api put-bucket-versioning --bucket <state-bucket> \
#     --versioning-configuration Status=Enabled
#   aws s3api put-bucket-encryption --bucket <state-bucket> \
#     --server-side-encryption-configuration \
#     '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
terraform {
  backend "s3" {
    bucket       = "REPLACE-ME-terraform-state"
    key          = "nates-website/dev/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
