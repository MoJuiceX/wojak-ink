# SPEC: Architecture Failure Modes Hardening Plan (Wojak.ink)

> **For terminal agents (Codex/Claude CLI):** This spec is an execution-ready hardening plan to address the top architecture failure modes identified from repo evidence. Implement in phases, ship behind flags where possible, and do not collapse multiple phases into one risky deploy.

---

## Overview

Wojak.ink is a multi-service system with a React/Vite frontend, Cloudflare Pages Functions, Cloudflare D1 + KV, scheduled Cloudflare Workers, and a separate Socket.IO + MongoDB chat server, plus heavy reliance on upstream APIs (MintGarden, Dexie, SpaceScan, CoinGecko, Pinata, Clerk). The primary risks are outage cascade from upstreams, D1 contention as a shared hot path, durability gaps in the async mint pipeline, control-plane drift between chat components, and consistency drift across D1/KV/Mongo/Parse/client caches.

This spec defines a staged plan to make the system more resilient without freezing product development.

---

## Confirmed vs Inferred

### Confirmed from Repo (code/config evidence)

- Cloudflare Pages Functions with D1 + KV bindings in `/wrangler.toml`
- Multiple scheduled Cloudflare Workers sharing the same D1/KV bindings under `/workers/*`
- Separate chat server (`/socket-server`) using Socket.IO + Express + MongoDB (Mongoose)
- Mint pipeline uses D1 + KV + `context.waitUntil()` + cron cleanup (`/functions/api/mint/*`, `/workers/mint-cron/worker.ts`)
- External dependencies used in critical flows:
  - MintGarden (eligibility, minting, DID/indexing, sales enrichment)
  - Dexie (sales/trades)
  - SpaceScan (treasury)
  - CoinGecko (pricing)
  - Pinata (IPFS)
  - Clerk (auth/JWKS)
- Client Parse/Back4App integration exists (`/src/services/parseClient.ts`)

### Inferred (not directly confirmed)

- Production monitoring/alerting completeness
- Backup/restore procedures for D1/Mongo
- Deployment orchestration and secret rotation workflow across Cloudflare + Fly/Railway
- Current production chat server variant (`index.ts` vs `index-mvp.ts`) and rollout policy

---

## Goals

1. Prevent external API failures from taking down unrelated features.
2. Reduce D1 hot-path contention and inconsistent failure behavior.
3. Make mint job processing durable and observable (no silent limbo/orphaning).
4. Eliminate chat API/server contract drift and config mismatch failures.
5. Establish explicit data ownership, freshness, and reconciliation across stores.

## Non-Goals (for this spec)

- Full microservice rewrite
- Replacing D1 globally
- Replacing MongoDB chat persistence
- UI redesign work unrelated to resilience

---

## Top Failure Modes -> Remediation Mapping

1. Upstream outage/rate-limit cascade
2. Shared D1 bottleneck / rate-limit inconsistency
3. Mint pipeline orphaning across D1 + KV + `waitUntil` + cron
4. Chat control-plane drift (JWT secrets, health payloads, CORS, deployment variant)
5. Multi-store consistency drift (D1/KV/Mongo/Parse/client cache)

---

## Execution Rules for Terminal Agent

- Implement in the phase order below.
- Commit each phase independently (do not mix infra and app changes unless required).
- Prefer additive changes and feature flags to risky rewrites.
- Add tests for behavior changes before/with code changes.
- Do not remove legacy paths until parity verification is complete.
- Surface freshness/source metadata in APIs before changing caching behavior.

---

## Phase 0: Baseline Observability and Contract Inventory (Required First)

### Objective

Create minimal observability and contract checks so later hardening can be validated.

### Work Items

1. Add a shared response metadata shape for backend APIs
- Add `source`, `fetchedAt`, `stale`, and optional `degraded` fields where data is cached or proxied.
- Start with:
  - `/functions/api/chat/presence.ts`
  - `/functions/api/chat/token.ts` (for eligibility cache result)
  - `/functions/api/sales/sync-status.ts`
  - `/functions/api/trade-values.ts` (if returning cached material)
  - proxy endpoints under `/functions/api/{mintgarden,dexie,spacescan,coingecko}/[[path]].ts`

