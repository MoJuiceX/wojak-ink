# Database infrastructure module
# Supports various database providers (AWS RDS, Supabase, etc.)

# Placeholder for database configuration
# (Actual implementation depends on your chosen database provider)

# Local output of database configuration
output "database_url" {
  value       = var.database_url
  sensitive   = true
  description = "Database connection string"
}

output "database_replica_url" {
  value       = var.database_replica_url
  sensitive   = true
  description = "Read replica connection string"
}

output "database_name" {
  value       = var.database_name
  description = "Database name"
}

output "backup_retention_days" {
  value       = var.backup_retention_days
  description = "Backup retention period in days"
}
