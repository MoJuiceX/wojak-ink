/**
 * Script to download Windows 98 PNG icons from Win98SE repo
 * Run with: node scripts/download-icon-pngs.js
 */

import https from 'https'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const iconsDir = path.join(__dirname, '..', 'public', 'icons', 'app')

// Icon mappings - map our icon names to the actual icon filenames in the repo
// Using 16x16 size from https://github.com/nestoris/Win98SE/tree/main/SE98/apps/16
const iconMappings = {
  'notepad.png': 'notepad',
  'info.png': 'info',
  'folder.png': 'folder',
  'help.png': 'help',
  'briefcase.png': 'briefcase',
  'paint.png': 'paint',
  'settings.png': 'settings',
  'default.png': 'application', // or 'default' if available
}

const baseUrl = 'https://raw.githubusercontent.com/nestoris/Win98SE/main/SE98/apps/16'
const size = '16' // 16x16 icons

function downloadIcon(iconName, iconFile) {
  return new Promise((resolve) => {
    const filePath = path.join(iconsDir, iconName)
    const url = `${baseUrl}/${iconFile}.png`
    
    const protocol = url.startsWith('https') ? https : http
    
    console.log(`Downloading ${iconName} from ${url}...`)
    
    const request = protocol.get(url, (response) => {
      if (response.statusCode === 200) {
        const fileStream = fs.createWriteStream(filePath)
        response.pipe(fileStream)
        fileStream.on('finish', () => {
          fileStream.close()
          console.log(`✓ Downloaded ${iconName}`)
          resolve(true)
        })
      } else if (response.statusCode === 301 || response.statusCode === 302) {
        // Follow redirect
        downloadIcon(iconName, iconFile).then(resolve)
      } else {
        console.log(`✗ Failed to download ${iconName}: ${response.statusCode}`)
        // Try alternative names
        const alternatives = {
          'notepad': ['notepad', 'notepad-2', 'notepad-3'],
          'info': ['info', 'information', 'info-2'],
          'folder': ['folder', 'folder-2', 'folder-open'],
          'help': ['help', 'help-2', 'question'],
          'briefcase': ['briefcase', 'briefcase-2'],
          'paint': ['paint', 'paintbrush', 'mspaint'],
          'settings': ['settings', 'control-panel', 'settings-2'],
          'application': ['application', 'default', 'app'],
        }
        
        const altNames = alternatives[iconFile] || []
        if (altNames.length > 1) {
          console.log(`  Trying alternatives for ${iconFile}...`)
          // Try first alternative
          const nextAlt = altNames[1]
          downloadIcon(iconName, nextAlt).then(resolve)
        } else {
          resolve(false)
        }
      }
    })
    
    request.on('error', (err) => {
      console.log(`✗ Error downloading ${iconName}: ${err.message}`)
      resolve(false)
    })
    
    request.setTimeout(10000, () => {
      request.destroy()
      console.log(`✗ Timeout downloading ${iconName}`)
      resolve(false)
    })
  })
}

async function main() {
  // Ensure directory exists
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true })
  }

  console.log('Downloading Windows 98 PNG icons (16x16)...\n')
  
  for (const [filename, iconFile] of Object.entries(iconMappings)) {
    await downloadIcon(filename, iconFile)
  }
  
  console.log('\nDone!')
}

main().catch(console.error)
