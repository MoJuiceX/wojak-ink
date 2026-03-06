# Before / After Metrics

## Baseline

| Metric | Baseline |
|---|---:|
| Node | `v25.4.0` |
| npm | `11.7.0` |
| Build status | Failed |
| Build time | `0.331s` |
| Lint status | Passed with `43` warnings |
| Lint time | `44.101s` |
| Typecheck status | Passed |
| Typecheck time | `0.799s` |
| Bundle report status | Failed (no `dist/assets`) |
| Bundle report time | `0.336s` |
| Playwright status | Failed |
| Playwright time | `2.603s` |
| Unit tests status | Passed |
| Unit tests | `149` files / `4254` tests |
| Unit test duration | `21.448s` shell |

### Baseline blockers

- Build failed because the fresh worktree did not contain the ignored local file `public/assets/wojak-layers/YourWojak-layers/manifest.json`
- Playwright failed immediately with `TypeError: Cannot redefine property: Symbol($$jest-matchers-object)`
- Playwright defaulted to `https://wojak.ink` and had a port mismatch (`5173` vs local Vite `5174`)
- Local Vite dev would proxy `/api` to production unless explicitly disabled

## Final state after overnight pass

| Metric | Final |
|---|---:|
| Build status | Passed |
| Build time | `5.63s` |
| Lint status | Passed with `0` ESLint warnings |
| Typecheck status | Passed |
| Bundle report status | Passed |
| Bundle report summary | `status=pass hard=0 soft=0 orphaned=81 public-assets>250kB=20` |
| Playwright status | Passed |
| Playwright suite | `6` local-safe tests |
| Unit tests status | Passed |
| Unit tests | `151` files / `4258` tests |
| Unit test duration | `12.02s` internal |
| Playwright default base URL | `http://127.0.0.1:5174` |
| Playwright prod guard | Enabled (`PW_ALLOW_PROD=1` required) |
| Local-safe `/api` proxy | Disabled when `PW_LOCAL_SAFE=1` |

## Payload / asset deltas

### Shared collection metadata

| Asset | Before | After | Delta |
|---|---:|---:|---:|
| `public/assets/nft-data/metadata.json` | `3692.89 KB` | unchanged | source retained |
| `public/assets/nft-data/metadata-lite.json` | not present | `1572.38 KB` | new lite index |
| Lite vs full metadata | `3692.89 KB` | `1572.38 KB` | `-2120.51 KB` (`-57.4%`) |

### BigPulp route behavior

| Item | Before | After |
|---|---|---|
| `big_pulp_v9_output.json` (`4446.78 KB`) | eagerly fetched on BigPulp mount | loaded only during user actions (`searchNFT`, `surpriseMe`) |
| BigPulp V9 loader | component-local/eager | shared lazy loader with in-memory cache |

### Decorative asset swaps

| Asset | Before | After | Delta |
|---|---:|---:|---:|
| `public/img/arcade-frame_fin` | `1236.0 KB` PNG | `374.7 KB` WebP | `-861.4 KB` (`-69.7%`) |
| `alien-wojak` preview | `95.4 KB` PNG | `54.4 KB` WebP | `-41.0 KB` (`-42.9%`) |
| `wojak` preview | `183.4 KB` PNG | `64.7 KB` WebP | `-118.7 KB` (`-64.7%`) |
| `bepe-baddie` preview | `79.0 KB` PNG | `93.1 KB` WebP | rejected (WebP was larger) |

### Video preload behavior

| Component | Before | After |
|---|---|---|
| `FloatingVideoPlayer` | `preload="auto"` | `preload="metadata"` |
| `GlobalVideoPlayer` | `preload="auto"` | `preload="metadata"` |

## Lighthouse baseline (new)

The project had no repeatable Lighthouse artifact before this pass. These scores are the new local desktop baseline from `overnight/artifacts/lighthouse/summary.md`.

| Route | Perf | A11y | Best | SEO | FCP (ms) | LCP (ms) | TBT (ms) | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | `63` | `91` | `100` | `100` | `3693` | `16919` | `203` | `0.000` |
| `/gallery` | `68` | `91` | `100` | `100` | `2855` | `15994` | `164` | `0.000` |
| `/generator` | `80` | `91` | `100` | `100` | `2854` | `4333` | `104` | `0.001` |

## Current top chunks and assets

### Largest JS chunks

1. `vendor-wallet-D1PXsfn8.js` — `351.25 KB`
2. `vendor-react-CD3mQ61R.js` — `302.72 KB`
3. `index-Dwu1QzJp.js` — `269.54 KB`
4. `wallet-connect-standalone-wallet-protocol-C4VxITVL.js` — `246.43 KB`
5. `wallet-connect-standalone-wallet-core-BAVQEmi7.js` — `199.20 KB`

### Largest public assets surfaced by the improved report

1. `public/assets/videos/wiznerd-music.mov` — `12664.79 KB`
2. `public/assets/BigPulp/bigPv9/big_pulp_v9_output.json` — `4446.78 KB`
3. `public/assets/videos/multi-billion-dao.mp4` — `3782.69 KB`
4. `public/assets/BigPulp/big_pulp_v3_output.json` — `3718.66 KB`
5. `public/assets/nft-data/metadata.json` — `3692.89 KB`

## Noise reduction

| Signal | Before | After |
|---|---:|---:|
| ESLint warnings | `43` | `0` |
| Bundle hard breaches | n/a | `0` |
| Bundle soft breaches | n/a | `0` |
| Orphaned JS visibility | none | explicit report (`81` current) |
| Lighthouse artifacts | none | JSON + HTML + markdown summary |
