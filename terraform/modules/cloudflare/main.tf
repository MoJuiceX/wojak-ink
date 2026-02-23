terraform {
  required_providers {
    cloudflare = {
      source = "cloudflare/cloudflare"
    }
  }
}

# Cloudflare Workers KV namespace for caching
resource "cloudflare_workers_kv_namespace" "cache" {
  account_id = var.cloudflare_account_id
  title      = "${var.project_name}_cache_${var.environment}"
}

# Cloudflare Workers KV for sessions
resource "cloudflare_workers_kv_namespace" "sessions" {
  account_id = var.cloudflare_account_id
  title      = "${var.project_name}_sessions_${var.environment}"
}

# Rate limiting rule
resource "cloudflare_rate_limit" "api_limit" {
  zone_id = var.cloudflare_zone_id
  
  disabled   = false
  threshold  = 100
  period     = 60
  
  match {
    request {
      url {
        path {
          matches = "/api/*"
        }
      }
    }
  }
  
  action {
    mode    = "challenge"
    timeout = 3600
  }
  
  description = "Rate limit API endpoints to 100 requests/minute"
}

# DDoS protection
resource "cloudflare_ddos_protection_settings" "ddos" {
  zone_id = var.cloudflare_zone_id
  
  advanced_ddos = "on"
  prefetch_preload = "on"
}

# WAF rules
resource "cloudflare_waf_rule" "sql_injection" {
  zone_id  = var.cloudflare_zone_id
  rule_id  = "100000"  # SQL Injection
  mode     = "block"
}

resource "cloudflare_waf_rule" "xss" {
  zone_id  = var.cloudflare_zone_id
  rule_id  = "100001"  # XSS
  mode     = "block"
}

resource "cloudflare_waf_rule" "remote_code_execution" {
  zone_id  = var.cloudflare_zone_id
  rule_id  = "100033"  # Remote Code Execution
  mode     = "block"
}

# Page rules (caching strategy)
resource "cloudflare_page_rule" "cache_static" {
  zone_id = var.cloudflare_zone_id
  target  = "${var.domain}/assets/*"
  
  actions {
    cache_level         = "cache_everything"
    edge_cache_ttl      = 31536000  # 1 year
    browser_cache_ttl   = 604800    # 7 days
  }
}

resource "cloudflare_page_rule" "cache_api" {
  zone_id = var.cloudflare_zone_id
  target  = "${var.domain}/api/*"
  
  actions {
    cache_level         = "bypass"  # Don't cache API
    cache_on_cookie     = "session" # Cache by session
  }
}

# HTTPS redirect
resource "cloudflare_page_rule" "https_redirect" {
  zone_id = var.cloudflare_zone_id
  target  = "${var.domain}/*"
  
  actions {
    always_https = "on"
  }
}

output "cache_kv_namespace_id" {
  value       = cloudflare_workers_kv_namespace.cache.id
  description = "KV namespace ID for cache"
}

output "sessions_kv_namespace_id" {
  value       = cloudflare_workers_kv_namespace.sessions.id
  description = "KV namespace ID for sessions"
}
