/**
 * Investigate MintGarden Launcher Map Conflicts
 * 
 * Analyzes conflicts from mintgarden_launcher_map_v1.json to understand
 * why the same edition number appears with multiple launcher IDs.
 * 
 * Usage:
 *   node scripts/investigate_mintgarden_conflicts.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const MAP_FILE = path.join(ROOT, 'public/assets/BigPulp/mintgarden_launcher_map_v1.json')

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (err) {
    throw new Error(`Failed to read ${filePath}: ${err.message}`)
  }
}

async function fetchNFT(launcherId) {
  try {
    const response = await fetch(`https://api.mintgarden.io/nfts/${launcherId}`)
    if (!response.ok) return null
    return await response.json()
  } catch (err) {
    return null
  }
}

async function main() {
  console.log('[Investigate] Loading map file...\n')
  
  const mapData = readJson(MAP_FILE)
  const conflicts = mapData.conflicts || []
  
  if (conflicts.length === 0) {
    console.log('✓ No conflicts found!')
    return
  }
  
  console.log(`Found ${conflicts.length} conflicts:\n`)
  
  // Group conflicts by ID for better analysis
  const conflictsById = {}
  for (const conflict of conflicts) {
    if (!conflictsById[conflict.id]) {
      conflictsById[conflict.id] = []
    }
    conflictsById[conflict.id].push(conflict)
  }
  
  console.log(`Unique conflicted IDs: ${Object.keys(conflictsById).length}\n`)
  console.log('Investigating first 5 conflicts...\n')
  
  // Investigate first 5 conflicts in detail
  let investigated = 0
  for (const conflict of conflicts.slice(0, 5)) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`Conflict #${investigated + 1}: Edition ${conflict.id}`)
    console.log(`  Launcher A: ${conflict.launcherA}`)
    console.log(`  Launcher B: ${conflict.launcherB}`)
    console.log(`  Source: ${conflict.sourceHints.method}`)
    
    // Fetch details for both launchers
    console.log('\n  Fetching NFT details...')
    const [nftA, nftB] = await Promise.all([
      fetchNFT(conflict.launcherA),
      fetchNFT(conflict.launcherB)
    ])
    
    if (nftA) {
      console.log(`\n  Launcher A Details:`)
      console.log(`    Name: ${nftA.name || 'N/A'}`)
      console.log(`    Edition: ${nftA.edition_number || 'N/A'}`)
      console.log(`    Collection: ${nftA.collection_name || 'N/A'}`)
      console.log(`    Owner: ${nftA.owner_name || nftA.owner_address_encoded_id || 'N/A'}`)
    }
    
    if (nftB) {
      console.log(`\n  Launcher B Details:`)
      console.log(`    Name: ${nftB.name || 'N/A'}`)
      console.log(`    Edition: ${nftB.edition_number || 'N/A'}`)
      console.log(`    Collection: ${nftB.collection_name || 'N/A'}`)
      console.log(`    Owner: ${nftB.owner_name || nftB.owner_address_encoded_id || 'N/A'}`)
    }
    
    // Check if they're the same NFT
    if (nftA && nftB) {
      if (nftA.encoded_id === nftB.encoded_id) {
        console.log(`\n  ⚠ Same NFT returned twice (API duplicate)`)
      } else if (nftA.name === nftB.name && nftA.edition_number === nftB.edition_number) {
        console.log(`\n  ⚠ Different NFTs with same edition number (data integrity issue)`)
      } else {
        console.log(`\n  ⚠ Different NFTs (likely data issue)`)
      }
    }
    
    investigated++
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  console.log(`\n${'='.repeat(60)}`)
  console.log(`\nSummary:`)
  console.log(`  Total conflicts: ${conflicts.length}`)
  console.log(`  Unique conflicted IDs: ${Object.keys(conflictsById).length}`)
  console.log(`  Investigated: ${investigated}`)
  console.log(`\nTo investigate all conflicts, modify the script to remove the .slice(0, 5) limit`)
}

main().catch(err => {
  console.error('\n✗ Error:', err)
  process.exit(1)
})



