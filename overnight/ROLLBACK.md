# Rollback Guide

## General rule

Revert one commit at a time, validate after each revert, and stop as soon as the undesired change is removed.

## `0e7bf0c` — Playwright baseline + prod guardrails

```bash
git revert 0e7bf0c
npm run test:unit
npm run build
```

Undoes:
- local-safe Playwright baseline
- production guardrails
- Vite `/api` proxy bypass for local-safe e2e
- manifest verifier env override support

Risk:
- reverting will likely reintroduce the original matcher collision and fresh-worktree build failure

## `02df9da` — BigPulp lazy loading

```bash
git revert 02df9da
npm run test:unit -- src/services/bigPulpV9Service.test.ts
npm run build
```

Undoes:
- lazy V9 loader
- BigPulp on-demand loading behavior

Risk:
- BigPulp route returns to eager 4.4MB dataset fetches

## `76574fb` — Shared metadata-lite path

```bash
git revert 76574fb
npm run test:unit -- src/services/wfpCollectionData.test.ts src/services/galleryService.test.ts src/services/salesApi.test.ts
npm run build
```

Undoes:
- `metadata-lite.json`
- shared lite metadata loader/cache
- consumer migrations off direct `metadata.json`

Risk:
- gallery/BigPulp/MemoryMatch helpers go back to heavier full-metadata reads

## `5c586aa` — WebP/preload pass

```bash
git revert 5c586aa
npm run build
PW_LOCAL_SAFE=1 npm test
```

Undoes:
- decorative WebP swaps
- image lazy-loading additions
- `preload="metadata"` video behavior

Risk:
- higher decorative image transfer and more eager media loading

## `2196cf4` — Performance baseline tooling

```bash
git revert 2196cf4
npm run build
```

Undoes:
- Lighthouse baseline tooling
- extended bundle report public-asset section
- added dev dependencies for local perf measurement

Risk:
- no runtime risk; only removes local measurement/reporting capability

## `5b1d1f3` — Lint noise cleanup + orphan tooling

```bash
git revert 5b1d1f3
npm run lint
```

Undoes:
- socket-server lint warning suppression
- manifest orphan reporting script

Risk:
- returns lint output to the earlier 43-warning state

## `aad9a75` — BigPulp lite takes payload + tab-scoped queries

```bash
git revert aad9a75
npm run test:unit -- src/services/wfpCollectionData.test.ts src/services/bigPulpV9Service.test.ts src/config/routes.test.ts
npm run build
```

Undoes:
- `nft_takes_lite.json`
- build-time generation of the BigPulp lite takes payload
- BigPulp lite-first dataset loading
- tab-scoped heavy BigPulp query activation

Risk:
- BigPulp route pressure increases again and the full takes payload becomes the only active source

## `5a7e4e8` — Explicit bundle chunk classification

```bash
git revert 5a7e4e8
npm run bundle:report -- --json-out=overnight/artifacts/bundle-report-latest.json --md-out=overnight/artifacts/bundle-report-latest.md
```

Undoes:
- explicit grouping for route/app/helper chunks in the bundle report
- zero-orphan classification improvement

Risk:
- no runtime impact; only reduces report clarity and returns orphaned JS noise

## `9727080` — Gallery preload pressure reduction

```bash
git revert 9727080
npm run test:unit -- src/services/wfpCollectionData.test.ts src/services/galleryService.test.ts src/config/routes.test.ts
PW_LOCAL_SAFE=1 npm test
npm run build
```

Undoes:
- reduced cross-character preload slices
- delayed gallery background preload kickoff
- smaller initial grid/action-image hover preload windows
- removal of the full remaining-collection background preload sweep

Risk:
- reverting restores the earlier aggressive gallery network behavior and the weaker `/gallery` Lighthouse profile

## Full nightly rollback

To remove the entire overnight branch delta relative to `main`:

```bash
git log --oneline main..HEAD
git revert 9727080 5a7e4e8 aad9a75 5b1d1f3 2196cf4 5c586aa 76574fb 02df9da 0e7bf0c
```

Validate afterward:

```bash
npx tsc --noEmit
npm run test:unit
npm run build
```