2. Add lightweight health endpoints / diagnostics
- Cloudflare Pages function endpoint: `/api/admin/system-health` (admin-protected)
  - D1 connectivity test
  - KV connectivity test
  - key env vars presence (booleans only, no secrets)
  - latest sales sync status
  - counts of stale mint jobs by age/step
- Chat server `/health` contract normalization (see Phase 4)

3. Add structured error codes to logs for critical paths
- Prefix with subsystem tags:
  - `[Upstream:MintGarden]`
  - `[Upstream:Dexie]`
  - `[D1:RateLimit]`
  - `[MintPipeline]`
  - `[ChatContract]`

4. Add a contract inventory doc (short)
- New file: `/docs/architecture-data-ownership.md`
- Define source-of-truth per domain:
  - mint jobs / economy / leaderboards -> D1
  - chat messages/presence history -> Mongo
  - ephemeral image payloads -> KV (temporary, until Phase 3)
  - client personalization / legacy Parse usage -> Parse/Back4App

### Acceptance Criteria

- Admin health endpoint returns JSON with subsystem statuses.
- At least 3 critical endpoints include freshness/degraded metadata.
- Logs are searchable by subsystem prefix.
- Data ownership doc exists and is referenced in README or docs index.

---

## Phase 1: Upstream Dependency Resilience (Outage and Rate-Limit Containment)

### Objective

Prevent MintGarden/Dexie/SpaceScan/CoinGecko/Pinata/Clerk failures from cascading into broad user-facing outages or incorrect denials.

### Key Problems in Current Repo

- Multiple ad hoc `fetch` implementations with inconsistent retries/timeouts/fallbacks.
- Some endpoints fail open, some fail closed, and some silently return zeros.
- Chat token eligibility currently falls back to D1 cache or `0`, which can deny valid users when cache is stale/missing.
- Proxy endpoints are thin passthroughs and do not expose freshness/degraded state.

### Work Items

#### 1. Create shared resilient fetch utility for Pages Functions and Workers

- Add `/functions/lib/upstream.ts` with:
  - `fetchWithTimeout()`
  - `fetchWithRetry()`
  - retry policy by status (`429`, `5xx`, network)
  - jittered exponential backoff
  - optional `Retry-After` parsing
  - error classification (`timeout`, `rate_limited`, `upstream_5xx`, `network`, `bad_json`)
  - response metadata helper (`degraded`, `stale`)
- Add `/workers/_shared/upstream.ts` (or duplicate if build constraints block imports)

#### 2. Standardize upstream cache fallback semantics

- For endpoints that use caches (D1/KV/local fallback), return:
  - `stale: true`
  - `degraded: "upstream_unavailable"`
  - `source: "cache:d1"` or `"cache:kv"`
- Never silently return fabricated zeros if it changes authorization/business logic.

#### 3. Fix chat eligibility/token issuance behavior on MintGarden outages

Files:
- `/functions/api/chat/token.ts`
- `/functions/api/chat/verify-eligibility.ts`

Implementation:
- Distinguish:
  - `fresh_verified`
  - `cached_verified`
  - `verification_unavailable`
- If upstream fails and no valid cache exists, return `503` (temporary verification unavailable), not `403`.
- If cache exists but stale > configured threshold (24h currently), return configurable behavior:
  - default: allow holder chat only from stale cache, block whale chat, mark `stale: true`
  - or strict mode via env flag (`CHAT_ELIGIBILITY_STRICT=true`)
- Add explicit error code payloads (`CHAT_ELIGIBILITY_UPSTREAM_UNAVAILABLE`, etc.).

#### 4. Harden proxy endpoints

Files:
- `/functions/api/dexie/[[path]].ts`
- `/functions/api/mintgarden/[[path]].ts`
- `/functions/api/spacescan/[[path]].ts`
- `/functions/api/coingecko/[[path]].ts`

