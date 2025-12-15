/**
 * Asset Extraction Script
 * 
 * This script helps extract assets from wojak.ink
 * Run with: node scripts/extract-assets.js
 * 
 * Note: This is a helper script. You may need to manually download assets
 * depending on CORS and website structure.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const assetsDir = path.join(projectRoot, 'public', 'assets', 'images')

// Create assets directory structure
const dirs = [
  path.join(assetsDir, 'banners'),
  path.join(assetsDir, 'gallery'),
  path.join(assetsDir, 'icons'),
]

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
})

console.log('Asset extraction script initialized.')
console.log('Assets directory:', assetsDir)
console.log('\nTo extract assets from wojak.ink:')
console.log('1. Open wojak.ink in your browser')
console.log('2. Open DevTools (F12)')
console.log('3. Go to Network tab and filter by "Img"')
console.log('4. Reload the page')
console.log('5. Right-click images and "Save As" to the appropriate folder:')
console.log('   - Banners: public/assets/images/banners/')
console.log('   - Gallery: public/assets/images/gallery/')
console.log('   - Icons: public/assets/images/icons/')
console.log('\nAlternatively, use browser extensions or tools like:')
console.log('- SingleFile (browser extension)')
console.log('- wget/curl for direct downloads')
console.log('- Puppeteer for automated extraction')

