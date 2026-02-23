terraform {
  required_providers {
    cloudflare = {
      source = "cloudflare/cloudflare"
    }
  }
}

resource "cloudflare_workers_kv_namespace" "cache" {
  count      = var.enable_resources ? 1 : 0
  account_id = var.cloudflare_account_id
  title      = "${var.project_name}_cache_${var.environment}"
}

resource "cloudflare_workers_kv_namespace" "sessions" {
  count      = var.enable_resources ? 1 : 0
  account_id = var.cloudflare_account_id
  title      = "${var.project_name}_sessions_${var.environment}"
}

output "cache_kv_namespace_id" {
  value       = var.enable_resources ? cloudflare_workers_kv_namespace.cache[0].id : null
  description = "KV namespace ID for cache (null when enable_resources=false)"
}

output "sessions_kv_namespace_id" {
  value       = var.enable_resources ? cloudflare_workers_kv_namespace.sessions[0].id : null
  description = "KV namespace ID for sessions (null when enable_resources=false)"
}
