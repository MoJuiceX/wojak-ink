/**
 * Investigate MintGarden Missing IDs
 * 
 * Analyzes which NFTs are missing from the launcher map and tries to find
 * them in MintGarden using search or collection scan.
 * 
 * Usage:
 *   node scripts/investigate_mintgarden_missing.mjs [limit]
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const MAP_FILE = path.join(ROOT, 'public/assets/BigPulp/mintgarden_launcher_map_v1.json')
const METADATA_FILE = path.join(ROOT, 'public/Wojak_Farmers_Plot_metadata_FIXED DRAC.json')
const COLLECTION_ID = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah'

const LIMIT = parseInt(process.argv[2]) || 10 // Investigate first N missing IDs

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (err) {
    throw new Error(`Failed to read ${filePath}: ${err.message}`)
  }
}

async function searchMintGarden(query) {
  try {
    const response = await fetch(`https://api.mintgarden.io/search/nfts?query=${encodeURIComponent(query)}`)
    if (!response.ok) return []
    const data = await response.json()
    return data.items || []
  } catch (err) {
    return []
  }
}

async function main() {
  console.log('[Investigate] Loading files...\n')
  
  const mapData = readJson(MAP_FILE)
  const metadata = readJson(METADATA_FILE)
  
  const map = mapData.map || {}
  const missingIds = mapData.missing_sample || []
  
  console.log(`Missing IDs in map: ${mapData.missing_count}`)
  console.log(`Investigating first ${LIMIT} missing IDs...\n`)
  
  // Build metadata lookup
  const metadataByEdition = {}
  for (const nft of metadata) {
    if (nft.edition) {
      metadataByEdition[nft.edition] = nft
    }
  }
  
  let found = 0
  let notFound = 0
  
  for (const missingId of missingIds.slice(0, LIMIT)) {
    const edition = parseInt(missingId, 10)
    const metadataEntry = metadataByEdition[edition]
    
    console.log(`\n${'='.repeat(60)}`)
    console.log(`Missing ID: ${missingId}`)
    
    if (metadataEntry) {
      console.log(`  Local metadata:`)
      console.log(`    Name: ${metadataEntry.name}`)
      console.log(`    Edition: ${metadataEntry.edition}`)
      
      // Try searching MintGarden by name
      console.log(`  Searching MintGarden for "${metadataEntry.name}"...`)
      const searchResults = await searchMintGarden(metadataEntry.name)
      
      const matchingResults = searchResults.filter(item => {
        return item.collection_id === COLLECTION_ID &&
               (item.edition_number === edition || item.name === metadataEntry.name)
      })
      
      if (matchingResults.length > 0) {
        console.log(`  ✓ Found ${matchingResults.length} matching NFT(s) in MintGarden:`)
        for (const result of matchingResults) {
          console.log(`    - ${result.name} (Edition: ${result.edition_number || 'N/A'})`)
          console.log(`      Launcher: ${result.encoded_id}`)
          console.log(`      Collection: ${result.collection_name}`)
        }
        found++
      } else {
        console.log(`  ✗ Not found in MintGarden search`)
        notFound++
      }
    } else {
      console.log(`  ⚠ No local metadata found for edition ${edition}`)
      notFound++
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  
  console.log(`\n${'='.repeat(60)}`)
  console.log(`\nSummary:`)
  console.log(`  Total missing: ${mapData.missing_count}`)
  console.log(`  Investigated: ${LIMIT}`)
  console.log(`  Found in MintGarden: ${found}`)
  console.log(`  Not found: ${notFound}`)
  console.log(`\nPossible reasons for missing IDs:`)
  console.log(`  - NFTs not yet minted`)
  console.log(`  - NFTs in different collection`)
  console.log(`  - Name/edition mismatch`)
  console.log(`  - API pagination issues`)
}

main().catch(err => {
  console.error('\n✗ Error:', err)
  process.exit(1)
})



