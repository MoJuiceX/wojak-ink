# Windows 98 Desktop App - Security & Privacy Audit

**Date:** 2024  
**Scope:** Full security analysis for frontend-only React app  
**Goal:** Identify security risks, XSS vectors, privacy issues, and provide fixes

---

## EXECUTIVE SUMMARY

The application has **good security practices** overall but needs **critical fixes** for XSS prevention and external link security:

**Critical Issues:**
1. **XSS via `document.write()`** - Unsanitized data URLs in image viewer
2. **XSS via `innerHTML`** - Unsanitized user input in DisplayPropertiesWindow
3. **Missing `rel` attributes** - External links missing `noopener noreferrer`
4. **Debug endpoints** - Development logging to localhost (should be removed in production)

**Security Score:** 7/10 (Good foundation, needs hardening)

---

## SECRETS & API KEYS AUDIT

### 1. API Keys and Tokens

**Files Checked:**
- `src/services/tangifyApi.js`
- `src/services/mintgardenApi.js`
- `src/contexts/MarketplaceContext.jsx`

**Findings:** ✅ **SAFE**
- No hardcoded API keys or tokens
- All API calls use public endpoints
- Tangify API uses relative path (`/api/tangify`) - handled by backend
- MintGarden API uses public endpoint (`https://api.mintgarden.io`)
- Dexie API uses public endpoint (`https://api.dexie.space/v1`)

**Status:** ✅ **NO ACTION NEEDED** - No secrets exposed

---

### 2. Environment Variables

**Files Checked:**
- All service files
- API configuration files

**Findings:** ✅ **SAFE**
- Uses `import.meta.env.DEV` for development checks
- No sensitive environment variables exposed
- No API keys in client-side code

**Status:** ✅ **NO ACTION NEEDED**

---

## XSS (CROSS-SITE SCRIPTING) VULNERABILITIES

### 1. `document.write()` with Unsanitized Input

**File:** `src/utils/imageUtils.js` - `viewImage()` function (line 169-187)

**Current Behavior:**
```javascript
export function viewImage(dataUrl) {
  const newWindow = window.open('', '_blank')
  if (newWindow) {
    newWindow.document.write(`
      <html>
        <head><title>Image Viewer</title></head>
        <body style="margin:0;padding:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh;">
          <img src="${dataUrl}" style="max-width:100%;max-height:100%;object-fit:contain;" />
        </body>
      </html>
    `)
  }
}
```

**Issue:** 🔴 **CRITICAL**
- `dataUrl` is inserted directly into HTML string
- If `dataUrl` contains malicious content (e.g., `"><script>alert('XSS')</script>`), it could execute
- However, `dataUrl` should be a data URL (e.g., `data:image/png;base64,...`) which is safer
- Still risky if data URL is malformed or contains unexpected content

**Fix:**
```javascript
export function viewImage(dataUrl) {
  try {
    // Validate dataUrl is actually a data URL
    if (!dataUrl || typeof dataUrl !== 'string') {
      throw new Error('Invalid image data')
    }
    
    // Ensure it's a data URL (starts with data:)
    if (!dataUrl.startsWith('data:image/')) {
      throw new Error('Invalid image format')
    }
    
    // Sanitize: Remove any potential script tags or event handlers
    // Data URLs should only contain base64, but be safe
    const sanitizedUrl = dataUrl.replace(/[<>"']/g, '')
    
    const newWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (newWindow) {
      // Use DOM methods instead of document.write for better security
      newWindow.document.open()
      newWindow.document.write('<!DOCTYPE html><html><head><title>Image Viewer</title></head><body style="margin:0;padding:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh;"></body></html>')
      newWindow.document.close()
      
      // Create img element safely
      const img = newWindow.document.createElement('img')
      img.src = sanitizedUrl
      img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;'
      newWindow.document.body.appendChild(img)
    }
  } catch (error) {
    console.error('Error viewing image:', error)
    throw error
  }
}
```

**Files to modify:**
- `src/utils/imageUtils.js` - Sanitize dataUrl, use DOM methods

**Impact:** Prevents XSS if malicious data URL is provided

---

### 2. `innerHTML` with User Input

**File:** `src/components/windows/DisplayPropertiesWindow.jsx` (line 294)

**Current Behavior:**
```javascript
e.target.parentElement.innerHTML = `<div class="color-swatch" style="background: ${wallpaper.color}"></div><span>${wallpaper.name}</span>`
```

