terraform {
  required_providers {
    cloudflare = {
      source = "cloudflare/cloudflare"
    }
  }
}

# Cloudflare Workers KV namespaces already defined in cloudflare module
# This module extends with additional worker-specific configurations

# Store sensitive config in Cloudflare Workers env
resource "cloudflare_workers_script" "env" {
  account_id = var.cloudflare_account_id
  name       = "${var.project_name}-env-${var.environment}"
  content    = file("${path.module}/worker-env.js")
  
  # Pass environment variables as plain text (NOT secrets)
  plain_text_binding {
    name = "ENV"
    text = var.environment
  }
  
  plain_text_binding {
    name = "DOMAIN"
    text = var.domain
  }
  
  plain_text_binding {
    name = "LOG_LEVEL"
    text = var.environment == "prod" ? "error" : "debug"
  }
}
