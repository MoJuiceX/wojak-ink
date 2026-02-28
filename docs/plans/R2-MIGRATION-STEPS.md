# R2 Migration — Step-by-Step Deployment Guide

Complete checklist to move layer assets from git to Cloudflare R2.
Check off each step as you go. Every step has a verification.

---

## Prerequisites

- [ ] Cloudflare account with `wojak.ink` domain active
- [ ] R2 enabled on the account (Dashboard > R2 — click "Get started" if first time)
- [ ] `rclone` installed locally (`brew install rclone`)

---

## Phase 1: Create R2 Bucket

### Step 1.1 — Create the bucket

1. Go to **Cloudflare Dashboard > R2 > Overview**
2. Click **Create bucket**
3. Name: `wojak-layers`
4. Location: **Automatic** (or pick the region closest to your users)
5. Click **Create bucket**

**Verify:** You see `wojak-layers` in your R2 bucket list.

---

### Step 1.2 — Connect custom domain

1. Click into the `wojak-layers` bucket
2. Go to **Settings** tab
3. Scroll to **Custom Domains**
4. Click **Connect Domain**
5. Enter: `layers.wojak.ink`
6. Click **Continue** — Cloudflare auto-creates a CNAME record
7. Wait for status to show **Active** (usually under 2 minutes)

**Verify:** Open `https://layers.wojak.ink` in your browser. You should get a Cloudflare error page (bucket is empty) — that's correct. The domain is working.

---

### Step 1.3 — Disable the r2.dev subdomain

1. Still in bucket **Settings**
2. Find **R2.dev subdomain** section
3. Click **Disable** (or ensure it says "Not allowed")

**Why:** Prevents anyone from accessing your bucket through the default `*.r2.dev` URL, which would bypass your CORS and caching rules.

**Verify:** The r2.dev toggle shows "Not allowed" or "Disabled".

---

### Step 1.4 — Add CORS policy

1. Still in bucket **Settings**
2. Scroll to **CORS Policy**
3. Click **Edit CORS Policy** (or **Add CORS policy**)
4. Paste this JSON and save:

```json
[
  {
    "AllowedOrigins": [
      "https://wojak.ink",
      "https://www.wojak.ink",
      "http://localhost:5173"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length"],
    "MaxAgeSeconds": 86400
  }
]
```

**Verify:** The CORS policy shows 3 allowed origins after saving.

---

## Phase 2: Add Transform Rules

These are Cloudflare-level rules on the `wojak.ink` zone (not R2-specific).

### Step 2.1 — Vary: Origin header (CRITICAL)

This prevents Chrome from caching a non-CORS response and serving it to canvas image requests, which would taint the canvas and break PNG export.

1. Go to **Cloudflare Dashboard > wojak.ink domain > Rules > Transform Rules**
2. Click **Create rule** under **Modify Response Header**
3. Rule name: `R2 Layers - Vary Origin`
4. **When incoming requests match:**
   - Field: `Hostname` — Operator: `equals` — Value: `layers.wojak.ink`
5. **Then > Modify response header:**
   - Operation: **Set** — Header name: `Vary` — Value: `Origin`
6. Click **Deploy**

**Verify:** Run this in terminal:
```bash
curl -sI https://layers.wojak.ink/ | grep -i vary
```
You should see `Vary: Origin` in the response (even on an empty bucket error page).

---

### Step 2.2 — Cache-Control: immutable for PNGs

1. Same place: **Rules > Transform Rules > Modify Response Header**
2. Click **Create rule**
3. Rule name: `R2 Layers - Immutable Cache`
4. **When incoming requests match:**
   - Field: `Hostname` — Operator: `equals` — Value: `layers.wojak.ink`
   - **AND** Field: `URI Path` — Operator: `ends with` — Value: `.png`
5. **Then > Modify response header:**
   - Operation: **Set** — Header name: `Cache-Control` — Value: `public, max-age=31536000, immutable`
6. Click **Deploy**

**Verify:** After uploading assets (Phase 3), test with:
```bash
curl -sI https://layers.wojak.ink/manifest.json | grep -i cache
curl -sI https://layers.wojak.ink/BASE/BASE_Classic.png | grep -i cache
```
The PNG should show `immutable`. The manifest.json won't (that's correct — JSON isn't immutable).

