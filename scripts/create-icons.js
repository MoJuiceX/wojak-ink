/**
 * Script to create simple Windows 98 style PNG icons
 * Run with: node scripts/create-icons.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const iconsDir = path.join(__dirname, '..', 'public', 'icons', 'app')

// Simple 16x16 PNG icon generator using base64 encoded minimal PNGs
// These are 1x1 pixel PNGs that will be scaled by CSS, or we can create proper 16x16 icons

// For now, let's create a simple approach - download or create minimal icons
// Actually, let's just create placeholder files that indicate what icon should be there
// The actual icons can be downloaded manually or replaced later

const iconPlaceholders = {
  'notepad.png': 'Notepad icon - replace with actual Windows 98 notepad icon',
  'info.png': 'Info icon - replace with actual Windows 98 info icon',
  'folder.png': 'Folder icon - replace with actual Windows 98 folder icon',
  'help.png': 'Help icon - replace with actual Windows 98 help icon',
  'briefcase.png': 'Briefcase icon - replace with actual Windows 98 briefcase icon',
  'paint.png': 'Paint icon - replace with actual Windows 98 paint icon',
  'settings.png': 'Settings icon - replace with actual Windows 98 settings icon',
  'default.png': 'Default icon - replace with actual Windows 98 default icon',
}

// Create a minimal 16x16 PNG (1x1 transparent pixel, will be scaled)
// Base64 encoded 1x1 transparent PNG
const minimalPNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

async function main() {
  // Ensure directory exists
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true })
  }

  console.log('Creating placeholder icon files...')
  
  // Create minimal PNG files as placeholders
  for (const [filename] of Object.entries(iconPlaceholders)) {
    const filePath = path.join(iconsDir, filename)
    fs.writeFileSync(filePath, minimalPNG)
    console.log(`Created ${filename}`)
  }
  
  console.log('\nNote: These are placeholder icons. Replace them with actual Windows 98 icons from:')
  console.log('https://github.com/nestoris/Win98SE/tree/main/SE98')
  console.log('\nOr download from: https://win98icons.alexmeub.com/')
}

main().catch(console.error)

