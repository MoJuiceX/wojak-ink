# Validation-first infrastructure entry point.
# Production mutation is intentionally disabled by default and must be enabled manually.

module "cloudflare" {
  source = "./modules/cloudflare"

  cloudflare_account_id = var.cloudflare_account_id
  cloudflare_zone_id    = var.cloudflare_zone_id
  project_name          = var.project_name
  environment           = var.environment
  domain                = var.domain
  enable_resources      = var.enable_cloudflare_resources
}

module "database" {
  source = "./modules/database"

  database_url         = var.database_url
  database_replica_url = var.database_replica_url
  environment          = var.environment
}

module "workers" {
  source = "./modules/workers"

  cloudflare_account_id = var.cloudflare_account_id
  project_name          = var.project_name
  environment           = var.environment
  domain                = var.domain
}