**Issue:** 🟡 **MEDIUM**
- `wallpaper.color` and `wallpaper.name` are inserted directly into HTML
- If `wallpaper.color` contains malicious CSS (e.g., `red; background-image: url('javascript:alert(1)')`), it could execute
- `wallpaper.name` could contain HTML tags

**Fix:**
```javascript
// Option 1: Use React (safer)
const [selectedWallpaper, setSelectedWallpaper] = useState(null)

// In render:
{selectedWallpaper && (
  <div className="color-swatch" style={{ background: selectedWallpaper.color }}></div>
  <span>{selectedWallpaper.name}</span>
)}

// Option 2: Sanitize if must use innerHTML
const sanitizeHTML = (str) => {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

const sanitizeCSS = (css) => {
  // Remove dangerous CSS (javascript:, expression(), etc.)
  return css.replace(/javascript:|expression\(|@import/gi, '')
}

e.target.parentElement.innerHTML = `
  <div class="color-swatch" style="background: ${sanitizeCSS(wallpaper.color)}"></div>
  <span>${sanitizeHTML(wallpaper.name)}</span>
`
```

**Files to modify:**
- `src/components/windows/DisplayPropertiesWindow.jsx` - Sanitize or use React

**Impact:** Prevents CSS injection and HTML injection

---

### 3. `innerHTML` in OrangeToyLayer

**File:** `src/components/OrangeToyLayer.jsx` (line 390)

**Current Behavior:**
```javascript
container.innerHTML = ''
```

**Issue:** ✅ **SAFE**
- Only sets to empty string
- No user input involved

**Status:** ✅ **NO ACTION NEEDED**

---

### 4. Query Parameters

**Files Checked:**
- `src/App.jsx`
- `src/components/dev/QAPage.jsx`
- `src/services/mintgardenApi.js`

**Findings:** ✅ **SAFE**
- Query parameters are URL-encoded before use (`encodeURIComponent`)
- No direct rendering of query params as HTML
- Parameters used only for API calls or internal state

**Status:** ✅ **NO ACTION NEEDED**

---

## EXTERNAL LINKS SECURITY

### 1. Missing `rel="noopener noreferrer"`

**File:** `src/components/StartMenu.jsx` (line 90)

**Current Behavior:**
```javascript
window.open(app.open.href, '_blank', 'noopener,noreferrer')
```

**Status:** ✅ **SAFE** - Uses `noopener,noreferrer` in window.open

**File:** `src/components/windows/MintInfoWindow.jsx`

**Current Behavior:**
- Line 107: `target="_blank"` without `rel`
- Line 118: `target="_blank"` without `rel`
- Line 127: `rel="noreferrer"` (missing `noopener`)
- Line 133: `target="_blank"` without `rel`
- Line 141: `target="_blank"` without `rel`
- Line 167: `window.open('https://x.com/MoJuiceX', '_blank')` without `noopener,noreferrer`

**Issue:** 🔴 **CRITICAL**
- Missing `rel="noopener noreferrer"` allows:
  - `window.opener` access (new page can access parent window)
  - Referrer leakage (privacy issue)

**Fix:**
```javascript
// For <a> tags:
<a href="https://example.com" target="_blank" rel="noopener noreferrer">Link</a>

// For window.open:
window.open(url, '_blank', 'noopener,noreferrer')
```

**Files to modify:**
- `src/components/windows/MintInfoWindow.jsx` - Add `rel="noopener noreferrer"` to all external links
- `src/components/windows/ReadmeWindow.jsx` - Verify all links have `rel` attributes

**Impact:** Prevents window.opener attacks, protects referrer privacy

---

### 2. External Link Audit

**Files with External Links:**
- `src/components/StartMenu.jsx` - ✅ Safe (uses `noopener,noreferrer`)
- `src/components/windows/MintInfoWindow.jsx` - ❌ Missing `rel` attributes
- `src/components/windows/ReadmeWindow.jsx` - ✅ Safe (has `rel="noreferrer"`)
- `src/components/DesktopIcons.jsx` - ✅ Safe (uses `noopener,noreferrer`)

**Fix Required:**
- Add `rel="noopener noreferrer"` to all `<a target="_blank">` tags
- Ensure all `window.open()` calls include `'noopener,noreferrer'`

---

## EVENT INJECTION RISKS

### 1. Custom Events