Implementation:
- Add timeout and basic retry (read-only idempotent GET only).
- Forward `Retry-After` where present.
- Add `X-Upstream-Status` and `X-Upstream-Source` response headers.
- Return consistent JSON error envelope on failures.
- Add conservative cache headers per provider endpoint type (avoid over-caching auth-like routes).

#### 5. Add circuit breakers for repeated upstream failures in workers

Files:
- `/workers/fetch-sales/worker.ts`
- `/workers/did-indexer/worker.ts` (already has partial breaker)
- `/workers/credit-tracker/worker.ts`
- `/workers/mint-cron/worker.ts` (for MintGarden auto-detect and Pinata unpin)

Implementation:
- Share a simple consecutive-failure circuit breaker helper.
- Persist last-run status into KV (`TRADE_VALUES_KV`) or D1 health table.
- Workers must stop early and record degraded state instead of hammering failing upstreams.

### Acceptance Criteria

- Chat token endpoint returns `503` (not false `403`) when verification is unavailable and no valid cache exists.
- Proxy endpoints include upstream/degraded metadata headers.
- At least two workers record run status and short-circuit repeated upstream failures.
- Unit tests cover timeout/retry classification and chat eligibility outage behavior.

---

## Phase 2: D1 Bottleneck Reduction and Consistent Rate-Limit Semantics

### Objective

Reduce D1 write amplification on hot paths and normalize what happens when D1 is degraded.

### Key Problems in Current Repo

- D1 is shared by Pages + multiple cron workers + many gameplay/mint/chat endpoints.
- Rate limiting is implemented in D1 and intentionally fails open for some endpoints and fail closed for others.
- Public polling endpoints can amplify D1 load.

### Work Items

#### 1. Introduce explicit rate-limit policy map (fail-open/fail-closed by endpoint)

Files:
- `/functions/lib/rateLimit.ts`

Implementation:
- Replace implicit boolean flags with named policies:
  - `STRICT_SECURITY` (fail closed)
  - `ABUSE_RESISTANT` (fail closed with fallback budget)
  - `UX_PRESERVE` (fail open + telemetry)
- Add comments documenting why each endpoint uses a given policy.
- Record fallback behavior in logs (`[D1:RateLimit] fail-open`).

#### 2. Reduce D1 writes for chat presence and similar polling endpoints

Files:
- `/functions/api/chat/presence.ts`
- any other public polled endpoints using `checkRateLimit()`

Implementation options (choose least invasive first):
- Add in-memory edge cache for rate-limit state per isolate for very short windows (best effort).
- Use `increment=false` read checks for some poll endpoints and only increment periodically.
- Increase polling endpoint cacheability / client polling interval if acceptable.
- If available in your infra roadmap: move public endpoint rate limits to a dedicated mechanism (Cloudflare native rules or DO-backed limiter) in a later phase.

#### 3. Add D1 health/backpressure guard in heavy endpoints

Files:
- Mint endpoints (`/functions/api/mint/*.ts`)
- game/economy endpoints with burst writes

Implementation:
- If D1 latency/error threshold is exceeded (best effort local detector), return `503` + retry guidance for non-essential writes.
- For critical writes (mint submit/confirm), return clear error codes and do not partially execute.

#### 4. Reduce worker collision on D1

Files:
- `/workers/*/worker.ts`

Implementation:
- Stagger schedules where possible (infra config + docs).
- Add run locks for long-running workers (`worker_runs` table or KV lock) to prevent overlapping manual + cron runs.
- Batch writes consistently (D1 batch size caps already present in some workers).

### Acceptance Criteria

- Rate-limit policies are explicit and logged.
- Public polling endpoints generate fewer D1 writes under load (documented before/after estimate).
- Workers avoid overlapping runs (lock or guard implemented).
- Mint/game critical endpoints return consistent retryable `503` when DB is unhealthy.

---

## Phase 3: Mint Pipeline Durability (Eliminate Orphaning/Limbo Jobs)

### Objective

Make mint processing durable and observable, with no silent loss when `waitUntil` or KV TTL fails.

### Key Problems in Current Repo

