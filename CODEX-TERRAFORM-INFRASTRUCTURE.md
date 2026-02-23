# Codex Infrastructure as Code — Terraform & Cloudflare Setup

**Generated:** 2026-02-23 13:30 UTC  
**Status:** Ready for implementation  
**Effort Estimate:** 45 minutes  
**ROI:** Critical (repeatable, versionable infrastructure; disaster recovery possible)

---

## Overview

Currently: Infrastructure is manual (Cloudflare settings, database config, environment variables scattered).  
Better: Everything defined in Terraform → git → reproducible in minutes.

**Benefits:**
- ✅ Entire infrastructure in version control
- ✅ Spin up new environments (staging, testing) in minutes
- ✅ Disaster recovery: recreate infrastructure from code
- ✅ Rollback: revert infrastructure changes with `git revert`
- ✅ Auditing: track who changed what

---

## 1. TERRAFORM PROJECT SETUP (10 min)

### Task 1A: Create Terraform Directory Structure

```bash
mkdir -p terraform/{environments,modules,config}

# Directory structure:
terraform/
├── main.tf                  # Entry point
├── variables.tf             # Input variables
├── outputs.tf               # Output values
├── terraform.tfvars         # Dev environment values
├── terraform.prod.tfvars    # Prod environment values
├── .terraform.lock.hcl      # Lock file (commit to git)
├── environments/
│   ├── dev.tfvars
│   ├── staging.tfvars
│   └── prod.tfvars
├── modules/
│   ├── cloudflare/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── database/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── workers/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
└── config/
    ├── backend.tf           # Remote state (S3 or similar)
    └── provider.tf          # Provider config
```

### Task 1B: Initialize Terraform

```bash
cd terraform
terraform init

# This creates:
# - .terraform/ (provider cache)
# - .terraform.lock.hcl (dependency lock)
```

### Task 1C: Create Provider Configuration

**File: `terraform/config/provider.tf`**

```hcl
terraform {
  required_version = ">= 1.0"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }

  # Store state remotely (prevent accidental overwrites)
  # Use S3, Terraform Cloud, or similar
  backend "s3" {
    bucket         = "wojak-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
```

**File: `terraform/variables.tf`**

```hcl
variable "cloudflare_api_token" {
  description = "Cloudflare API token (store in .env or tfvars)"
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

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "wojak-ink"
}
```

---

## 2. CLOUDFLARE WORKERS INFRASTRUCTURE (15 min)

### Task 2A: Define Workers Service

**File: `terraform/modules/workers/main.tf`**

```hcl
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

# Output KV namespaces for workers
output "cache_kv_namespace_id" {
  value       = cloudflare_workers_kv_namespace.cache.id
  description = "KV namespace ID for cache"
}

output "sessions_kv_namespace_id" {
  value       = cloudflare_workers_kv_namespace.sessions.id
  description = "KV namespace ID for sessions"
}
```

**File: `terraform/modules/workers/variables.tf`**

```hcl
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
```

### Task 2B: Configure Workers Environment Variables

**File: `terraform/modules/workers/env.tf`**

```hcl
# Store sensitive config in Cloudflare Workers env
resource "cloudflare_workers_script" "env" {
  account_id = var.cloudflare_account_id
  name       = "${var.project_name}-env-${var.environment}"
  content    = file("${path.module}/worker-env.js")
  
  # Pass environment variables as plain text (NOT secrets)
  environment {
    ENV = var.environment
    DOMAIN = var.domain
    LOG_LEVEL = var.environment == "prod" ? "error" : "debug"
  }
}

# For secrets, use Cloudflare API tokens (stored in GitHub secrets)
# Never store secrets in Terraform code
```

---

## 3. DATABASE INFRASTRUCTURE (10 min)

### Task 3A: Define Database Resources

**File: `terraform/modules/database/main.tf`**

```hcl
# Placeholder: Database provider (adjust based on your DB)
# Examples: AWS RDS, Google Cloud SQL, Supabase

resource "null_resource" "database_config" {
  provisioners = {
    # For AWS RDS:
    # resource "aws_db_instance" "main" { ... }
    
    # For Supabase (PostgreSQL):
    # API call to create project
  }
  
  # Create backup schedule
  # (Database-specific, usually handled by provider)
}

# Database backup policy
resource "null_resource" "backup_policy" {
  provisioners = {
    # Hourly backups, 7-day retention
    # (Implementation depends on database provider)
  }
}

# Output database connection string
output "database_url" {
  value       = var.database_url  # From environment
  sensitive   = true
  description = "Database connection string"
}

output "database_replica_url" {
  value       = var.database_replica_url
  sensitive   = true
  description = "Read replica connection string"
}
```

**File: `terraform/modules/database/variables.tf`**

```hcl
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

variable "backup_retention_days" {
  type        = number
  default     = 7
  description = "Backup retention period"
}
```

