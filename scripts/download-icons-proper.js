/**
 * Script to download Windows 98 icons from Win98SE repo
 * Tries SVG from scalable folder first, then PNG from size folders
 * Run with: node scripts/download-icons-proper.js
 */

import https from 'https'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const iconsDir = path.join(__dirname, '..', 'public', 'icons', 'app')
const baseUrl = 'https://raw.githubusercontent.com/nestoris/Win98SE/main/SE98'

// Icon mappings - what we need and their possible names in the repo
const iconMappings = {
  'notepad.png': ['notepad', 'notepad-2'],
  'info.png': ['info', 'information', 'info-2'],
  'folder.png': ['folder', 'folder-2', 'folder-open'],
  'help.png': ['help', 'help-2', 'question'],
  'briefcase.png': ['briefcase', 'briefcase-2'],
  'paint.png': ['paint', 'paintbrush', 'mspaint'],
  'settings.png': ['settings', 'control-panel', 'settings-2'],
  'default.png': ['application', 'default', 'app'],
}

// Try to download SVG first (scalable), then PNG (16x16)
async function downloadIcon(iconName, possibleNames) {
  // Try SVG first from scalable folder
  for (const name of possibleNames) {
    const svgUrl = `${baseUrl}/apps/scalable/${name}.svg`
    const svgPath = path.join(iconsDir, iconName.replace('.png', '.svg'))
    
    if (await tryDownload(svgUrl, svgPath)) {
      console.log(`✓ Downloaded ${iconName.replace('.png', '.svg')} (SVG)`)
      // Also create a PNG version by converting or using the same name
      // For now, we'll use SVG and update the code to support both
      return true
    }
  }
  
  // Try PNG from 16 folder
  for (const name of possibleNames) {
    const pngUrl = `${baseUrl}/apps/16/${name}.png`
    const pngPath = path.join(iconsDir, iconName)
    
    if (await tryDownload(pngUrl, pngPath)) {
      console.log(`✓ Downloaded ${iconName} (PNG)`)
      return true
    }
  }
  
  // Try PNG from 32 folder as fallback
  for (const name of possibleNames) {
    const pngUrl = `${baseUrl}/apps/32/${name}.png`
    const pngPath = path.join(iconsDir, iconName)
    
    if (await tryDownload(pngUrl, pngPath)) {
      console.log(`✓ Downloaded ${iconName} (PNG from 32 folder, will be scaled)`)
      return true
    }
  }
  
  console.log(`✗ Failed to download ${iconName}`)
  return false
}

function tryDownload(url, filePath) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Node.js'
      }
    }, (response) => {
      if (response.statusCode === 200) {
        const fileStream = fs.createWriteStream(filePath)
        response.pipe(fileStream)
        fileStream.on('finish', () => {
          fileStream.close()
          resolve(true)
        })
        fileStream.on('error', () => {
          resolve(false)
        })
      } else {
        resolve(false)
      }
    }).on('error', () => {
      resolve(false)
    }).setTimeout(10000, () => {
      resolve(false)
    })
  })
}

async function main() {
  // Ensure directory exists
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true })
  }

  console.log('Downloading Windows 98 icons...\n')
  console.log('Trying SVG (scalable) first, then PNG (16x16), then PNG (32x32)...\n')
  
  for (const [filename, names] of Object.entries(iconMappings)) {
    await downloadIcon(filename, names)
  }
  
  console.log('\nDone!')
  console.log('\nNote: If SVG files were downloaded, you may need to update the code to use .svg instead of .png')
}

main().catch(console.error)