**Files:** Multiple files dispatch custom events

**Current Behavior:**
- `themeChanged` - Dispatched with theme string
- `accentChanged` - Dispatched with accent string
- `muteToggle` - Dispatched with mute state
- `openPaintWindow` - No data
- `screensaverSettingsChanged` - No data

**Issue:** 🟢 **LOW**
- Custom events are internal only
- Event data is controlled (not user input)
- No external event listeners expected

**Status:** ✅ **ACCEPTABLE** - No changes needed

---

### 2. Global Event Listeners

**Files:** Multiple files use `addEventListener`

**Current Behavior:**
- Document-level listeners for scroll, touch, keyboard
- Window-level listeners for resize, blur
- Custom event listeners for theme changes

**Issue:** 🟢 **LOW**
- All listeners are controlled by app code
- No user-controlled event data
- Proper cleanup in `useEffect` return functions

**Status:** ✅ **ACCEPTABLE** - No changes needed

---

## PRIVACY CONCERNS

### 1. localStorage Usage

**Files:** Multiple files use `localStorage`

**Data Stored:**
- Theme preferences (`theme`, `accent`)
- Wallpaper selection (`wallpaper`)
- Screensaver settings
- Desktop images (thumbnails)
- Recycle bin contents
- Game state (OrangeToy score, claims)
- Welcome modal dismissal
- Sound mute state

**Issue:** 🟡 **MEDIUM**
- No sensitive personal data stored
- All data is local-only (not transmitted)
- Desktop images may contain user-generated content (privacy consideration)

**Recommendations:**
- ✅ Current usage is acceptable
- Consider adding "Clear All Data" option for privacy
- Document what data is stored in privacy policy

**Status:** ✅ **ACCEPTABLE** - No immediate action needed

---

### 2. Clipboard Access

**File:** `src/components/windows/MarketplaceWindow.jsx` (line 30)

**Current Behavior:**
```javascript
navigator.clipboard.writeText(offerFile)
```

**Issue:** 🟢 **LOW**
- Only writes to clipboard (user-initiated)
- Doesn't read clipboard (no privacy leak)
- Uses Clipboard API (secure)

**Status:** ✅ **ACCEPTABLE** - No changes needed

---

### 3. Image Data URLs

**Issue:** 🟡 **MEDIUM**
- Canvas images converted to data URLs (base64)
- Data URLs can be large (privacy consideration if logged/transmitted)
- Currently only used locally (not transmitted)

**Status:** ✅ **ACCEPTABLE** - No immediate action needed

---

## DEBUG CODE & DEVELOPMENT ENDPOINTS

### 1. Localhost Logging

**Files:** Multiple files contain debug logging to `http://127.0.0.1:7243`

**Current Behavior:**
```javascript
fetch('http://127.0.0.1:7243/ingest/...', {...})
```

**Issue:** 🟡 **MEDIUM**
- Development-only logging
- Should be removed or gated by `import.meta.env.DEV`
- No security risk if left in (fails silently in production)

**Fix:**
```javascript
// Gate all debug logging
if (import.meta.env.DEV) {
  fetch('http://127.0.0.1:7243/ingest/...', {...}).catch(() => {})
}
```

**Files to modify:**
- All files with `http://127.0.0.1:7243` - Gate with `import.meta.env.DEV`

**Impact:** Cleaner production code, no failed requests

---

## API SECURITY

### 1. CORS and API Calls

**Files:**
- `src/services/tangifyApi.js`
- `src/services/mintgardenApi.js`

**Current Behavior:**
- Tangify API: Relative path (`/api/tangify`) - handled by Cloudflare Pages Function
- MintGarden API: Public CORS-enabled endpoint
- Dexie API: Public CORS-enabled endpoint

**Issue:** ✅ **SAFE**
- All API calls are to trusted endpoints
- No credentials sent (no auth tokens)
- CORS handled by API providers

**Status:** ✅ **NO ACTION NEEDED**

---

### 2. Input Validation

**Files:** API service files

**Current Behavior:**
- User input (prompts, queries) sent to APIs
- Input is JSON-stringified (safe)
- No direct string concatenation in URLs (uses `encodeURIComponent`)

**Status:** ✅ **ACCEPTABLE** - Input validation is adequate

---

## CONTENT SECURITY POLICY (CSP) READINESS

