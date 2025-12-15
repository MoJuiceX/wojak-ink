/**
 * Script to download images from wojak.ink and save them to public folder
 * Run with: node scripts/download-wojak-images.js
 */

import https from 'https'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PUBLIC_DIR = path.join(__dirname, '..', 'public')
const ASSETS_DIR = path.join(PUBLIC_DIR, 'assets')

// Ensure directories exist
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true })
}

// Images to download from wojak.ink
const IMAGES_TO_DOWNLOAD = [
  {
    url: 'https://wojak.ink/assets/og.jpg',
    localPath: 'assets/og.jpg',
  },
  {
    url: 'https://wojak.ink/assets/logo.png',
    localPath: 'assets/logo.png',
  },
  // Add more images here as needed
]

/**
 * Download a file from URL
 */
function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    const fullPath = path.join(PUBLIC_DIR, filePath)
    const dir = path.dirname(fullPath)
    
    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const protocol = url.startsWith('https') ? https : http
    
    const file = fs.createWriteStream(fullPath)
    
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirects
        return downloadFile(response.headers.location, filePath)
          .then(resolve)
          .catch(reject)
      }
      
      if (response.statusCode !== 200) {
        file.close()
        fs.unlinkSync(fullPath)
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`))
        return
      }

      response.pipe(file)

      file.on('finish', () => {
        file.close()
        console.log(`✓ Downloaded: ${filePath}`)
        resolve()
      })
    }).on('error', (err) => {
      file.close()
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath)
      }
      reject(err)
    })
  })
}

/**
 * Main function
 */
async function main() {
  console.log('Downloading images from wojak.ink...\n')
  
  for (const image of IMAGES_TO_DOWNLOAD) {
    try {
      await downloadFile(image.url, image.localPath)
    } catch (error) {
      console.error(`✗ Failed to download ${image.url}:`, error.message)
    }
  }
  
  console.log('\nDone!')
}

main().catch(console.error)

