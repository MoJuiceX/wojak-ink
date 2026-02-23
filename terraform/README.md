# Terraform Infrastructure as Code

Complete infrastructure definition for Wojak Ink platform.

## Quick Start

### Prerequisites
- Terraform >= 1.0
- AWS credentials (for S3 state backend)
- Cloudflare API token
- Environment variables in GitHub Secrets

### Initialize

```bash
cd terraform
terraform init
```

### Deploy to Dev

```bash
terraform plan -var-file=environments/dev.tfvars
terraform apply -var-file=environments/dev.tfvars
```

### Deploy to Staging

```bash
terraform plan -var-file=environments/staging.tfvars
terraform apply -var-file=environments/staging.tfvars
```

### Deploy to Production

```bash
terraform plan -var-file=environments/prod.tfvars
terraform apply -var-file=environments/prod.tfvars
```

## Structure

```
terraform/
├── main.tf                  # Entry point
├── variables.tf             # Global variables
├── outputs.tf               # Output values
├── config/
│   └── provider.tf          # Provider configuration
├── modules/
│   ├── cloudflare/          # Cloudflare (Workers, KV, WAF)
│   ├── database/            # Database configuration
│   └── workers/             # Worker-specific settings
└── environments/
    ├── dev.tfvars
    ├── staging.tfvars
    └── prod.tfvars
```

## State Management

State is stored in AWS S3 with DynamoDB locking:
- **Bucket:** `wojak-terraform-state`
- **Lock Table:** `terraform-locks`
- **Encryption:** Enabled
- **Versioning:** Enabled

## Disaster Recovery

### Backup State

```bash
terraform show -json > state-backup-$(date +%Y%m%d).json
```

### Restore State

```bash
terraform init
terraform import ...
```

### Rollback

```bash
git revert <commit-hash>
terraform apply -var-file=environments/prod.tfvars
```

## Required Secrets (GitHub)

```
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ZONE_ID
CLOUDFLARE_ACCOUNT_ID
DATABASE_URL
DATABASE_REPLICA_URL
DATABASE_URL_PROD
DATABASE_REPLICA_URL_PROD
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
```

## CI/CD

GitHub Actions automatically:
- ✅ Validates Terraform syntax
- ✅ Plans changes (PR feedback)
- ✅ Applies on main branch push
- ✅ Exports outputs as artifacts

## Commands Reference

```bash
# Validate syntax
terraform validate

# Format code
terraform fmt -recursive

# Plan changes
terraform plan -var-file=environments/prod.tfvars

# Apply changes
terraform apply -var-file=environments/prod.tfvars

# Destroy (WARNING: Production deletion)
terraform destroy -var-file=environments/prod.tfvars

# Export state
terraform state pull > state.json

# Show outputs
terraform output -json
```

## Modules

### Cloudflare
Manages:
- Workers KV namespaces (cache, sessions)
- Rate limiting
- DDoS protection
- WAF rules
- Page rules & caching policy
- HTTPS enforcement

### Database
Manages:
- Database connection strings
- Read replicas
- Backup policies
- Connection pooling

### Workers
Manages:
- Worker script deployment
- Environment variables
- Bindings to KV namespaces

## Notes

- All sensitive values are marked as `sensitive = true`
- Secrets are injected via GitHub Actions
- Never commit `.tfvars` files with real values
- Always review `terraform plan` output before applying
- Use `terraform import` to bring existing resources under management
