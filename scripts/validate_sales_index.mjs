/**
 * Big Pulp: Validate Sales Index
 *
 * Validates the sales index output for data integrity and completeness.
 * Can be run pre-build (on known NFTs) or post-build (on full output).
 *
 * Usage:
 *   node scripts/validate_sales_index.mjs                    # Validate output file
 *   node scripts/validate_sales_index.mjs --pre-build        # Pre-build validation (test known NFTs)
 *   node scripts/validate_sales_index.mjs --post-build       # Post-build validation (validate output)
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const COLLECTION_ID = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah'
const MIN_SECONDARY_PRICE = 0.8

const FILES = {
  salesIndex: path.join(ROOT, 'public/assets/BigPulp/mintgarden_sales_index_v1.json'),
  launcherMap: path.join(ROOT, 'public/assets/BigPulp/mintgarden_launcher_map_runtime_v1.json'),
}

// Known NFTs with sales for validation
const KNOWN_SALES_TEST_NFTS = [
  { internalId: '1563', launcher: 'nft17g7mk773vsle96sgcc2ahvezqcth0y7gpftcmnm5mq8z8dhed9qqy2x3l4', expectedPrice: 3.3 },
]

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (err) {
    throw new Error(`Failed to read ${filePath}: ${err.message}`)
  }
}

// Pre-build validation: Test on known NFTs
async function preBuildValidation() {
  console.log('🔍 Pre-Build Validation: Testing on known NFTs...\n')
  
  if (typeof fetch === 'undefined') {
    console.error('✗ Error: global fetch is not available. This script requires Node.js 18+')
    process.exit(1)
  }
  
  const NFT_DETAILS_ENDPOINT = `https://api.mintgarden.io/nfts/{launcher}`
  let allPassed = true
  
  for (const testNft of KNOWN_SALES_TEST_NFTS) {
    console.log(`Testing NFT #${testNft.internalId} (${testNft.launcher})...`)
    
    try {
      const url = NFT_DETAILS_ENDPOINT.replace('{launcher}', testNft.launcher)
      const response = await fetch(url)
      
      if (!response.ok) {
        console.error(`  ✗ Failed to fetch: HTTP ${response.status}`)
        allPassed = false
        continue
      }
      
      const nftDetails = await response.json()
      
      // Check events array exists
      if (!nftDetails.events || !Array.isArray(nftDetails.events)) {
        console.error(`  ✗ No events array found`)
        allPassed = false
        continue
      }
      
      // Find trade events
      const trades = nftDetails.events.filter(e => e.type === 2)
      console.log(`  ✓ Found ${trades.length} trade events`)
      
      // Check for expected price
      const validTrades = trades.filter(t => {
        const price = t.xch_price
        return price !== null && price !== undefined && price >= MIN_SECONDARY_PRICE
      })
      
      console.log(`  ✓ Found ${validTrades.length} valid trades (>= ${MIN_SECONDARY_PRICE} XCH)`)
      
      if (testNft.expectedPrice) {
        const matchingTrade = validTrades.find(t => Math.abs(t.xch_price - testNft.expectedPrice) < 0.1)
        if (matchingTrade) {
          console.log(`  ✓ Found expected trade at ${matchingTrade.xch_price} XCH`)
        } else {
          console.warn(`  ⚠ Expected trade at ${testNft.expectedPrice} XCH not found`)
          if (validTrades.length > 0) {
            console.log(`     Found trades at: ${validTrades.map(t => t.xch_price).join(', ')} XCH`)
          }
        }
      }
      
    } catch (err) {
      console.error(`  ✗ Error: ${err.message}`)
      allPassed = false
    }
    
    console.log('')
  }
  
  if (allPassed) {
    console.log('✅ Pre-build validation passed!')
    return true
  } else {
    console.error('❌ Pre-build validation failed!')
    return false
  }
}

// Post-build validation: Validate output file
function postBuildValidation() {
  console.log('🔍 Post-Build Validation: Validating sales index output...\n')
  
  if (!fs.existsSync(FILES.salesIndex)) {
    console.error(`✗ Sales index file not found: ${FILES.salesIndex}`)
    console.error('  Run: npm run build:mintgarden-sales')
    return false
  }
  
  let salesIndex
  try {
    salesIndex = readJson(FILES.salesIndex)
  } catch (err) {
    console.error(`✗ Failed to read sales index: ${err.message}`)
    return false
  }
  
  const issues = []
  const warnings = []
  
  // Schema validation
  console.log('1. Schema Validation...')
  if (!salesIndex.schema_version) {
    issues.push('Missing schema_version')
  } else if (salesIndex.schema_version !== '1.0') {
    warnings.push(`Unexpected schema_version: ${salesIndex.schema_version} (expected 1.0)`)
  }
  
  if (!salesIndex.generated_at) {
    issues.push('Missing generated_at')
  }
  
  if (!salesIndex.collection_id) {
    issues.push('Missing collection_id')
  } else if (salesIndex.collection_id !== COLLECTION_ID) {
    warnings.push(`Collection ID mismatch: ${salesIndex.collection_id} (expected ${COLLECTION_ID})`)
  }
  
  if (salesIndex.events === undefined) {
    issues.push('Missing events array')
  } else if (!Array.isArray(salesIndex.events)) {
    issues.push('events is not an array')
  }
  
  if (issues.length === 0) {
    console.log('  ✓ Schema valid')
  } else {
    console.error(`  ✗ Schema issues: ${issues.join(', ')}`)
  }
  
  // Data validation
  console.log('\n2. Data Validation...')
  const events = salesIndex.events || []
  console.log(`  Total events: ${events.length}`)
  console.log(`  Mapped to internal IDs: ${salesIndex.count_mapped || 0}`)
  console.log(`  Valid prices: ${salesIndex.count_valid_prices || 0}`)
  
  if (events.length === 0) {
    warnings.push('No events found in output (this may be normal if no sales occurred)')
  }
  
  // Validate each event
  const eventIssues = []
  const priceStats = {
    min: null,
    max: null,
    values: [],
    belowThreshold: 0,
    invalid: 0,
  }
  
  const seenKeys = new Set()
  const duplicateKeys = []
  
  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    
    // Check required fields
    if (!event.launcher && !event.internal_id) {
      eventIssues.push(`Event ${i}: Missing both launcher and internal_id`)
    }
    
    // Check price
    if (event.price_xch === null || event.price_xch === undefined) {
      if (event.is_valid_price) {
        eventIssues.push(`Event ${i}: is_valid_price=true but price_xch is null`)
      }
    } else {
      const price = event.price_xch
      priceStats.values.push(price)
      
      if (price < MIN_SECONDARY_PRICE) {
        priceStats.belowThreshold++
      }
      
      if (price <= 0 || isNaN(price)) {
        priceStats.invalid++
        eventIssues.push(`Event ${i}: Invalid price: ${price}`)
      } else {
        if (priceStats.min === null || price < priceStats.min) {
          priceStats.min = price
        }
        if (priceStats.max === null || price > priceStats.max) {
          priceStats.max = price
        }
      }
    }
    
    // Check for duplicates
    const key = `${event.launcher || 'unknown'}|${event.timestamp || 'unknown'}|${event.raw?.event_index || 'unknown'}`
    if (seenKeys.has(key)) {
      duplicateKeys.push(`Event ${i}: Duplicate key: ${key}`)
    } else {
      seenKeys.add(key)
    }
    
    // Check flags
    if (!event.flags) {
      eventIssues.push(`Event ${i}: Missing flags object`)
    } else {
      if (typeof event.flags.same_owner !== 'boolean') {
        eventIssues.push(`Event ${i}: flags.same_owner is not boolean`)
      }
      if (typeof event.flags.extreme !== 'boolean') {
        eventIssues.push(`Event ${i}: flags.extreme is not boolean`)
      }
    }
  }
  
  if (eventIssues.length === 0 && duplicateKeys.length === 0) {
    console.log('  ✓ All events valid')
  } else {
    if (eventIssues.length > 0) {
      console.error(`  ✗ Event issues: ${eventIssues.length}`)
      if (eventIssues.length <= 10) {
        eventIssues.forEach(issue => console.error(`    - ${issue}`))
      } else {
        eventIssues.slice(0, 10).forEach(issue => console.error(`    - ${issue}`))
        console.error(`    ... and ${eventIssues.length - 10} more`)
      }
    }
    if (duplicateKeys.length > 0) {
      console.error(`  ✗ Duplicates found: ${duplicateKeys.length}`)
      if (duplicateKeys.length <= 5) {
        duplicateKeys.forEach(dup => console.error(`    - ${dup}`))
      }
    }
  }
  
  // Price statistics
  console.log('\n3. Price Statistics...')
  if (priceStats.values.length > 0) {
    priceStats.values.sort((a, b) => a - b)
    const median = priceStats.values[Math.floor(priceStats.values.length / 2)]
    const q25 = priceStats.values[Math.floor(priceStats.values.length * 0.25)]
    const q75 = priceStats.values[Math.floor(priceStats.values.length * 0.75)]
    
    console.log(`  Valid prices: ${priceStats.values.length}`)
    console.log(`  Min: ${priceStats.min?.toFixed(2)} XCH`)
    console.log(`  Q25: ${q25.toFixed(2)} XCH`)
    console.log(`  Median: ${median.toFixed(2)} XCH`)
    console.log(`  Q75: ${q75.toFixed(2)} XCH`)
    console.log(`  Max: ${priceStats.max?.toFixed(2)} XCH`)
    
    if (priceStats.belowThreshold > 0) {
      warnings.push(`${priceStats.belowThreshold} prices below ${MIN_SECONDARY_PRICE} XCH threshold`)
    }
    
    if (priceStats.invalid > 0) {
      issues.push(`${priceStats.invalid} invalid prices (<= 0 or NaN)`)
    }
  } else {
    warnings.push('No valid prices found')
  }
  
  // Compare with known sales
  console.log('\n4. Known Sales Check...')
  if (events.length > 0) {
    for (const testNft of KNOWN_SALES_TEST_NFTS) {
      const matchingEvents = events.filter(e => 
        e.internal_id === testNft.internalId || e.launcher === testNft.launcher
      )
      
      if (matchingEvents.length > 0) {
        console.log(`  ✓ Found ${matchingEvents.length} event(s) for NFT #${testNft.internalId}`)
        if (testNft.expectedPrice) {
          const matchingPrice = matchingEvents.find(e => 
            e.price_xch && Math.abs(e.price_xch - testNft.expectedPrice) < 0.1
          )
          if (matchingPrice) {
            console.log(`    ✓ Found expected price: ${matchingPrice.price_xch} XCH`)
          } else {
            warnings.push(`NFT #${testNft.internalId}: Expected price ${testNft.expectedPrice} XCH not found`)
            console.log(`    ⚠ Prices found: ${matchingEvents.map(e => e.price_xch).filter(Boolean).join(', ')} XCH`)
          }
        }
      } else {
        warnings.push(`NFT #${testNft.internalId}: Expected in output but not found`)
        console.log(`  ⚠ NFT #${testNft.internalId} not found in output`)
      }
    }
  } else {
    warnings.push('Cannot check known sales: no events in output')
  }
  
  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('Validation Summary')
  console.log('='.repeat(60))
  
  if (issues.length === 0 && warnings.length === 0) {
    console.log('✅ All validations passed!')
    return true
  }
  
  if (issues.length > 0) {
    console.error(`\n❌ Issues found (${issues.length}):`)
    issues.forEach(issue => console.error(`  - ${issue}`))
  }
  
  if (warnings.length > 0) {
    console.warn(`\n⚠ Warnings (${warnings.length}):`)
    warnings.forEach(warning => console.warn(`  - ${warning}`))
  }
  
  return issues.length === 0
}

async function main() {
  const args = process.argv.slice(2)
  const preBuild = args.includes('--pre-build')
  const postBuild = args.includes('--post-build')
  
  if (preBuild) {
    const passed = await preBuildValidation()
    process.exit(passed ? 0 : 1)
  } else if (postBuild) {
    const passed = postBuildValidation()
    process.exit(passed ? 0 : 1)
  } else {
    // Default: post-build validation
    const passed = postBuildValidation()
    process.exit(passed ? 0 : 1)
  }
}

main().catch(err => {
  console.error('\n✗ Fatal error:', err)
  console.error(err.stack)
  process.exit(1)
})


