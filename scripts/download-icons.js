/**
 * Script to download Windows 98 icons from GitHub
 * Run with: node scripts/download-icons.js
 */

import https from 'https'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const iconsDir = path.join(__dirname, '..', 'public', 'icons', 'app')
const baseUrl = 'https://raw.githubusercontent.com/nestoris/Win98SE/main/SE98'

const icons = [
  'notepad',
  'info',
  'folder',
  'help',
  'briefcase',
  'paint',
  'settings',
  'default'
]

function downloadIcon(iconName) {
  return new Promise((resolve, reject) => {
    const url = `${baseUrl}/${iconName}.ico`
    const filePath = path.join(iconsDir, `${iconName}.ico`)
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        const fileStream = fs.createWriteStream(filePath)
        response.pipe(fileStream)
        fileStream.on('finish', () => {
          fileStream.close()
          console.log(`Downloaded ${iconName}.ico`)
          resolve()
        })
      } else if (response.statusCode === 404) {
        console.log(`Icon ${iconName}.ico not found, skipping...`)
        resolve()
      } else {
        console.log(`Failed to download ${iconName}.ico: ${response.statusCode}`)
        resolve()
      }
    }).on('error', (err) => {
      console.log(`Error downloading ${iconName}.ico: ${err.message}`)
      resolve()
    })
  })
}

async function main() {
  // Ensure directory exists
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true })
  }

  console.log('Downloading Windows 98 icons...')
  for (const icon of icons) {
    await downloadIcon(icon)
  }
  console.log('Done!')
}

main().catch(console.error)

