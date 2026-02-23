variable "database_url" {
  type        = string
  sensitive   = true
  description = "Primary database URL"
}

variable "database_replica_url" {
  type        = string
  sensitive   = true
  description = "Read replica URL for scaling"
}

variable "database_name" {
  type        = string
  default     = "wojak_ink"
  description = "Database name"
}

variable "backup_retention_days" {
  type        = number
  default     = 7
  description = "Backup retention period"
}

variable "environment" {
  type        = string
  description = "Environment (dev, staging, prod)"
}
