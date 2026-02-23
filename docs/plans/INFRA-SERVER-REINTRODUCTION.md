# Infra + Server Health Reintroduction Plan

This follow-up branch restores the previously split-out server health endpoint and infra automation,
but only behind strict validation gates.

## Scope

- `functions/api/health.ts` (Cloudflare Pages-compatible health endpoint)
- `functions/lib/health/*` helper modules (database/cache/flags probes)
- `terraform/**` validation-first scaffolding (no automatic apply)
- `k8s/**` manifest examples with local syntax/shape validation
- `.github/workflows/{terraform,canary-deploy,auto-rollback}.yml` manual/PR-safe workflows
- `.github/workflows/infra-validate.yml` PR validation gate for infra assets

## Hard Safety Rules (before any prod reintroduction)

1. No automatic deploy/apply on `push` to `main`
2. Production actions require `workflow_dispatch` + explicit confirmation string
3. Terraform CI runs `fmt`, `init -backend=false`, and `validate` only by default
4. K8s manifests must pass local parser validation in CI
5. Workflow YAML must pass `actionlint`
6. Server health endpoint must have unit tests and remain lint/type clean

## Merge Gates

- `npx tsc --noEmit`
- `npm run lint:scoped -- --quiet`
- `npm run test:unit`
- `npm run build`
- `npm run infra:validate`
- CI green on PR

## Deferred (separate rollout PRs)

- Terraform `plan`/`apply` against real Cloudflare resources
- Cluster-connected K8s schema validation (requires CRDs/cluster API)
- Automatic rollback triggers (`workflow_run` / scheduled rollback logic)
- Production canary execution without human approval

## Why this shape

The original split-out files mixed Node/server assumptions into frontend paths and included
production-mutating workflows on `main` push. This branch reintroduces the same concerns in a
safe, reviewable, validate-first form.
