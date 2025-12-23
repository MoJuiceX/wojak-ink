import { readFile, writeFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DEXIE_API_BASE = 'https://api.dexie.space/v1'
const XCH_CSV = join(__dirname, '../public/assets/XCH.csv')
const OUTPUT_CSV = join(__dirname, '../public/assets/XCH_ACTIVE.csv')

/**
 * Check if an offer is still active via Dexie API
 * Active = status === 0 AND date_completed === null
 */
async function isOfferActive(offerFile) {
  try {
    const response = await fetch(`${DEXIE_API_BASE}/offers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ offer: offerFile }),
    })
    
    if (!response.ok) {
      console.warn(`  ⚠️  API error for offer: ${response.status}`)
      return false
    }
    
    const data = await response.json()
    if (data.success && data.offer) {
      const offerData = data.offer
      // Active = status === 0 AND date_completed === null
      const isActive = offerData.status === 0 && offerData.date_completed === null
      return isActive
    }
    
    return false
  } catch (error) {
    console.warn(`  ⚠️  Error checking offer: ${error.message}`)
    return false
  }
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Main function
 */
async function main() {
  console.log('Reading XCH.csv...')
  
  // Read XCH.csv
  const text = await readFile(XCH_CSV, 'utf-8')
  const lines = text.trim().split('\n').filter(line => line.trim().length > 0)
  
  console.log(`Found ${lines.length} offers in XCH.csv`)
  console.log('Checking which offers are still active...\n')
  
  const activeOffers = []
  let checked = 0
  
  // Process each line (format: XCH,offerfile)
  for (const line of lines) {
    const parts = line.split(',').map(p => p.trim())
    if (parts.length < 2) continue
    
    const group = parts[0]
    const offerFile = parts[1]
    
    if (!offerFile || !offerFile.startsWith('offer1')) {
      console.warn(`Skipping invalid offer: ${offerFile}`)
      continue
    }
    
    checked++
    process.stdout.write(`Checking ${checked}/${lines.length}: `)
    
    const isActive = await isOfferActive(offerFile)
    
    if (isActive) {
      activeOffers.push(line)
      console.log('✓ ACTIVE')
    } else {
      console.log('✗ SOLD/INACTIVE')
    }
    
    // Rate limiting - be nice to the API
    await sleep(500) // 500ms delay between requests
  }
  
  console.log(`\nFound ${activeOffers.length} active offers out of ${checked} checked`)
  
  // Write output CSV
  const output = activeOffers.join('\n') + '\n'
  await writeFile(OUTPUT_CSV, output, 'utf-8')
  
  console.log(`\n✓ Saved active offers to: ${OUTPUT_CSV}`)
  console.log(`\nYou can now add more offers to this file!`)
}

// Run
main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})


