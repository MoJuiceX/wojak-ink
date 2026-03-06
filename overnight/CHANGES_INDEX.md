# Changes Index

## Commit `0e7bf0c` — `test: fix playwright baseline + prod guardrails`

### What changed
- isolated the default Playwright run to `tests/local/**/*.spec.ts`
- added `playwright.full.config.ts` for broader/manual suites
- defaulted Playwright to `http://127.0.0.1:5174`
- added a production guard requiring `PW_ALLOW_PROD=1`
- disabled the Vite production `/api` proxy during local-safe Playwright runs
- added local-safe smoke tests for `/gallery` and `/generator`
- taught the manifest verifier to honor `VITE_LAYER_BASE_URL`
- relaxed the generator asset-path test to allow local or remote layer hosts

### Files touched
- `package.json`
- `playwright.config.ts`
- `playwright.full.config.ts`
- `vite.config.ts`
- `scripts/verify-manifest-assets.mjs`
- `tests/local/app-shell.spec.ts`
- `src/services/generatorService.test.ts`

### Validate
```bash
npm test
npm run test:unit
npm run build
npm run bundle:report
```

## Commit `02df9da` — `perf: lazy-load BigPulp datasets`

### What changed
- removed eager mount-time fetch of the BigPulp V9 dataset
- added shared lazy V9 loader + cache
- load V9 only during `searchNFT` / `surpriseMe`
- parallelized V9 load with existing search analysis

### Files touched
- `src/services/bigPulpV9Service.ts`
- `src/services/bigPulpV9Service.test.ts`
- `src/contexts/BigPulpContext.tsx`

### Validate
```bash
npm run test:unit -- src/services/bigPulpV9Service.test.ts
npm run build
```

## Commit `76574fb` — `perf: reduce gallery metadata load footprint`

### What changed
- added generated `metadata-lite.json`
- added shared collection-data loader/cache service
- migrated the highest-volume metadata consumers to the lite/indexed path
- switched BigPulp AskTab rank lookups to `rarity.json`
- updated build to regenerate metadata-lite automatically

### Files touched
- `package.json`
- `public/assets/nft-data/metadata-lite.json`
- `scripts/generate-metadata-lite.mjs`
- `src/services/wfpCollectionData.ts`
- `src/services/wfpCollectionData.test.ts`
- `src/services/galleryService.ts`
- `src/services/galleryPreloader.ts`
- `src/services/salesApi.ts`
- `src/services/tradeValuesService.ts`
- `src/services/bigpulpService.ts`
- `src/games/MemoryMatch/index.tsx`
- `src/pages/MemoryMatch.tsx`
- `src/components/bigpulp/AskTab.tsx`

### Validate
```bash
npm run generate:metadata-lite
npm run test:unit -- src/services/wfpCollectionData.test.ts src/services/galleryService.test.ts src/services/salesApi.test.ts
npm run test:unit
npm run build
```

## Commit `5c586aa` — `perf: use existing webp assets where available`

### What changed
- swapped `ArcadeFrame` to the existing WebP frame asset
- switched decorative landing/gallery preview pools to smaller existing WebP files
- kept `bepe-baddie.png` because its WebP variant was larger
- added `loading="lazy"` / `decoding="async"` to safe below-the-fold preview images
- reduced persistent video preload from `auto` to `metadata`

### Files touched
- `src/components/ArcadeFrame.tsx`
- `src/components/landing/CollectionPreview.tsx`
- `src/components/landing/FinalCTA.tsx`
- `src/components/landing/FloatingNFTs.tsx`
- `src/components/landing/SectionFloatingNFTs.tsx`
- `src/components/media/video/FloatingVideoPlayer.tsx`
- `src/components/media/video/GlobalVideoPlayer.tsx`

### Validate
```bash
npm run build
PW_LOCAL_SAFE=1 npm test
```

## Commit `2196cf4` — `chore: add performance baseline reporting`

### What changed
- added `npm run perf:lighthouse`
- added `scripts/run-lighthouse-baseline.mjs`
- extended bundle reporting with top public assets over threshold
- added local-only performance tooling dependencies (`lighthouse`, `chrome-launcher`)

