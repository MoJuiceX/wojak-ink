# Run the SplitXCH Proof (step-by-step)

**Done for you:** The project is deployed. The API `GET /api/admin/verify-royalty-split` is live (included in the latest deploy). The verification script and this guide are in the repo.

**You must do:** Run the verification script with your `ADMIN_SECRET` and save the output. Only you have the secret; the script cannot be run without it.

---

## Step 1: Confirm production URL

- If **wojak.ink** is your production and it’s linked to this project in Cloudflare Pages, the deploy you just did may be on a preview. In that case either:
  - **Option A:** In Cloudflare Dashboard → Pages → wojak-ink → Deployments, **promote** the latest deployment to Production, **or**
  - **Option B:** Trigger a production deploy from your main branch (e.g. push to main if CI deploys production).
- If you only use **preview** URLs (e.g. `https://xxxx.wojak-ink.pages.dev`), use that as `BASE_URL` in Step 3.

---

## Step 2: Get your ADMIN_SECRET

- It’s the same secret you use for other admin endpoints (e.g. `/api/admin/recent-mints`).
- Set in Cloudflare Pages: **Settings → Environment variables** (or **wrangler secret**).
- You’ll use it only in your local terminal in the next step; don’t paste it in chat or commit it.

---

## Step 3: Run the proof and save the report

In your terminal, from the project root:

```bash
cd /Users/abit_hex/wojak-ink
ADMIN_SECRET=your_actual_secret_here npx tsx scripts/verify-split-on-mints.ts
```

Replace `your_actual_secret_here` with your real `ADMIN_SECRET`.

**To save the output to a file (recommended):**

```bash
ADMIN_SECRET=your_actual_secret_here npx tsx scripts/verify-split-on-mints.ts | tee split-proof-$(date +%Y%m%d).txt
```

Or use the helper script (same thing, writes a timestamped file):

```bash
ADMIN_SECRET=your_actual_secret_here ./scripts/run-split-proof.sh
```

If production is a **preview** URL:

```bash
BASE_URL=https://c168be8b.wojak-ink.pages.dev ADMIN_SECRET=your_secret npx tsx scripts/verify-split-on-mints.ts | tee split-proof.txt
```

---

## Step 4: Interpret the result

- **Script exits 0** and prints:  
  `All minted NFTs have the SplitXCH split set as royalty_address on-chain.`  
  → That run is your **proof**. Keep the saved output (or a screenshot) as evidence.

- **Script exits 1** or prints mismatches → Open the saved file and fix or investigate the listed NFTs.

- **"Missing ADMIN_SECRET"** or **401 Unauthorized** → You didn’t set `ADMIN_SECRET` correctly in the same shell where you ran the command (or the API isn’t using the same secret).

---

## Step 5: Keep the evidence

- Save the file you used with `tee` (e.g. `split-proof-20260221.txt`) somewhere safe.
- Or take a screenshot of the terminal showing the final “Conclusion” and “Done” lines with exit code 0.

You’re done. That run is the proof that the split has been working on all minted NFTs (at the time you ran it).
