# Overnight Report

## Scope

- Worktree: `/Users/abit_hex/wojak-ink-nightshift-2026-03-06`
- Branch: `codex/nightly/2026-03-06-overnight`
- Base commit: `1603933` (`main` at start of run)
- Safety tag on main before work: `safe/2026-03-06-pre-overnight`
- Guardrails respected:
  - no deploys
  - no secret changes
  - no live wallet/mint execution
  - isolated worktree only

## Running Log

1. Captured a full baseline into `overnight/artifacts/baseline/`.
2. Fixed the broken Playwright baseline and added local-only/prod-blocking guardrails.
3. Removed the biggest eager BigPulp client fetch.
4. Reduced shared metadata pressure by introducing `metadata-lite.json` and migrating the highest-volume consumers.
5. Swapped low-risk decorative assets to existing WebP files and reduced eager video preload behavior.
6. Added a local Lighthouse baseline and improved bundle reporting with top public-asset visibility.
7. Reduced lint warning noise for `socket-server` and added manifest-orphan cleanup tooling.
8. Continued the pass with BigPulp rarity payload trimming and explicit chunk classification in the bundle report.
9. Re-ran the full validation set and refreshed the morning review package.
10. Reduced gallery preload pressure and re-measured `/gallery` with a dedicated Lighthouse run.

## Phase Results

### Phase 0 — Baseline snapshot

Artifacts:
- `overnight/artifacts/baseline/node-version.log`
- `overnight/artifacts/baseline/npm-version.log`
- `overnight/artifacts/baseline/git-status.log`
- `overnight/artifacts/baseline/build.log`
- `overnight/artifacts/baseline/lint.log`
- `overnight/artifacts/baseline/typecheck.log`
- `overnight/artifacts/baseline/bundle-report.log`
- `overnight/artifacts/baseline/npm-test.log`
- `overnight/artifacts/baseline/unit-test.log`

Baseline summary:
- `node -v`: `v25.4.0`
- `npm -v`: `11.7.0`
- `npm run build`: failed in a fresh worktree because the ignored local file `public/assets/wojak-layers/YourWojak-layers/manifest.json` was absent
- `npm run lint`: passed with `43` warnings, almost entirely `socket-server` `console.*`
- `npx tsc --noEmit`: passed
- `npm run bundle:report`: failed because `dist/assets` did not exist after the failed build
- `npm test`: failed with `TypeError: Cannot redefine property: Symbol($$jest-matchers-object)`
- `npm run test:unit`: passed (`149` files, `4254` tests)

### Phase 1 — Playwright baseline + prod guardrails

Commit:
- `0e7bf0c` — `test: fix playwright baseline + prod guardrails`

What changed:
- Playwright default run now targets local-safe specs only: `tests/local/**/*.spec.ts`
- Worker/Vitest tests are no longer collected by Playwright
- Default Playwright base URL is now `http://127.0.0.1:5174`
- Added a hard production guard: `wojak.ink` is blocked unless `PW_ALLOW_PROD=1`
- Added `playwright.full.config.ts` for broader/manual runs
- Added `test:e2e:local` and `test:e2e:full` scripts
- Disabled the Vite `/api` production proxy during local-safe Playwright runs with `PW_LOCAL_SAFE=1`
- Added local-safe smoke coverage for `/gallery` and `/generator`
- Taught the manifest verifier to honor `VITE_LAYER_BASE_URL` from `.env.local` / `.env`
- Updated the generator asset-path unit test to allow either local assets or a remote layer host

Validation:
- `npm test` => passed (`6` tests)
- `npm run test:unit` => passed
- `npm run build` => passed
- `npm run bundle:report` => passed

### Phase 2 — BigPulp lazy loading

Commit:
- `02df9da` — `perf: lazy-load BigPulp datasets`

What changed:
- Removed eager mount-time fetch of `public/assets/BigPulp/bigPv9/big_pulp_v9_output.json` (`4446.78 KB`)
- Added a shared lazy loader service for the BigPulp V9 dataset
- `BigPulpContext` now loads V9 data only during actual user actions (`searchNFT`, `surpriseMe`)
- Parallelized V9 entry loading with existing BigPulp analysis fetches

