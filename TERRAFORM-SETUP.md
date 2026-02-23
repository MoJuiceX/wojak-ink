# Terraform Setup Instructions

## Install Terraform

### macOS
```bash
brew install terraform
```

### Linux (Ubuntu/Debian)
```bash
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
sudo apt-get update && sudo apt-get install terraform
```

### Linux (CentOS/RHEL)
```bash
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://rpm.releases.hashicorp.com/RHEL/hashicorp.repo
sudo yum -y install terraform
```

### Verify Installation
```bash
terraform version
```

## AWS Setup (for State Backend)

### Create S3 Bucket
```bash
aws s3 mb s3://wojak-terraform-state --region us-east-1
aws s3api put-bucket-versioning \
  --bucket wojak-terraform-state \
  --versioning-configuration Status=Enabled
aws s3api put-bucket-encryption \
  --bucket wojak-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

### Create DynamoDB Lock Table
```bash
aws dynamodb create-table \
  --table-name terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region us-east-1
```

## Environment Setup

### Add to GitHub Secrets
1. Go to repo → Settings → Secrets and variables → Actions
2. Add each secret:

```
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
CLOUDFLARE_API_TOKEN=<your-api-token>
CLOUDFLARE_ZONE_ID=<your-zone-id>
CLOUDFLARE_ACCOUNT_ID=<your-account-id>
DATABASE_URL=postgresql://user:pass@host/db
DATABASE_REPLICA_URL=postgresql://user:pass@replica-host/db
DATABASE_URL_PROD=postgresql://user:pass@prod-host/db
DATABASE_REPLICA_URL_PROD=postgresql://user:pass@prod-replica-host/db
```

### Local Environment (Development)

Create `.env` file (do not commit):
```bash
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export CLOUDFLARE_API_TOKEN="..."
export TF_VAR_cloudflare_zone_id="..."
export TF_VAR_cloudflare_account_id="..."
export TF_VAR_database_url="..."
export TF_VAR_database_replica_url="..."
```

Then source it:
```bash
source .env
```

## Deploy

### Initialize
```bash
cd terraform
terraform init
```

### Validate
```bash
terraform validate
terraform fmt -check -recursive
```

### Plan
```bash
# Dev
terraform plan -var-file=environments/dev.tfvars

# Prod
terraform plan -var-file=environments/prod.tfvars -out=tfplan
```

### Apply
```bash
# Dev
terraform apply -var-file=environments/dev.tfvars

# Prod (CI/CD)
terraform apply tfplan
```

## Troubleshooting

### State Lock Issues
```bash
# Force unlock (use carefully)
terraform force-unlock <LOCK_ID>
```

### Provider Issues
```bash
# Upgrade providers
terraform init -upgrade
```

### Destroy (WARNING)
```bash
terraform destroy -var-file=environments/prod.tfvars
```

---

**After setup, follow terraform/README.md for deployment**
