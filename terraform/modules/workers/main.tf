terraform {
  required_providers {
    cloudflare = {
      source = "cloudflare/cloudflare"
    }
  }
}

locals {
  worker_bindings = {
    ENV       = var.environment
    DOMAIN    = var.domain
    LOG_LEVEL = var.environment == "prod" ? "error" : "debug"
  }
}

output "worker_bindings" {
  value       = local.worker_bindings
  description = "Proposed worker plaintext bindings for operator review."
}
