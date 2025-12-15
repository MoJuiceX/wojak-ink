# Asset Extraction

## Manual Extraction

Since automated extraction may face CORS issues, here's a manual process:

### From wojak.ink:

1. **Banner Images:**
   - Open wojak.ink
   - Right-click the banner image
   - Save to `public/assets/images/banners/`

2. **Gallery Images:**
   - These are currently loaded from IPFS
   - If you want local copies, save to `public/assets/images/gallery/`

3. **OG Image:**
   - Check the `<meta property="og:image">` tag
   - Download and save to `public/assets/og.jpg`

4. **Logo:**
   - Check the favicon or logo in the page
   - Save to `public/logo.png`

### Using Browser DevTools:

1. Open DevTools (F12)
2. Go to Network tab
3. Filter by "Img"
4. Reload page
5. Find images and save them manually

### Using Browser Extensions:

- **SingleFile**: Saves complete page with assets
- **Image Downloader**: Bulk download images from a page

