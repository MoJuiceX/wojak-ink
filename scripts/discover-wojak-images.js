/**
 * Script to discover and download images from wojak.ink
 * This script attempts to download common image paths
 * Run with: node scripts/discover-wojak-images.js
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

// Common image paths to try
const COMMON_IMAGE_PATHS = [
  '/assets/og.jpg',
  '/assets/logo.png',
  '/assets/favicon.png',
  '/assets/favicon.ico',
  '/assets/banner.png',
  '/assets/hero.png',
  '/images/og.jpg',
  '/images/logo.png',
  '/img/og.jpg',
  '/img/logo.png',
]

/**
 * Check if a URL exists
 */
function checkUrlExists(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http
    
    const req = protocol.get(url, { timeout: 5000 }, (response) => {
      if (response.statusCode === 200) {
        resolve(true)
      } else if (response.statusCode === 301 || response.statusCode === 302) {
        // Follow redirect
        checkUrlExists(response.headers.location).then(resolve)
      } else {
        resolve(false)
      }
    })
    
    req.on('error', () => resolve(false))
    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })
  })
}

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
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath)
        }
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
  console.log('Discovering images from wojak.ink...\n')
  
  const baseUrl = 'https://wojak.ink'
  const foundImages = []
  
  // Check each common path
  for (const imagePath of COMMON_IMAGE_PATHS) {
    const url = `${baseUrl}${imagePath}`
    process.stdout.write(`Checking ${imagePath}... `)
    
    const exists = await checkUrlExists(url)
    if (exists) {
      console.log('Found!')
      foundImages.push({
        url,
        localPath: imagePath.startsWith('/') ? imagePath.substring(1) : imagePath,
      })
    } else {
      console.log('Not found')
    }
  }
  
  console.log(`\nFound ${foundImages.length} images to download\n`)
  
  // Download found images
  for (const image of foundImages) {
    try {
      await downloadFile(image.url, image.localPath)
    } catch (error) {
      console.error(`✗ Failed to download ${image.url}:`, error.message)
    }
  }
  
  console.log('\nDone!')
}

main().catch(console.error)