### Files touched
- `package.json`
- `package-lock.json`
- `scripts/run-lighthouse-baseline.mjs`
- `scripts/bundle-budget-report.mjs`

### Validate
```bash
npm run bundle:report -- --json-out=overnight/artifacts/bundle-report-latest.json --md-out=overnight/artifacts/bundle-report-latest.md
npm run perf:lighthouse -- --out-dir=overnight/artifacts/lighthouse
```

## Commit `5b1d1f3` — `chore: reduce socket-server lint warning noise`

### What changed
- extended the `no-console` exemption to `socket-server/**/*`
- added dry-run manifest orphan reporting / optional cleanup tooling
- added `npm run manifest:orphans`
- matched the orphan tool behavior to the remote-layer `VITE_LAYER_BASE_URL` skip logic

### Files touched
- `eslint.config.js`
- `package.json`
- `scripts/report-manifest-orphans.mjs`

### Validate
```bash
npm run lint
npm run manifest:orphans -- --json-out=overnight/artifacts/manifest-orphans.json --text-out=overnight/artifacts/manifest-orphans.txt
```

## Commit `aad9a75` — `perf: trim BigPulp rarity payloads`

### What changed
- added a generated BigPulp lite takes dataset (`nft_takes_lite.json`)
- updated the build to regenerate the lite takes dataset automatically
- moved BigPulp dataset loading to lite-first with full-payload fallback
- changed BigPulp tab queries so heavy secondary data is fetched only when the relevant tab is active

### Files touched
- `package.json`
- `scripts/generate-bigpulp-takes-lite.mjs`
- `public/assets/BigPulp/nft_takes_lite.json`
- `src/services/bigpulpService.ts`
- `src/hooks/data/useBigPulpData.ts`
- `src/contexts/BigPulpContext.tsx`

### Validate
```bash
npm run generate:bigpulp-takes-lite
npm run test:unit -- src/services/wfpCollectionData.test.ts src/services/bigPulpV9Service.test.ts src/config/routes.test.ts
npm run build
```

## Commit `5a7e4e8` — `chore: classify bundle chunks explicitly`

### What changed
- expanded bundle report grouping so route/app/helper chunks are explicitly classified
- reduced bundle report orphaned JS output from `81` to `0`
- kept the existing hard/soft budget checks intact while improving report readability

### Files touched
- `scripts/bundle-budget-report.mjs`

### Validate
```bash
npm run bundle:report -- --json-out=overnight/artifacts/bundle-report-latest.json --md-out=overnight/artifacts/bundle-report-latest.md
```

## Commit `9727080` — `perf: trim gallery preload pressure`

### What changed
- reduced the cross-character background preload slices from `50/150/300` to `12/24/48`
- delayed the cross-character preload kickoff so initial gallery render settles first
- reduced immediate grid-critical preload from `50` images to `24`
- reduced sort/filter preload slices from `100` per combination to `24`
- removed the full remaining-collection low-priority preload sweep
- reduced character-hover preload from `50` to `24`

### Files touched
- `src/pages/Gallery.tsx`

### Validate
```bash
npm run test:unit -- src/services/wfpCollectionData.test.ts src/services/galleryService.test.ts src/config/routes.test.ts
PW_LOCAL_SAFE=1 npm test
npm run build
npm run test:unit
npm run bundle:report -- --json-out=overnight/artifacts/bundle-report-latest.json --md-out=overnight/artifacts/bundle-report-latest.md
npm run perf:lighthouse -- --out-dir=overnight/artifacts/lighthouse-gallery-tuned --route=/gallery
```

## Commit `d099d2b` — `perf: reduce music preload buffering`

### What changed
- added `src/utils/audioElement.ts` and `createManagedAudio()` for long-form HTML audio
- switched long-form game music constructors to `preload="metadata"` via the shared helper
- left short SFX / Howler pools untouched to avoid latency regressions

### Files touched
- `src/utils/audioElement.ts`
- `src/utils/audioElement.test.ts`
- `src/pages/BrickByBrick.tsx`
- `src/pages/MemoryMatch.tsx`
- `src/pages/FlappyOrange.tsx`
- `src/pages/WojakRunner.tsx`
- `src/pages/BlockPuzzle.tsx`
- `src/pages/ColorReaction.tsx`
- `src/components/media/games/GameModal.tsx`
- `src/contexts/AudioContext.tsx`

