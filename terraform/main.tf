# Main infrastructure entry point

module "cloudflare" {
  source = "./modules/cloudflare"
  
  cloudflare_account_id = var.cloudflare_account_id
  cloudflare_zone_id    = var.cloudflare_zone_id
  project_name          = var.project_name
  environment           = var.environment
  domain                = var.domain
}

module "database" {
  source = "./modules/database"
  
  database_url          = var.database_url
  database_replica_url  = var.database_replica_url
  environment           = var.environment
}

module "workers" {
  source = "./modules/workers"
  
  cloudflare_account_id = var.cloudflare_account_id
  project_name          = var.project_name
  environment           = var.environment
  domain                = var.domain
}