Validation:
- `npm run test:unit -- src/services/bigPulpV9Service.test.ts` => passed
- `npm run build` => passed

### Phase 3 — Shared metadata footprint reduction

Commit:
- `76574fb` — `perf: reduce gallery metadata load footprint`

What changed:
- Added `public/assets/nft-data/metadata-lite.json`
- Added generator script: `scripts/generate-metadata-lite.mjs`
- Added shared cached loaders in `src/services/wfpCollectionData.ts`
- Migrated the highest-volume read-only consumers away from direct `metadata.json` fetches:
  - gallery service
  - gallery preloader
  - sales API helpers
  - trade values service
  - BigPulp service
  - Memory Match page/game
  - BigPulp Ask tab
- Kept full metadata available for deeper detail use cases
- Switched AskTab rank lookups to `rarity.json` instead of assuming `open_rarity_rank` exists in metadata

Concrete footprint change:
- `metadata.json`: `3692.89 KB`
- `metadata-lite.json`: `1572.38 KB`
- size reduction for lite representation: `2120.51 KB` (`57.4%` smaller on disk)

Validation:
- `npm run generate:metadata-lite` => passed
- `npm run test:unit -- src/services/wfpCollectionData.test.ts src/services/galleryService.test.ts src/services/salesApi.test.ts` => passed
- `npm run test:unit` => passed (`151` files, `4258` tests)
- `npm run build` => passed

### Phase 4 — Low-risk asset/preload optimization

Commit:
- `5c586aa` — `perf: use existing webp assets where available`

What changed:
- Swapped `ArcadeFrame` from `arcade-frame_fin.png` to the existing `arcade-frame_fin.webp`
- Swapped decorative landing/gallery-preview pools to existing WebP variants where the WebP was actually smaller
- Preserved `bepe-baddie.png` because its WebP variant was larger
- Added `loading="lazy"` and `decoding="async"` to below-the-fold preview/floating images where safe
- Changed persistent video players from `preload="auto"` to `preload="metadata"`

Measured asset deltas:
- `public/img/arcade-frame_fin.png` `1236.0 KB` -> `public/img/arcade-frame_fin.webp` `374.7 KB` (`-861.4 KB`, `-69.7%`)
- `public/assets/gallery-previews/alien-wojak.png` `95.4 KB` -> `.webp` `54.4 KB` (`-41.0 KB`, `-42.9%`)
- `public/assets/gallery-previews/wojak.png` `183.4 KB` -> `.webp` `64.7 KB` (`-118.7 KB`, `-64.7%`)
- `bepe-baddie.webp` was larger than its PNG (`+14.1 KB`), so that swap was intentionally rejected

Validation:
- `npm run build` => passed
- `PW_LOCAL_SAFE=1 npm test` => passed (`6` tests)

### Phase 5 — Performance baseline reporting

Commit:
- `2196cf4` — `chore: add performance baseline reporting`

What changed:
- Added local Lighthouse baseline runner: `scripts/run-lighthouse-baseline.mjs`
- Added `npm run perf:lighthouse`
- Extended `scripts/bundle-budget-report.mjs` to include top public assets over a configurable threshold
- Installed local-only tooling dependencies: `lighthouse`, `chrome-launcher`

Artifacts:
- `overnight/artifacts/lighthouse/summary.md`
- `overnight/artifacts/lighthouse/*.html`
- `overnight/artifacts/lighthouse/*.json`
- `overnight/artifacts/bundle-report-latest.json`
- `overnight/artifacts/bundle-report-latest.md`

Lighthouse summary (desktop preset, local preview):
- `/` => Perf `79`, A11y `91`, Best `100`, SEO `100`
- `/gallery` => Perf `68`, A11y `91`, Best `100`, SEO `100`
- `/generator` => Perf `81`, A11y `91`, Best `100`, SEO `100`
- `/bigpulp` => Perf `76`, A11y `91`, Best `100`, SEO `100`

