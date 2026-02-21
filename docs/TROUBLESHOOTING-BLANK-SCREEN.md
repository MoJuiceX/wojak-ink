# Troubleshooting: Blank or Black Screen (Brave / Windows)

If wojak.ink loads but you only see a black or blank screen (no boot animation, no error message), try the following.

## Quick fixes

1. **Hard refresh**  
   Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac) to bypass cache and reload.

2. **Brave Shields**  
   Brave can block scripts or third-party resources. For wojak.ink:
   - Click the Brave lion icon in the address bar.
   - Turn **Shields** down (or off) for this site.
   - Reload the page.

3. **Another browser**  
   Try Chrome, Edge, or Firefox to confirm whether the issue is browser-specific.

4. **Disable extensions**  
   Ad blockers or privacy extensions can block required scripts. Try opening wojak.ink in a private/incognito window (with extensions disabled) or in a clean profile.

## If you see “Something went wrong loading Wojak.ink”

Use the **Reload page** button. If it keeps happening, try the Brave Shields and extension steps above, then reload again.

## If you see “Loading Wojak.ink…” and it never changes

The app failed to start. Try:
- Hard refresh (`Ctrl+Shift+R`).
- Disable Brave Shields for this site and reload.
- Check that JavaScript is enabled and that you’re not in a restricted enterprise or school profile that blocks scripts.

## For developers

- Open DevTools (F12) → **Console** and note any red errors when the page loads.
- **Network** tab: ensure the main JS bundle and assets return 200 (not blocked or CORS errors).
- Session/local storage must be available; private or strict modes that block storage can prevent the app from initializing correctly.

---

## Royalty / treasury

**“I don’t see any transactions on the block explorer for my treasury address.”**

- **Cause:** Paid mints created via the prepare path used to set the NFT’s on-chain **royalty address** to the **minter’s wallet**, not the SplitXCH splitter. So the full 12% royalty on resales went to the minter; the treasury received nothing.
- **Fix (in code):** The prepare path now resolves the SplitXCH splitter when `TREASURY_ADDRESS` is set and passes it as the royalty address. New paid mints (prepare or queue) will have the splitter on-chain; on resales, ~10% goes to the minter and ~2% to the treasury.
- **Existing NFTs** (minted before this change) keep their current royalty address (minter). You will not see treasury activity for those resales. Only **new** paid mints will send the treasury its share.
- **Config:** Ensure `TREASURY_ADDRESS` is set in Cloudflare (Variables and Secrets). Plaintext is fine.

---

## Paid mint stuck at “Step 1 of 6” / “Preparing your mint…”

**Cause:** The mint job is created but the background worker that runs the next steps (IPFS upload, MintGarden, etc.) sometimes doesn’t run right away (e.g. `waitUntil` delayed or dropped). The job then stays at “queued” or “validating” so the UI stays on step 1.

**What we did:** Submit now moves the job to “validating” in the same request, and the processor accepts jobs in both “queued” and “validating”. The cron cleanup also retries jobs stuck in “validating” (not only “queued”) after 30 seconds. So paid mints should either progress quickly or be retried by the next cron run (every 5 minutes if the mint cron is configured).

**If it still happens:** Wait 1–2 minutes and keep the modal open so polling can pick up “Validating…” or later steps. If you have the mint cron (`POST /api/mint/cron` with `ADMIN_API_KEY`) running every 5 minutes, stuck jobs will be retried automatically.