- Mint submit writes job to D1, image payload to KV, then starts background work via `waitUntil`.
- If background execution fails or is delayed, the job relies on cron recovery.
- KV image payload expires (`MINT_JOBS_KV`, 2h TTL), leading to `IMAGE_EXPIRED`.
- Recovery is split between submit path, process path, and cron worker.

### Target Architecture (Incremental)

#### Short-term (required in this spec)
- Keep D1 + KV + cron, but improve leases/heartbeats/requeue behavior and observability.

#### Medium-term (recommended; may require infra setup)
- Move mint processing trigger to Cloudflare Queues.
- Store image payloads in R2 (or another durable object store) rather than KV-only TTL.

### Work Items

#### 1. Add explicit job lease/heartbeat fields to `mint_jobs`

New migration (next available number under `/functions/migrations/`):
- Add columns:
  - `worker_lease_id TEXT NULL`
  - `leased_until TEXT NULL`
  - `last_heartbeat_at TEXT NULL`
  - `attempt_started_at TEXT NULL`

Implementation changes:
- `/functions/api/mint/process.ts`
- `/workers/mint-cron/worker.ts`
- any job-poll/status endpoints

Behavior:
- A processor must acquire a lease before work.
- Processor heartbeats during long steps (IPFS upload, MintGarden call).
- Cron only retries jobs with expired leases.

#### 2. Persist richer failure state and retry scheduling

Files:
- `/functions/api/mint/process.ts`
- `/functions/api/mint/errors.ts`
- `/functions/api/mint/job.ts`

Implementation:
- Normalize retryable vs terminal errors (`RATE_LIMITED`, `UPSTREAM_TIMEOUT`, `IMAGE_MISSING`, etc.).
- Add `next_retry_at` and exponential backoff for retryable failures.
- Poll endpoint should surface retry state to UI (`retryScheduled`, `nextRetryAt`).

#### 3. Prevent image payload loss from causing unrecoverable failures

Short-term:
- On submit, store a compact pointer + hash metadata in D1 (already stores hash; extend with payload storage status).
- Extend KV TTL to cover realistic worst-case + retries (configurable).
- Add a cron preflight that refreshes TTL for active jobs.

Medium-term (recommended):
- Introduce R2 storage for job images and metadata payloads:
  - add bindings in `/wrangler.toml` and `/workers/mint-cron/wrangler.toml`
  - write payload once at submit
  - process reads from R2 by key
  - KV becomes optional hot cache only

#### 4. Add dead-letter/manual recovery tooling

Files:
- `/functions/api/admin/mint-errors.ts`
- add new admin endpoint `/functions/api/admin/mint-requeue.ts`

Implementation:
- Requeue only terminal-safe states after operator action.
- Record operator and reason in audit log.
- Prevent duplicate finalization.

#### 5. Add invariant checks and alerts

In admin/system health endpoint from Phase 0:
- count jobs stuck > 5m by step
- count jobs leased but no heartbeat
- count failed-after-payment awaiting refund/manual action

### Acceptance Criteria

- No job can be processed concurrently by two workers/processors (lease enforced).
- Cron only reclaims expired leases.
- Poll/status API exposes retry/lease progress metadata.
- Admin can requeue eligible failed jobs safely.
- `IMAGE_EXPIRED` incidents are reduced or eliminated in test runs / staging simulation.

---

## Phase 4: Chat Control-Plane Hardening (Contract + Config Drift)

### Objective

Ensure Cloudflare chat endpoints and Socket.IO server remain compatible through deploys, secret rotation, and variant changes.

### Key Problems in Current Repo

- Separate deployments (Pages vs chat server) share JWT secret and auth assumptions.
- `/functions/api/chat/presence.ts` expects a specific `/health` shape (`onlineUsers` object), but `/socket-server/src/index.ts` returns a different shape.
- `socket-server/package.json` default `start` points to `index-mvp.js`, creating deployment ambiguity.

### Work Items

#### 1. Define and enforce a versioned chat health contract

Files:
- `/socket-server/src/index.ts`
- `/socket-server/src/index-mvp.ts`
- `/functions/api/chat/presence.ts`
- new shared doc `/socket-server/CHAT_HEALTH_CONTRACT.md`