### Validate
```bash
npm run test:unit
npm run lint
npm run build
```

## Commit `86068cb` — `chore: reduce unit test noise`

### What changed
- added `src/utils/browserStorage.ts` and hardened module-init localStorage access in market/treasury services
- added `src/tests/muteConsole.ts` for targeted expected-error-path muting in tests
- updated sales/treasury/market and selected failure-path tests so the full unit suite no longer emits repo-generated `stderr |` noise

### Files touched
- `src/utils/browserStorage.ts`
- `src/tests/muteConsole.ts`
- `src/services/marketApi.ts`
- `src/services/treasuryApi.ts`
- `src/services/salesApi.test.ts`
- `src/services/heatmapCache.test.ts`
- `src/utils/settingsUtils.test.ts`
- `src/services/historicalPriceService.test.ts`
- `src/services/badgeService.test.ts`
- `src/games/Wordle/stats.test.ts`
- `functions/api/mint/process.test.ts`
- `functions/api/mint/cleanup.test.ts`
- `functions/api/mint/request.test.ts`

### Validate
```bash
npm run test:unit
npm run lint
npm run build
rg -n '^stderr \|' overnight/artifacts/unit-noise-after-fixes.log
```

## Commit `717ccb8` — `perf: remux wiznerd video for web playback`

### What changed
- added `public/assets/videos/wiznerd-music.mp4` via a `faststart` MP4 remux of the existing MOV source
- switched runtime references from `.mov` to `.mp4` in the local video playlists
- kept the original MOV in place for rollback and source preservation

### Files touched
- `public/assets/videos/wiznerd-music.mp4`
- `src/contexts/VideoPlayerContext.tsx`
- `src/utils/mockMediaData.ts`

### Validate
```bash
npm run build
rg -n "wiznerd-music\\.(mov|mp4)" src public
```

## Commit `1ba7cc0` — `chore: ignore generated farmers plot manifest in lint`

### What changed
- excluded the generated `functions/_data/farmersPlotImageManifest.ts` file from ESLint
- removed the final repo-controlled lint-time deopt noise from the nightly run

### Files touched
- `eslint.config.js`

### Validate
```bash
npm run lint > overnight/artifacts/lint-final-clean.log 2>&1
cat overnight/artifacts/lint-final-clean.log
```

## Commit `e1bee59` — `test: clean playwright runner env`

### What changed
- added `scripts/run-playwright-clean.mjs`
- routed all Playwright npm scripts through the wrapper
- stripped `FORCE_COLOR` and `NO_COLOR` from the final Playwright child-process env so the local-safe suite runs without color-policy warnings

### Files touched
- `scripts/run-playwright-clean.mjs`
- `package.json`

### Validate
```bash
npm test > overnight/artifacts/playwright-color-clean.log 2>&1
rg -n 'NO_COLOR|FORCE_COLOR|Warning:' overnight/artifacts/playwright-color-clean.log
```

## Final validation set

```bash
npx tsc --noEmit
npm run test:unit
npm run build
npm run lint
PW_LOCAL_SAFE=1 npm test
npm run bundle:report -- --json-out=overnight/artifacts/bundle-report-latest.json --md-out=overnight/artifacts/bundle-report-latest.md
npm run perf:lighthouse -- --out-dir=overnight/artifacts/lighthouse --route=/ --route=/gallery --route=/generator --route=/bigpulp
npm run perf:lighthouse -- --out-dir=overnight/artifacts/lighthouse-gallery-tuned --route=/gallery
npm run test:unit > overnight/artifacts/unit-noise-after-fixes.log 2>&1
rg -n '^stderr \|' overnight/artifacts/unit-noise-after-fixes.log
npm run build > overnight/artifacts/build-after-wiznerd-remux.log 2>&1
npm run lint > overnight/artifacts/lint-final-clean.log 2>&1
npm test > overnight/artifacts/playwright-color-clean.log 2>&1
```
