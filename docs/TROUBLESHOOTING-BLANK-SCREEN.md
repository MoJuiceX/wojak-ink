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
