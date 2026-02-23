# Performance Baseline (2026-02-23)

Generated during Phase 5 final launch preparation.

## Bundle Metrics

### JavaScript Assets
- **Main entry bundle** (index-D2qwcvzr.js): 273.58 kB (raw) / **83.42 kB** (gzipped)
- **Vendor React** (vendor-react-DAZtKR1J.js): 310.00 kB (raw) / 94.22 kB (gzipped)
- **Vendor Wallet** (vendor-wallet-D1PXsfn8.js): 359.68 kB (raw) / 110.85 kB (gzipped)
- **Total JS shipped**: ~2.3 MB (raw) / ~800 kB (gzipped est.)
- **Status**: ✅ All per-asset bundles <406 kB hard limit (Phase 4 split complete)

### CSS Assets
- **Main CSS** (index-BUtUvGdC.css): 260.66 kB
- **Total CSS shipped**: ~935 kB
- **Status**: ✅ No critical issues

### Lazy-Load Chunks (Major)
| Chunk | Size (raw) | Size (gzipped) | Status |
|-------|-----------|---|---------|
| Generator-BtyRN7du.js | 173.61 kB | 42.29 kB | ✅ <406kB |
| html2canvas.esm-DXEQVQnt.js | 201.04 kB | 47.07 kB | ✅ <406kB |
| BigPulp-BwiXGj4X.js | 101.15 kB | 28.78 kB | ✅ <406kB |
| Account-BNoL-0NH.js | 87.69 kB | 27.49 kB | ✅ <406kB |
| CitrusDrop-BJjaUTl8.js | 96.89 kB | 31.37 kB | ✅ <406kB |

**Bundle Budget Status**: **✅ PASS** (0 hard breaches, 0 soft breaches)

---

## Page Load Metrics (Local 4G Simulation)

### Measured on 2026-02-23 @ 12:50 UTC
> Running Lighthouse audit on http://localhost:5174 (Vite dev server)

**Status**: Lighthouse audit in progress. Metrics will be finalized upon completion.

**Target Performance Goals**:
| Metric | Target | Status |
|--------|--------|--------|
| **FCP** (First Contentful Paint) | <2000ms | 🔄 Measuring |
| **LCP** (Largest Contentful Paint) | <3000ms | 🔄 Measuring |
| **TTI** (Time to Interactive) | <4000ms | 🔄 Measuring |
| **CLS** (Cumulative Layout Shift) | <0.1 | 🔄 Measuring |

*Note: Actual metrics from production CDN will be slightly better than local dev server due to:*
- *Vite dev server overhead vs. optimized production build*
- *Local network latency vs. CDN edge delivery*
- *Browser cache behavior differences*

---

## Game Interaction Performance

### Canvas Rendering
- **Game canvas load**: Target <500ms
- **First frame render**: Target <100ms
- **60 FPS sustained gameplay**: Target 100% (no drops during typical play)

### Button Click Response
- **Click-to-response**: Target <100ms
- **UI animation smoothness**: Target 60 FPS

### Wallet Connection
- **WalletConnect modal load**: Target <2000ms
- **Connection confirmation**: Target <1000ms

---

## Optimization Work Completed (Phase 1-4)

✅ **Wallet-Connect Split** (Phase 4)
- Reduced main bundle by splitting vendor-wallet into separate chunks
- Previously: ~600kB single chunk
- Now: Chunked as <406kB assets (protocol, core, ui, crypto, runtime)

✅ **Lazy-Load Game Features** (Phase 4)
- Generator feature: 173.61 kB (lazy-loaded on demand)
- Individual game modules: Lazy-loaded per route
- Estimated 17% bundle reduction vs. monolithic build

✅ **Code-Splitting & Tree-Shaking** (Phase 4)
- Vite build configured for optimal chunks
- Unused code eliminated via ESM tree-shaking
- CSS is minified and split by component

---

## Known Limitations / To Monitor

1. **Gzip Estimation**: Actual gzipped sizes may vary by 2-5% based on content compression
2. **CDN Delivery**: Performance will improve when deployed to Cloudflare CDN with edge caching
3. **Mobile Network**: LCP/TTI may degrade on slower 3G networks; test on actual devices
4. **Database Queries**: Worker tasks (did-indexer, credit-tracker) may impact API response times if not optimized

---

## How to Reproduce This Baseline

1. **Build project:**
   ```bash
   npm run build
   ```

2. **View bundle report:**
   ```bash
   npm run bundle:report
   # Output: reports/bundle-budget-latest.md
   ```

3. **Run Lighthouse locally:**
   ```bash
   npm run dev  # Start dev server on http://localhost:5174
   npx lighthouse http://localhost:5174 \
     --output=json \
     --output-path=reports/lighthouse-latest.json \
     --chrome-flags="--headless --disable-gpu --throttling-method=simulate"
   ```

4. **For production audit:**
   - Deploy to staging environment
   - Run Lighthouse against staging URL (will show realistic metrics with CDN)
   - Compare with this baseline

---

## Success Criteria (Phase 5 Launch)

- ✅ **Bundle budget**: All assets <406kB (measured)
- 🔄 **FCP**: <2000ms (measuring)
- 🔄 **LCP**: <3000ms (measuring)
- 🔄 **TTI**: <4000ms (measuring)
- 🔄 **CLS**: <0.1 (measuring)

Once Lighthouse completes, all metrics will be finalized and reported.

---

## Next Steps

1. Wait for Lighthouse audit to complete
2. Update metrics section with final results
3. If any metrics exceed targets → investigate + optimize
4. Commit final baseline to git
5. Move to Task 2: Launch Readiness Checklist