---

## Phase 3: Upload Assets

### Step 3.1 — Configure rclone (one-time)

1. Go to **Cloudflare Dashboard > R2 > Overview > Manage R2 API Tokens**
2. Click **Create API Token**
3. Permissions: **Object Read & Write**
4. Scope: Apply to specific bucket → `wojak-layers`
5. Click **Create API Token**
6. Copy the **Access Key ID** and **Secret Access Key** (shown once only)

Now configure rclone:
```bash
rclone config
```

Follow the prompts:
```
n) New remote
name> r2
Storage> s3
provider> Cloudflare
access_key_id> (paste your Access Key ID)
secret_access_key> (paste your Secret Access Key)
endpoint> https://<YOUR_ACCOUNT_ID>.r2.cloudflarestorage.com
```

Your Account ID is in Cloudflare Dashboard > R2 > Overview (right sidebar).

Leave all other options as default (just press Enter).

**Verify:**
```bash
rclone ls r2:wojak-layers
```
Should return empty (bucket exists but has no files).

---

### Step 3.2 — Dry run (preview upload)

```bash
./scripts/upload-layers-to-r2.sh --dry-run
```

**Verify:** You see a list of files that WOULD be uploaded. No actual upload happens. Check the file count looks right (~548 PNGs + JSON manifests).

---

### Step 3.3 — Full upload

```bash
./scripts/upload-layers-to-r2.sh
```

Takes 1-2 minutes. You'll see a progress bar.

**Verify:**
```bash
# Check a known file exists
curl -sI https://layers.wojak.ink/manifest.json
# Should return HTTP 200

curl -sI https://layers.wojak.ink/BASE/BASE_Classic.png
# Should return HTTP 200
```

---

### Step 3.4 — Verify CORS works

```bash
curl -sI -H 'Origin: https://wojak.ink' https://layers.wojak.ink/manifest.json
```

You must see ALL of these in the response:
```
Access-Control-Allow-Origin: https://wojak.ink
Vary: Origin
```

If `Access-Control-Allow-Origin` is missing → CORS policy isn't saved correctly (redo Step 1.4).
If `Vary: Origin` is missing → Transform Rule isn't deployed (redo Step 2.1).

---

## Phase 4: Keep One Local Image for CSS

All 13 game CSS files reference one image:
```
/assets/wojak-layers/BACKGROUND/Scene/BACKGROUND_Orange Grove.png
```

CSS `url()` can't read environment variables, so this image needs to stay local.

### Step 4.1 — Keep just this one image

After everything else is confirmed working, when you eventually remove `public/assets/wojak-layers/` from git, keep this directory structure:

```
public/assets/wojak-layers/
  BACKGROUND/
    Scene/
      BACKGROUND_Orange Grove.png    ← keep this (~200KB)
```

Delete everything else from git. This one file serves all 13 CSS backgrounds.

**No code changes needed.** The CSS paths already point here.

---

## Phase 5: Set Environment Variable & Deploy

### Step 5.1 — Set the production env var

1. Go to **Cloudflare Pages > your wojak project > Settings > Environment Variables**
2. Add variable for **Production**:
   - Name: `VITE_LAYER_BASE_URL`
   - Value: `https://layers.wojak.ink`
3. Optionally add the same for **Preview** (or leave empty for local assets in preview deploys)
4. Click **Save**

**Verify:** The variable appears in the environment variables list.

---

### Step 5.2 — Deploy

Trigger a new deployment (push a commit or click "Retry deployment" in Cloudflare Pages).

Wait for the build to complete.

---

### Step 5.3 — Verify the live site

Open `https://wojak.ink/generator` in Chrome.

**Check 1 — Images load from R2:**
1. Open DevTools (F12) → **Network** tab
2. Filter by **Img** type
3. All `.png` requests should show domain `layers.wojak.ink`
4. All should return status **200**

**Check 2 — No CORS errors:**
1. Open DevTools → **Console** tab
2. There should be zero red errors mentioning "CORS" or "cross-origin"