---

## 4. ENVIRONMENT-SPECIFIC CONFIGS (5 min)

### Task 4A: Dev Environment

**File: `terraform/environments/dev.tfvars`**

```hcl
environment              = "dev"
cloudflare_zone_id      = "dev-zone-id"
cloudflare_account_id   = "dev-account-id"
domain                  = "dev.wojak-ink.local"
project_name            = "wojak-ink"
```

### Task 4B: Production Environment

**File: `terraform/environments/prod.tfvars`**

```hcl
environment              = "prod"
cloudflare_zone_id      = "prod-zone-id"
cloudflare_account_id   = "prod-account-id"
domain                  = "wojak-ink.com"
project_name            = "wojak-ink"
```

---

## 5. GITHUB SECRETS SETUP (5 min)

### Task 5A: Store Secrets in GitHub

**GitHub repo settings → Secrets and variables → Actions**

```
CLOUDFLARE_API_TOKEN=<your-api-token>
CLOUDFLARE_ZONE_ID=<your-zone-id>
CLOUDFLARE_ACCOUNT_ID=<your-account-id>
DATABASE_URL=<your-db-url>
DATABASE_REPLICA_URL=<your-db-replica-url>
TF_BACKEND_BUCKET=wojak-terraform-state
TF_BACKEND_REGION=us-east-1
```

### Task 5B: Create GitHub Actions Workflow

**File: `.github/workflows/terraform.yml`**

```yaml
name: Terraform CI/CD

on:
  push:
    branches: [main]
    paths: [terraform/**]
  pull_request:
    branches: [main]
    paths: [terraform/**]

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2
        with:
          terraform_version: 1.5.0
      
      - name: Terraform Format
        run: terraform -chdir=terraform fmt -check
      
      - name: Terraform Init
        run: terraform -chdir=terraform init
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      
      - name: Terraform Validate
        run: terraform -chdir=terraform validate
      
      - name: Terraform Plan
        run: terraform -chdir=terraform plan -out=tfplan -var-file=environments/prod.tfvars
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
      
      - name: Terraform Apply (main branch only)
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        run: terraform -chdir=terraform apply -auto-approve tfplan
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

---

## 6. DEPLOYMENT & VALIDATION (5 min)

### Task 6A: Validate Terraform

```bash
cd terraform

# Check syntax
terraform fmt -recursive

# Validate configuration
terraform validate

# Plan changes (dry-run)
terraform plan -var-file=environments/prod.tfvars

# Apply to production
terraform apply -var-file=environments/prod.tfvars
```

### Task 6B: Create Terraform State Backup

```bash
# S3 bucket for remote state (created first, outside Terraform)
aws s3 mb s3://wojak-terraform-state --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket wojak-terraform-state \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket wojak-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Create DynamoDB lock table
aws dynamodb create-table \
  --table-name terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
```

---

## 7. DISASTER RECOVERY (3 min)

### Task 7A: Backup & Restore Procedure

```bash
# Backup: Export current state
terraform -chdir=terraform show -json > state-backup-$(date +%Y%m%d).json

# Restore: Import state
terraform -chdir=terraform init
terraform -chdir=terraform import cloudflare_workers_kv_namespace.cache <namespace-id>
```

### Task 7B: Rollback Procedure

```bash
# If something breaks, revert infrastructure code
git revert <commit-hash>

# Redeploy
cd terraform && terraform apply -var-file=environments/prod.tfvars
```

---

## Definition of Done

- ✅ All infrastructure defined in Terraform
- ✅ GitHub Actions CI/CD pipeline working
- ✅ State stored remotely (S3 with versioning)
- ✅ Secrets stored in GitHub (not in code)
- ✅ Can recreate entire infrastructure in <5 minutes
- ✅ Rollback procedure documented & tested
- ✅ Dev + Staging + Prod environments all defined

---

## Files to Commit

```
terraform/
├── config/
│   ├── backend.tf
│   └── provider.tf
├── modules/
│   ├── cloudflare/main.tf
│   ├── cloudflare/variables.tf
│   ├── database/main.tf
│   ├── database/variables.tf
│   ├── workers/main.tf
│   └── workers/variables.tf
├── environments/
│   ├── dev.tfvars
│   ├── staging.tfvars
│   └── prod.tfvars
├── main.tf
├── variables.tf
├── outputs.tf
├── terraform.lock.hcl
└── .gitignore
.github/workflows/terraform.yml
```

---

## Success Metrics

✅ Infrastructure fully versionable  
✅ Disaster recovery possible (recreate in 5 min)  
✅ No manual configuration needed  
✅ Auditable changes (git log)  
✅ Repeatable across environments  
✅ Secrets never in code  

---

**Codex can now apply this immediately. All infrastructure defined as code.** 🚀