### Current State
- No CSP headers currently set
- App uses:
  - Inline styles (via React)
  - External CDN (98.css from unpkg.com)
  - Data URLs (images)
  - Blob URLs (images)
  - `eval()` - None found ✅
  - `Function()` - None found ✅

### Proposed CSP for Cloudflare Pages

**File:** `_headers` (Cloudflare Pages) or `netlify.toml` headers

```http
/*
  Content-Security-Policy: 
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline' https://unpkg.com;
    img-src 'self' data: blob: https://bafybeigjkkonjzwwpopo4wn4gwrrvb7z3nwr2edj2554vx3avc5ietfjwq.ipfs.w3s.link https://api.mintgarden.io;
    font-src 'self' data:;
    connect-src 'self' https://api.mintgarden.io https://api.dexie.space https://unpkg.com;
    frame-src 'none';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    upgrade-insecure-requests;
```

**Note:** `'unsafe-inline'` and `'unsafe-eval'` are required for:
- React's inline event handlers
- Vite's development mode
- Some third-party libraries

**Alternative (Stricter):**
- Use nonces for inline scripts/styles (requires build-time injection)
- Remove `'unsafe-eval'` if possible (may break some libraries)

**Files to create:**
- `public/_headers` (Cloudflare Pages) or configure in Cloudflare dashboard

---

## RANKED SECURITY ISSUES

### 🔴 CRITICAL (P0) - Fix Immediately

1. **XSS via `document.write()`** (Impact: High, Effort: Low)
   - Unsanitized data URL in image viewer
   - Fix: Sanitize dataUrl, use DOM methods
   - **Blocks:** XSS if malicious data URL provided

2. **Missing `rel` Attributes** (Impact: High, Effort: Low)
   - External links missing `noopener noreferrer`
   - Fix: Add to all external links
   - **Blocks:** Window.opener attacks, referrer leakage

3. **XSS via `innerHTML`** (Impact: Medium, Effort: Low)
   - Unsanitized wallpaper data in DisplayPropertiesWindow
   - Fix: Sanitize or use React
   - **Blocks:** CSS/HTML injection

---

### 🟡 HIGH (P1) - Fix Soon

4. **Debug Endpoints** (Impact: Low, Effort: Low)
   - Localhost logging in production code
   - Fix: Gate with `import.meta.env.DEV`
   - **Improves:** Code cleanliness

5. **CSP Headers** (Impact: Medium, Effort: Medium)
   - No CSP protection
   - Fix: Add CSP headers
   - **Improves:** Defense in depth

---

### 🟢 MEDIUM (P2) - Optional

6. **Privacy Documentation** (Impact: Low, Effort: Low)
   - No clear privacy policy
   - Fix: Document localStorage usage
   - **Improves:** Transparency

---

## CONCRETE FIXES

### Fix 1: Sanitize `viewImage()` Data URL

**File:** `src/utils/imageUtils.js`

```javascript
export function viewImage(dataUrl) {
  try {
    // Validate and sanitize dataUrl
    if (!dataUrl || typeof dataUrl !== 'string') {
      throw new Error('Invalid image data')
    }
    
    // Ensure it's a data URL
    if (!dataUrl.startsWith('data:image/')) {
      throw new Error('Invalid image format')
    }
    
    // Additional validation: check it's base64
    const [header, data] = dataUrl.split(',')
    if (!header || !data) {
      throw new Error('Invalid data URL format')
    }
    
    // Use DOM methods instead of document.write
    const newWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (newWindow) {
      newWindow.document.open()
      newWindow.document.write('<!DOCTYPE html><html><head><title>Image Viewer</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh;"></body></html>')
      newWindow.document.close()
      
      const img = newWindow.document.createElement('img')
      img.src = dataUrl // Safe now - validated as data:image/
      img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;'
      newWindow.document.body.appendChild(img)
    }
  } catch (error) {
    console.error('Error viewing image:', error)
    throw error
  }
}
```

---

### Fix 2: Add `rel` Attributes to External Links

**File:** `src/components/windows/MintInfoWindow.jsx`

```javascript
// Line 107, 118, 133, 141 - Add rel attribute
<a href="https://example.com" target="_blank" rel="noopener noreferrer">Link</a>

// Line 127 - Add noopener
<a href="https://go4.me/" target="_blank" rel="noopener noreferrer">

// Line 167 - Add noopener,noreferrer to window.open
window.open('https://x.com/MoJuiceX', '_blank', 'noopener,noreferrer')
```

---

