# Terraform (Validation-First Reintroduction)

This Terraform folder is reintroduced in **validation-first** mode.

## Safety Defaults

- No GitHub workflow auto-applies on `main`
- CI validates syntax only (`fmt`, `init -backend=false`, `validate`)
- Cloudflare resources are disabled by default (`enable_cloudflare_resources=false`)
- Manual `plan` is available via `workflow_dispatch` with explicit confirmation for production

## Local Validation

```bash
./scripts/validate-terraform.sh
```

If `terraform` is not installed locally, the script uses Docker (`hashicorp/terraform`).

## Manual Plan (no apply)

Run the **Terraform Validate / Manual Plan** workflow and set:
- `run_plan=true`
- `environment=dev|staging|prod`
- `confirm_prod=PLAN_PROD` (required for prod)

## Enabling Resource Creation (later, separate rollout PR)

1. Review provider/resource compatibility against current Cloudflare provider version
2. Set `enable_cloudflare_resources=true` in a reviewed plan
3. Run manual `plan`
4. Add a separate, guarded apply workflow only after operator runbooks and environment protections are in place