Bundle report summary:
- Status: `pass`
- Hard breaches: `0`
- Soft breaches: `0`
- Orphaned JS files: `0`
- Orphaned JS files breaching hard limit: `0`
- Public assets over `250 KB`: `20`

Largest public assets now surfaced explicitly:
- `public/assets/videos/wiznerd-music.mov` — `12664.79 KB`
- `public/assets/BigPulp/bigPv9/big_pulp_v9_output.json` — `4446.78 KB`
- `public/assets/videos/multi-billion-dao.mp4` — `3782.69 KB`
- `public/assets/BigPulp/big_pulp_v3_output.json` — `3718.66 KB`
- `public/assets/nft-data/metadata.json` — `3692.89 KB`

### Phase 6 — Warning-noise cleanup + orphan tooling

Commit:
- `5b1d1f3` — `chore: reduce socket-server lint warning noise`

What changed:
- Extended ESLint `no-console` exemption to `socket-server/**/*`
- Added `scripts/report-manifest-orphans.mjs`
- Added `npm run manifest:orphans`
- The orphan tool is dry-run by default and supports a real delete mode via `--delete`
- The orphan tool honors `VITE_LAYER_BASE_URL`, matching the manifest verifier behavior in remote-layer setups

Validation:
- `npm run lint` => warning count reduced from `43` to `0` ESLint warnings
- Remaining lint-time noise is the Babel deopt note on the generated `functions/_data/farmersPlotImageManifest.ts`
- `npm run manifest:orphans -- --json-out=overnight/artifacts/manifest-orphans.json --text-out=overnight/artifacts/manifest-orphans.txt` => safely skipped in this worktree because assets are served from `https://layers.wojak.ink`

### Phase 7 — BigPulp payload trimming + bundle classification follow-up

Commits:
- `aad9a75` — `perf: trim BigPulp rarity payloads`
- `5a7e4e8` — `chore: classify bundle chunks explicitly`

What changed:
- Added `scripts/generate-bigpulp-takes-lite.mjs`
- Added generated `public/assets/BigPulp/nft_takes_lite.json`
- Updated `build` to regenerate the BigPulp lite takes payload automatically
- Updated `src/services/bigpulpService.ts` to load `nft_takes_lite.json` first and fall back to `nft_takes_v2.json`
- Changed BigPulp tab queries so large secondary datasets only load when the relevant tab is active:
  - market tab => heatmap + price distribution
  - ask tab => top sales + rarest finds
  - attributes tab => attribute stats
- Expanded bundle report group classification so route/app/helper chunks are explicitly categorized instead of surfacing as generic orphaned JS entries

Concrete footprint change:
- `nft_takes_v2.json`: `2748.26 KB`
- `nft_takes_lite.json`: `206.62 KB`
- size reduction for the lite takes payload: `2541.64 KB` (`92.5%` smaller on disk)

Validation:
- `npm run generate:bigpulp-takes-lite` => passed
- `npm run test:unit -- src/services/wfpCollectionData.test.ts src/services/bigPulpV9Service.test.ts src/config/routes.test.ts` => passed (`41` tests)
- `npm run lint` => passed
- `npm run test:unit` => passed (`151` files, `4258` tests)
- `PW_LOCAL_SAFE=1 npm test` => passed (`6` tests)
- `npm run build` => passed
- `npm run bundle:report -- --json-out=overnight/artifacts/bundle-report-latest.json --md-out=overnight/artifacts/bundle-report-latest.md` => passed with zero orphaned JS files
- `npm run perf:lighthouse -- --out-dir=overnight/artifacts/lighthouse --route=/ --route=/gallery --route=/generator --route=/bigpulp` => passed

### Phase 8 — Gallery preload pressure reduction

Commit:
- `9727080` — `perf: trim gallery preload pressure`

