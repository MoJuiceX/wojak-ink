variable "cloudflare_account_id" {
  type = string
}

variable "cloudflare_zone_id" {
  type = string
}

variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "domain" {
  type = string
}

variable "enable_resources" {
  type        = bool
  description = "When false, module validates without creating Cloudflare resources."
  default     = false
}