### Fix 3: Sanitize `innerHTML` in DisplayPropertiesWindow

**File:** `src/components/windows/DisplayPropertiesWindow.jsx`

```javascript
// Option 1: Use React (preferred)
const [selectedWallpaperPreview, setSelectedWallpaperPreview] = useState(null)

// In render:
{selectedWallpaperPreview && (
  <>
    <div className="color-swatch" style={{ background: selectedWallpaperPreview.color }}></div>
    <span>{selectedWallpaperPreview.name}</span>
  </>
)}

// Option 2: Sanitize if must use innerHTML
const sanitizeHTML = (str) => {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

const sanitizeCSS = (css) => {
  // Remove dangerous CSS
  return css
    .replace(/javascript:/gi, '')
    .replace(/expression\(/gi, '')
    .replace(/@import/gi, '')
    .replace(/url\(['"]?javascript:/gi, '')
}

e.target.parentElement.innerHTML = `
  <div class="color-swatch" style="background: ${sanitizeCSS(wallpaper.color)}"></div>
  <span>${sanitizeHTML(wallpaper.name)}</span>
`
```

---

### Fix 4: Gate Debug Logging

**File:** All files with `http://127.0.0.1:7243`

```javascript
// Wrap all debug logging
if (import.meta.env.DEV) {
  fetch('http://127.0.0.1:7243/ingest/...', {...}).catch(() => {})
}
```

**Files to modify:**
- `src/App.jsx`
- `src/components/Taskbar.jsx`
- `src/components/windows/Window.jsx`
- Any other files with localhost logging

---

### Fix 5: Add CSP Headers

**File:** `public/_headers` (Cloudflare Pages)

```http
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: blob: https://bafybeigjkkonjzwwpopo4wn4gwrrvb7z3nwr2edj2554vx3avc5ietfjwq.ipfs.w3s.link https://api.mintgarden.io; font-src 'self' data:; connect-src 'self' https://api.mintgarden.io https://api.dexie.space; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self';
```

**Alternative:** Configure in Cloudflare Pages dashboard under "Headers"

---

## WHAT IS SAFE AS-IS

### ✅ No Changes Needed

1. **API Calls** - All use public endpoints, no secrets
2. **localStorage Usage** - Acceptable for local preferences
3. **Custom Events** - Internal only, controlled data
4. **Query Parameters** - Properly encoded, not rendered as HTML
5. **Clipboard API** - Only writes (user-initiated), doesn't read
6. **OrangeToyLayer innerHTML** - Only sets to empty string
7. **Most External Links** - Already have proper `rel` attributes

---

## TESTING CHECKLIST

### XSS Prevention
- [ ] Data URLs validated before use
- [ ] No `innerHTML` with user input
- [ ] No `document.write()` with unsanitized data
- [ ] All user input escaped/encoded

### External Links
- [ ] All `<a target="_blank">` have `rel="noopener noreferrer"`
- [ ] All `window.open()` include `'noopener,noreferrer'`
- [ ] No `javascript:` URLs

### API Security
- [ ] No API keys in client code
- [ ] All API calls use HTTPS
- [ ] Input properly encoded

### CSP
- [ ] CSP headers configured
- [ ] App works with CSP enabled
- [ ] No CSP violations in console

---

## IMPLEMENTATION PRIORITY

### Phase 1: Critical Fixes (1-2 hours)
1. Sanitize `viewImage()` data URL
2. Add `rel` attributes to external links
3. Sanitize `innerHTML` in DisplayPropertiesWindow

**Expected improvement:** XSS prevention, link security

### Phase 2: Hardening (1 hour)
4. Gate debug logging
5. Add CSP headers

**Expected improvement:** Defense in depth, cleaner code

### Phase 3: Documentation (30 minutes)
6. Document privacy practices
7. Add security notes to README

**Expected improvement:** Transparency

---

## CONCLUSION

The application has **good security foundations** but needs **critical XSS fixes**:

**Strengths:**
- No exposed secrets
- Proper input encoding for API calls
- Most external links secure
- No `eval()` or `Function()` usage

**Weaknesses:**
- XSS vectors via `document.write()` and `innerHTML`
- Missing `rel` attributes on some external links
- No CSP protection

**Priority:** Fix P0 issues first (XSS, External links), then P1 (Debug code, CSP), then P2 (Documentation).

**Expected outcome:** Production-ready security posture with defense in depth.
