What changed:
- Reduced cross-character background preload slices from `50/150/300` to `12/24/48`
- Delayed the cross-character preload kickoff by `500ms` so initial gallery render settles first
- Reduced immediate grid-critical preload from `50` images to `24`
- Reduced sort/filter action-image preload slices from `100` per combination to `24`
- Removed the background “preload all remaining NFTs” sweep
- Reduced character-hover preload from `50` to `24`

Artifacts:
- `overnight/artifacts/lighthouse-gallery-tuned/summary.md`
- `overnight/artifacts/lighthouse-gallery-tuned/gallery.html`
- `overnight/artifacts/lighthouse-gallery-tuned/gallery.json`

Measured result:
- `/gallery` Lighthouse performance improved from `68` to `82`
- LCP improved from `15991 ms` to `3913 ms`
- TBT improved from `157 ms` to `109 ms`

Validation:
- `npm run test:unit -- src/services/wfpCollectionData.test.ts src/services/galleryService.test.ts src/config/routes.test.ts` => passed (`70` tests)
- `PW_LOCAL_SAFE=1 npm test` => passed (`6` tests)
- `npm run build` => passed (`built in 5.51s`)
- `npm run test:unit` => passed (`151` files, `4258` tests)
- `npm run bundle:report -- --json-out=overnight/artifacts/bundle-report-latest.json --md-out=overnight/artifacts/bundle-report-latest.md` => passed
- `npm run perf:lighthouse -- --out-dir=overnight/artifacts/lighthouse-gallery-tuned --route=/gallery` => passed

## Final Validation State

Artifacts:
- `overnight/artifacts/typecheck-final.log`
- `overnight/artifacts/unit-final.log`
- `overnight/artifacts/build-final.log`
- `overnight/artifacts/lint-after-noise-cleanup.log`
- `overnight/artifacts/bundle-report-latest.*`
- `overnight/artifacts/lighthouse/*`
- `overnight/artifacts/lighthouse-gallery-tuned/*`

Final checks:
- `git status --short --branch` => nightly branch plus `overnight/` artifacts/docs only before final packaging commit
- `npx tsc --noEmit` => passed
- `npm run test:unit` => passed (`151` files, `4258` tests)
- `npm run build` => passed (`built in 5.51s`)
- `npm run lint` => passed with no ESLint warnings
- `PW_LOCAL_SAFE=1 npm test` => passed (`6` tests)

## Remaining Risks / Deferred Work

Not touched overnight because the risk/effort was not justified:
- generator source-layer re-encoding (`public/assets/wojak-layers/**`) — this can affect rendered/minted art output and needs pixel-level validation
- wallet manual chunk warning between `wallet-protocol -> wallet-core -> wallet-protocol` — worth a separate focused pass, but not a safe overnight quick fix
- upstream Rollup PURE annotation warning from `node_modules/ox/_esm/core/Base64.js` — library-level noise, not repo logic
- Babel deopt note on `functions/_data/farmersPlotImageManifest.ts` — expected from the generated file size; fixing it would require structural data changes, not a superficial tweak

## Morning Recommendations

Highest-value follow-up items from the new baseline:
1. Replace or stream the heaviest local video/audio assets surfaced by the new public-asset report
2. Split or server-side index the remaining BigPulp JSON payloads (`big_pulp_v3_output.json` and any consumers that still need `nft_takes_v2.json` fallback data)
3. Revisit the wallet manual chunk cycle with a dedicated, isolated bundle-graph pass
4. Decide whether `metadata-lite.json` should become the default collection index for any remaining read-only consumers still leaning on full metadata

## Morning Checklist

- [x] Baseline artifacts captured
- [x] Playwright local-safe baseline fixed
- [x] Playwright production guardrails added
- [x] BigPulp eager V9 fetch removed
- [x] Shared metadata-lite loader added and migrated to key consumers
- [x] Low-risk WebP/preload pass completed
- [x] Local Lighthouse baseline added and run
- [x] Bundle report improved with top public-asset visibility
- [x] Socket-server lint noise removed
- [x] BigPulp lite takes payload added and wired
- [x] Bundle report orphan classifications reduced to zero
- [x] Gallery preload pressure reduced and re-measured
- [x] Morning review package refreshed to final state