**Check 3 — Canvas export works (most important):**
1. Create any Wojak in the generator
2. Click **Export** → **Download PNG**
3. The PNG should download successfully
4. If you get an error about "tainted canvas" or "SecurityError" → the Vary: Origin rule is missing

**Check 4 — Service worker caches R2 images:**
1. Load the generator page fully
2. Open DevTools → **Application** tab → **Cache Storage** (left sidebar)
3. You should see a cache named `wojak-layers-v1`
4. Click it — it should contain entries from `https://layers.wojak.ink/...`
5. Reload the page — images should load instantly from cache (Network tab shows "ServiceWorker" as source)

**Check 5 — Local dev still works:**
1. On your local machine, make sure `VITE_LAYER_BASE_URL` is NOT set in `.env.local`
2. Run `npm run dev`
3. Open `http://localhost:5173/generator`
4. Images should load from `localhost:5173/assets/wojak-layers/...` (local public folder)

---

## Phase 6: Clean Up Git (After Everything Works)

Only do this after the live site is confirmed working for at least a day.

### Step 6.1 — Update .gitignore

Open `.gitignore` and uncomment the layer assets line:

```diff
- # public/assets/wojak-layers/
+ public/assets/wojak-layers/
```

But add an exception for the CSS background image:

```
public/assets/wojak-layers/
!public/assets/wojak-layers/BACKGROUND/
!public/assets/wojak-layers/BACKGROUND/Scene/
!public/assets/wojak-layers/BACKGROUND/Scene/BACKGROUND_Orange Grove.png
```

### Step 6.2 — Remove from git tracking (keep local files)

```bash
git rm -r --cached public/assets/wojak-layers/
git checkout -- "public/assets/wojak-layers/BACKGROUND/Scene/BACKGROUND_Orange Grove.png"
git add "public/assets/wojak-layers/BACKGROUND/Scene/BACKGROUND_Orange Grove.png"
```

This removes layer PNGs from git tracking but keeps them on your disk (for local dev). The `.gitignore` prevents them from being re-added.

### Step 6.3 — Commit

```bash
git add .gitignore
git commit -m "Remove layer assets from git (served from R2)"
```

**Verify:** `git status` shows no untracked layer files. Your repo is now code-only (plus one 200KB background image).

---

## Phase 7: Purge Cloudflare Cache

### Step 7.1 — Purge after any CORS or header changes

If you changed CORS policy or Transform Rules after the initial deploy:

1. Go to **Cloudflare Dashboard > wojak.ink > Caching > Configuration**
2. Click **Purge Everything** under Custom Purge
3. Or purge just `layers.wojak.ink`:
   - **Purge by hostname** → enter `layers.wojak.ink`

**Verify:** Repeat the curl checks from Step 3.4. Headers should reflect your latest settings.

---

## Quick Reference

| Item | Value |
|------|-------|
| R2 Bucket | `wojak-layers` |
| Custom Domain | `layers.wojak.ink` |
| Env Variable | `VITE_LAYER_BASE_URL=https://layers.wojak.ink` |
| Upload Script | `./scripts/upload-layers-to-r2.sh` |
| Service Worker Cache | `wojak-layers-v1` (600 entries max) |
| CSS Background Image | Keep locally: `BACKGROUND_Orange Grove.png` |
| Account ID | Found at: Dashboard > R2 > Overview > right sidebar |

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Images load but PNG export fails with "tainted canvas" | Missing `Vary: Origin` Transform Rule | Add rule (Step 2.1), then purge cache (Phase 7) |
| Images don't load at all (404) | Assets not uploaded, or wrong bucket name | Re-run upload script (Step 3.3) |
| CORS error in console | CORS policy not set or wrong origins | Update CORS policy (Step 1.4) |
| Images load on first visit but fail on second | Service worker caching non-CORS response | Purge SW cache: DevTools > Application > Clear storage |
| Game backgrounds broken | CSS image not kept locally | Keep `BACKGROUND_Orange Grove.png` in public/ (Step 4.1) |
| Local dev broken | `VITE_LAYER_BASE_URL` set in `.env.local` | Remove it — let it default to local paths |
| Images load from wrong domain | Old deployment without env var | Verify env var is set (Step 5.1), redeploy |