Contract (required response fields):
- `status`
- `service`
- `version`
- `contractVersion`
- `uptime`
- `rooms`
- `onlineUsers` object with room counts

Implementation:
- Both server variants return the same schema.
- Presence endpoint validates schema; if invalid, returns `serverStatus: "degraded"` (not silent zeros without metadata).

#### 2. Add startup config validation to chat server

Files:
- `/socket-server/src/index.ts`
- `/socket-server/src/index-mvp.ts`

Implementation:
- Fail fast on missing `CHAT_JWT_SECRET` or `MONGODB_URI` in production mode.
- Log resolved allowed origins and active server variant.
- Add `/config-hash` (admin-protected or disabled in prod) optional debug endpoint that returns hash of non-secret config to compare with Pages side.

#### 3. Add Pages-side chat config sanity checks

Files:
- `/functions/api/chat/token.ts`
- `/functions/api/chat/presence.ts`
- `/functions/api/admin/system-health.ts` (Phase 0)

Implementation:
- Validate `CHAT_JWT_SECRET` presence and warn if empty/short.
- Presence endpoint attaches `chatServerContractVersion` and schema validation result.
- Admin health includes a chat-connect synthetic check (token issuance optional in staging; health fetch in prod-safe mode).

#### 4. Clarify deployment and secret rotation process

Files:
- `/socket-server/README.md`
- `/README.md` or `/docs/deploy-chat.md`

Documentation must define:
- which entrypoint is production (`index.ts` vs `index-mvp.ts`)
- how `CHAT_JWT_SECRET` rotates atomically across Pages and chat server
- rollback steps

### Acceptance Criteria

- Both chat server variants expose the same `/health` schema.
- `chat/presence` no longer silently assumes a schema mismatch.
- Docs state a single production entrypoint and secret rotation order.
- Synthetic check catches JWT secret mismatch or chat server outage before users report it.

---

## Phase 5: Multi-Store Consistency and Freshness Discipline

### Objective

Reduce user-visible contradictions by formalizing data ownership, freshness, and reconciliation between D1, KV, Mongo, Parse, and client caches.

### Key Problems in Current Repo

- Multiple stores exist for different features and eras of the app.
- Client caches and proxies can hide staleness.
- There is no universal freshness contract across endpoints.

### Work Items

#### 1. Add freshness metadata to critical API responses

Files (minimum):
- `/functions/api/sales/stats.ts`
- `/functions/api/sales/history.ts`
- `/functions/api/trade-values.ts`
- `/functions/api/chat/presence.ts`
- `/functions/api/chat/token.ts` (eligibility verification source)

Return fields:
- `source`
- `fetchedAt`
- `stale`
- `staleReason` (optional)
- `lastSuccessfulSyncAt` (for worker-produced data)

#### 2. Build reconciliation checks (read-only first)

Add scripts or admin endpoints:
- `/scripts/check-sales-sync-health.mjs` or `/functions/api/admin/sales-reconcile.ts`
- `/functions/api/admin/mint-reconcile.ts` (D1 mint_jobs vs phase2_mints consistency checks)
- `/functions/api/admin/chat-health.ts` (Pages-to-chat service connectivity + schema)

Checks should produce:
- severity (`info`, `warn`, `error`)
- count and sample IDs
- recommended action

#### 3. Mark and isolate legacy Parse usage

Files:
- `/src/services/parseClient.ts`
- related callers discovered by ripgrep

Implementation:
- Add comments/docs indicating which features still depend on Parse.
- Where feasible, surface offline/error states clearly (do not silently fail to empty UI).
- Add a migration inventory checklist in docs (not necessarily migrate all data in this phase).

#### 4. Add schema/version visibility

Implementation:
- Expose app backend schema versions in admin health:
  - D1 migration watermark
  - worker version strings (manual constant is fine)
  - chat contract version

### Acceptance Criteria

- Critical endpoints return freshness/source metadata.
- At least two reconciliation checks exist and can run without mutating data.
- Parse-dependent features are documented and failure states are explicit.
- Admin health shows schema/contract versions.

---

