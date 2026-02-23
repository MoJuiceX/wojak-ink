variable "cloudflare_api_token" {
  description = "Cloudflare API token (store in CI secrets or local tfvars)"
  type        = string
  sensitive   = true
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "domain" {
  description = "Domain name"
  type        = string
  default     = "wojak-ink.com"
}

variable "database_url" {
  description = "Database connection string"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID"
  type        = string
}

variable "cloudflare_account_id" {
  description = "Cloudflare Account ID"
  type        = string
}

variable "database_replica_url" {
  description = "Read replica connection string"
  type        = string
  sensitive   = true
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "wojak-ink"
}

variable "enable_cloudflare_resources" {
  description = "Set true only for reviewed manual plans/applies. Defaults to validation-only mode."
  type        = bool
  default     = false
}
