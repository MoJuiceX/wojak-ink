# Farmers Plot R2 Cutover

Purpose: move the immutable Wojak Farmers Plot collection media to first-party Cloudflare R2 delivery without changing the frontend again later.

Current state:
- App resolver: `/api/farmers-plot/image/:edition`
- Current source: MintGarden thumbnail URLs plus two local fallback PNGs
- New optional override: `FARMERS_PLOT_MEDIA_BASE_URL`
- Mirror script: `npm run farmers-plot:r2:dry-run` and `npm run farmers-plot:r2:mirror`

Why this cutover is optional:
- The live breakage was not Farmers Plot anymore.
- Farmers Plot already resolves through a stable first-party app route.
- R2 is still worth doing because the collection is minted out and immutable, so a one-time mirror buys long-term control, cacheability, and lower dependence on third-party media hosting.

References:
- Cloudflare R2 public buckets/custom domains: [Public buckets](https://developers.cloudflare.com/r2/data-access/public-buckets/)
- Cloudflare R2 CLI uploads: [R2 CLI](https://developers.cloudflare.com/r2/get-started/cli/)
- Cloudflare Pages bindings/env changes: [Pages bindings](https://developers.cloudflare.com/pages/functions/bindings/)

## Target architecture

- Bucket: `wojak-farmers-plot-media`
- Public custom domain: `media.wojak.ink`
- Object prefix: `farmers-plot/`
- Final public URL pattern:
  - `https://media.wojak.ink/farmers-plot/0001.png`
  - `https://media.wojak.ink/farmers-plot/4200.png`
- Pages env var:
  - `FARMERS_PLOT_MEDIA_BASE_URL=https://media.wojak.ink/farmers-plot`

## Prerequisites

1. Cloudflare R2 enabled on the same account as `wojak.ink`
2. Wrangler authenticated with the correct Cloudflare account
3. Local source PNGs available for all 4,200 editions
4. `wojak.ink` zone already managed in Cloudflare

Recommended local source path:
- `~/Pictures/NFT_Collections/Wojak_NFT/Wojak PFPs/Wojak Farmers Plot final`

If your source path is different, set:

```bash
export FARMERS_PLOT_SOURCE_DIR="/absolute/path/to/Wojak Farmers Plot final"
```

## Order of operations

### 1. Create the R2 bucket

```bash
npx wrangler r2 bucket create wojak-farmers-plot-media
```

### 2. Connect the bucket to a custom domain

In Cloudflare Dashboard:
1. Go to `R2` -> your bucket -> `Settings`
2. Under `Custom Domains`, choose `Add`
3. Connect `media.wojak.ink`

Use a custom domain, not `r2.dev`, for production caching and control.

### 3. Export the mirror environment

```bash
export FARMERS_PLOT_R2_BUCKET="wojak-farmers-plot-media"
export FARMERS_PLOT_R2_PREFIX="farmers-plot"
export FARMERS_PLOT_SOURCE_DIR="$HOME/Pictures/NFT_Collections/Wojak_NFT/Wojak PFPs/Wojak Farmers Plot final"
```

### 4. Validate the upload set before writing

```bash
npm run farmers-plot:r2:dry-run
```

Expected result:
- dry-run output for editions `1` through `4200`
- no missing file errors

### 5. Upload the collection

```bash
npm run farmers-plot:r2:mirror
```

This uploads:
- `1.png` as `farmers-plot/0001.png`
- `42.png` as `farmers-plot/0042.png`
- `4200.png` as `farmers-plot/4200.png`

### 6. Spot-check the bucket

List a sample:

```bash
npx wrangler r2 object list wojak-farmers-plot-media --prefix farmers-plot/ | head
```

Check a direct public object:

```bash
curl -I https://media.wojak.ink/farmers-plot/0042.png
```

Expected:
- `200`
- image content type

### 7. Cut the app over to R2

In Cloudflare Pages project `wojak-ink`:
1. Go to `Settings` -> `Environment variables`
2. Add:

```text
FARMERS_PLOT_MEDIA_BASE_URL = https://media.wojak.ink/farmers-plot
```

Cloudflare’s Pages docs state bindings/env changes require a redeploy to take effect.

### 8. Redeploy

Use the normal production deploy path:
- push to `main`
- or trigger a deploy from Pages

### 9. Validate the cutover

App resolver should now redirect to R2:

```bash
curl -I https://wojak.ink/api/farmers-plot/image/42
```

Expected:
- `302`
- `Location: https://media.wojak.ink/farmers-plot/0042.png`

Then validate in browser:
1. Open `https://wojak.ink/gallery`
2. Open the Farmers Plot collection
3. In DevTools Network, confirm image requests come from `media.wojak.ink`

## Rollback

Rollback is simple because the app resolver already has a fallback source.

1. Remove or empty:

```text
FARMERS_PLOT_MEDIA_BASE_URL
```

2. Redeploy Pages

After redeploy, `/api/farmers-plot/image/:edition` will fall back to the manifest-backed MintGarden/local sources again.

## Success criteria

- `/api/farmers-plot/image/42` redirects to `media.wojak.ink`
- Gallery Farmers Plot cards load without image failures
- No reliance on MintGarden for Farmers Plot media delivery
- Rollback path remains one env-var change plus redeploy