## Implementation Sequence (Agent Checklist)

### Batch A (safe, no schema changes)

1. Phase 0 baseline observability
2. Phase 1 upstream fetch helper + chat eligibility outage semantics
3. Phase 4 chat health contract normalization

### Batch B (behavioral + performance)

1. Phase 2 rate-limit policy normalization
2. Phase 2 polling/write reductions
3. worker run-locks / overlap guards

### Batch C (schema changes and mint durability)

1. Add mint lease/heartbeat migration
2. Implement lease acquisition + cron reclamation
3. Retry scheduling metadata + admin requeue endpoint
4. Optional R2/Queue design spike (if infra access available)

### Batch D (consistency discipline)

1. Freshness metadata rollout to remaining critical endpoints
2. Reconciliation checks
3. Parse dependency inventory docs

---

## Required Tests

### Unit Tests

- `functions/lib/upstream.ts`
  - timeout
  - retry on 429/5xx
  - no retry on 4xx (except configured)
  - `Retry-After` parsing
- chat eligibility/token
  - fresh MintGarden success
  - stale cache fallback
  - no cache + upstream failure => `503`
  - whale vs holder fallback policy
- rate limit policy behavior in D1 unavailable cases
- chat presence health schema validation

### Integration / Endpoint Tests (can be Vitest or lightweight scripts)

- `/api/chat/presence` with valid health payload and schema mismatch payload
- `/api/sales/sync-status` includes freshness metadata
- mint submit -> process lease acquired -> heartbeat visible -> reclaim on expired lease (mock DB if needed)

### Manual Verification (staging)

- Disable MintGarden temporarily (mock failure) and confirm:
  - chat token returns retryable outage state, not false ineligibility
  - market endpoints degrade gracefully with stale markers
- Stop chat server / deploy wrong variant and confirm presence endpoint reports degraded contract
- Force mint `waitUntil` failure and confirm cron lease recovery

---

## Infra and Environment Changes (May Require Dashboard Access)

### Cloudflare Pages / Workers

- Add optional env flags:
  - `CHAT_ELIGIBILITY_STRICT`
  - `UPSTREAM_TIMEOUT_MS` (if centralizing)
  - `MINT_JOB_LEASE_MS`
- (Optional Phase 3 medium-term) Add R2 binding(s) for mint payloads
- (Optional Phase 3 medium-term) Add Cloudflare Queue for mint processing

### Chat Server (Fly/Railway/etc.)

- Ensure `CHAT_JWT_SECRET` matches Pages
- Choose and document a single production entrypoint
- Add health contract version constant to deploy artifact

---

## Rollout Plan and Guardrails

1. Ship Phase 0 + Phase 1 helpers behind no-op defaults.
2. Enable chat eligibility outage semantics first (low risk, high user impact reduction).
3. Normalize chat health contract before changing presence UX.
4. Roll out rate-limit policy logging before changing behaviors.
5. Deploy mint lease schema + code with backwards-compatible reads.
6. Only then enable lease enforcement and cron reclamation logic.

Rollback rule:
- If any phase causes user-visible auth/mint regressions, revert that phase only; do not revert the observability baseline.

---

## Definition of Done (Overall)

- Upstream outages produce explicit degraded states instead of false denials or silent zeros.
- D1 rate-limit behavior is intentional, documented, and observable.
- Mint jobs are lease-based and recoverable without silent limbo.
- Chat presence/token/server health contracts are versioned and aligned.
- Critical APIs expose source/freshness, and reconciliation checks exist for major domains.

---

## Suggested First PR (Smallest High-Value Slice)

If implementing this spec incrementally, start with:

1. `functions/lib/upstream.ts` (shared resilient fetch helper)
2. `functions/api/chat/token.ts` + `functions/api/chat/verify-eligibility.ts` (503 vs false 403 behavior)
3. `functions/api/chat/presence.ts` schema validation + degraded metadata
4. `socket-server/src/index.ts` and `socket-server/src/index-mvp.ts` health payload normalization
5. `functions/api/admin/system-health.ts` (minimal version)

This delivers the biggest resilience improvement with minimal schema risk.

