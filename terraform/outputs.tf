output "cache_kv_namespace_id" {
  value       = module.cloudflare.cache_kv_namespace_id
  description = "KV namespace ID for cache"
}

output "sessions_kv_namespace_id" {
  value       = module.cloudflare.sessions_kv_namespace_id
  description = "KV namespace ID for sessions"
}

output "database_url" {
  value       = module.database.database_url
  sensitive   = true
  description = "Database connection string"
}

output "database_replica_url" {
  value       = module.database.database_replica_url
  sensitive   = true
  description = "Read replica connection string"
}

output "environment" {
  value       = var.environment
  description = "Deployed environment"
}

output "domain" {
  value       = var.domain
  description = "Domain name"
}
