terraform {
  backend "s3" {
    bucket       = "legacybenefitsgroup-tfstate-150701180133"
    key          = "terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
    encrypt      = true
  }
}
