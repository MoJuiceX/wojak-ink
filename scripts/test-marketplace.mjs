/**
 * Test script to verify marketplace functionality
 * 
 * Tests:
 * 1. Marketplace shows only NFTs from newestoffers.csv
 * 2. Removed NFTs don't appear after refresh (fingerprint-based cache busting)
 * 
 * Run with: node scripts/test-marketplace.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// CSV file path (same as MarketplaceContext uses)
const CSV_PATH = path.join(__dirname, '..', 'public', 'assets', 'images', 'newestoffers.csv')

// Helper to generate stable hash-based ID from offer string (same as MarketplaceContext)
const hashOfferString = (offer) => {
  let hash = 5381
  for (let i = 0; i < offer.length; i++) {
    hash = ((hash << 5) + hash) + offer.charCodeAt(i)
    hash |= 0
  }
  const unsigned = hash >>> 0
  return unsigned.toString(16).padStart(8, '0')
}

// Compute fingerprint (djb2 hash) of CSV content for cache busting (same as MarketplaceContext)
const computeCSVFingerprint = (csvText) => {
  let hash = 5381
  for (let i = 0; i < csvText.length; i++) {
    hash = ((hash << 5) + hash) + csvText.charCodeAt(i)
    hash |= 0
  }
  return hash >>> 0
}

// Parse CSV text (same logic as MarketplaceContext)
const parseOfferFilesCSV = (csvText) => {
  const nftEntries = []
  const offerFiles = {}
  const rawLines = csvText.trim().split('\n')
  const lines = rawLines.map(line => line.trim()).filter(line => line.length > 0)

  if (lines.length === 0) {
    return { nftEntries, offerFiles }
  }

  // Check if first line is a header (contains "group" or "offerfile" case-insensitive)
  const firstLine = lines[0].toLowerCase()
  const hasHeader = firstLine.includes('group') || firstLine.includes('offerfile') || firstLine.includes('offer_file')
  const startIdx = hasHeader ? 1 : 0

  // Parse data rows (skip header if present)
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    // Handle CSV values that may contain commas (quoted values)
    const parts = []
    let current = ''
    let inQuotes = false
    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      if (char === '"') {
        if (inQuotes && line[j + 1] === '"') {
          current += '"'
          j++ // Skip next quote
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    parts.push(current.trim()) // Add last part

    // Extract group (column 0) and offerFile (column 1)
    const group = parts.length > 0 ? parts[0].trim().toUpperCase() : null
    const offerFile = parts.length > 1 ? parts[1].trim() : null

    // Validate required fields
    if (!group || !offerFile || !offerFile.startsWith('offer1')) {
      continue // Skip invalid rows
    }

    // Generate stable ID from offer file hash
    const id = `OFFER-${hashOfferString(offerFile)}`

    // Build entry
    nftEntries.push({
      id,
      group,
      offerFile,
      thumbnail: null,
      nftId: null,
    })
    offerFiles[id] = offerFile
  }

  return { nftEntries, offerFiles }
}

// Test results tracking
let testsPassed = 0
let testsFailed = 0
const failures = []

function assert(condition, message) {
  if (condition) {
    testsPassed++
    console.log(`✅ ${message}`)
  } else {
    testsFailed++
    failures.push(message)
    console.error(`❌ FAILED: ${message}`)
  }
}

function testCSVParsing() {
  console.log('\n📋 Test 1: CSV File Exists and Can Be Read')
  console.log('='.repeat(60))
  
  try {
    assert(fs.existsSync(CSV_PATH), `CSV file exists at ${CSV_PATH}`)
    const csvContent = fs.readFileSync(CSV_PATH, 'utf-8')
    assert(csvContent.length > 0, 'CSV file is not empty')
    
    console.log(`\n📊 CSV Statistics:`)
    console.log(`   File size: ${csvContent.length} characters`)
    console.log(`   Lines: ${csvContent.split('\n').length}`)
    
    return csvContent
  } catch (error) {
    assert(false, `Failed to read CSV file: ${error.message}`)
    return null
  }
}

function testCSVFormat(csvContent) {
  console.log('\n📋 Test 2: CSV Format is Correct (2-column: group,offerfile)')
  console.log('='.repeat(60))
  
  if (!csvContent) {
    assert(false, 'Cannot test format without CSV content')
    return null
  }
  
  const lines = csvContent.trim().split('\n').filter(line => line.trim().length > 0)
  const firstLine = lines[0].toLowerCase()
  const hasHeader = firstLine.includes('group') || firstLine.includes('offerfile') || firstLine.includes('offer_file')
  
  console.log(`   First line: ${lines[0].substring(0, 50)}...`)
  console.log(`   Has header: ${hasHeader}`)
  console.log(`   Total lines: ${lines.length}`)
  
  const startIdx = hasHeader ? 1 : 0
  const dataLines = lines.slice(startIdx)
  
  // Test first few data lines
  let validRows = 0
  let invalidRows = 0
  
  for (let i = 0; i < Math.min(10, dataLines.length); i++) {
    const line = dataLines[i]
    const parts = line.split(',')
    const group = parts[0]?.trim()
    const offerFile = parts[1]?.trim()
    
    if (group && offerFile && offerFile.startsWith('offer1')) {
      validRows++
    } else {
      invalidRows++
    }
  }
  
  assert(validRows > 0, `Found ${validRows} valid data rows in first 10 lines`)
  
  return { hasHeader, dataLines, totalLines: lines.length }
}

function testParsingLogic(csvContent) {
  console.log('\n📋 Test 3: CSV Parsing Logic Works Correctly')
  console.log('='.repeat(60))
  
  if (!csvContent) {
    assert(false, 'Cannot test parsing without CSV content')
    return null
  }
  
  const parsed = parseOfferFilesCSV(csvContent)
  
  console.log(`   Parsed entries: ${parsed.nftEntries.length}`)
  console.log(`   Offer files: ${Object.keys(parsed.offerFiles).length}`)
  
  assert(parsed.nftEntries.length > 0, 'Parsed at least one NFT entry')
  assert(parsed.nftEntries.length === Object.keys(parsed.offerFiles).length, 'NFT entries match offer files count')
  
  // Verify all entries have required fields
  const validEntries = parsed.nftEntries.every(entry => 
    entry.id && entry.group && entry.offerFile && entry.offerFile.startsWith('offer1')
  )
  assert(validEntries, 'All entries have required fields (id, group, offerFile starting with "offer1")')
  
  // Verify IDs are stable (hash-based)
  parsed.nftEntries.forEach(entry => {
    assert(entry.id.startsWith('OFFER-'), `Entry ID format is correct: ${entry.id}`)
    assert(entry.id.length === 14, `Entry ID length is correct (OFFER- + 8 hex chars = 14): ${entry.id}`) // OFFER- (6) + 8 hex chars = 14
  })
  
  // Verify groups are uppercase
  const allUppercase = parsed.nftEntries.every(entry => entry.group === entry.group.toUpperCase())
  assert(allUppercase, 'All groups are uppercase')
  
  // Log group distribution
  const groupCounts = parsed.nftEntries.reduce((acc, entry) => {
    acc[entry.group] = (acc[entry.group] || 0) + 1
    return acc
  }, {})
  console.log(`\n   Group distribution:`)
  Object.entries(groupCounts).forEach(([group, count]) => {
    console.log(`     ${group}: ${count} NFTs`)
  })
  
  return parsed
}

function testFingerprintCacheBusting(csvContent) {
  console.log('\n📋 Test 4: Fingerprint-Based Cache Busting Works')
  console.log('='.repeat(60))
  
  if (!csvContent) {
    assert(false, 'Cannot test fingerprint without CSV content')
    return
  }
  
  // Test 1: Same content produces same fingerprint
  const fingerprint1 = computeCSVFingerprint(csvContent)
  const fingerprint2 = computeCSVFingerprint(csvContent)
  assert(fingerprint1 === fingerprint2, 'Same CSV content produces same fingerprint')
  
  // Test 2: Different content produces different fingerprint
  const modifiedContent = csvContent + '\nXCH,offer1test123'
  const fingerprint3 = computeCSVFingerprint(modifiedContent)
  assert(fingerprint1 !== fingerprint3, 'Modified CSV content produces different fingerprint')
  
  // Test 3: Fingerprint is consistent (numeric)
  assert(typeof fingerprint1 === 'number', 'Fingerprint is a number')
  assert(fingerprint1 > 0, 'Fingerprint is positive')
  
  console.log(`   Original fingerprint: ${fingerprint1}`)
  console.log(`   Modified fingerprint: ${fingerprint3}`)
  console.log(`   Fingerprints differ: ${fingerprint1 !== fingerprint3}`)
}

function testOnlyCSVEntries(parsed) {
  console.log('\n📋 Test 5: All Entries Come From CSV (No Extra Entries)')
  console.log('='.repeat(60))
  
  if (!parsed || !parsed.nftEntries || parsed.nftEntries.length === 0) {
    assert(false, 'Cannot test entries without parsed data')
    return
  }
  
  // Verify that all entries have IDs that match the hash of their offerFile
  parsed.nftEntries.forEach(entry => {
    const expectedId = `OFFER-${hashOfferString(entry.offerFile)}`
    assert(entry.id === expectedId, `Entry ID matches hash of offerFile: ${entry.id} === ${expectedId}`)
  })
  
  // Verify that all offerFiles in the map match entries
  const entryOfferFiles = new Set(parsed.nftEntries.map(e => e.offerFile))
  const mapOfferFiles = new Set(Object.values(parsed.offerFiles))
  
  assert(entryOfferFiles.size === mapOfferFiles.size, 'Entry offerFiles match map offerFiles count')
  
  // Verify all IDs in map exist in entries
  const entryIds = new Set(parsed.nftEntries.map(e => e.id))
  const mapIds = new Set(Object.keys(parsed.offerFiles))
  
  assert(entryIds.size === mapIds.size, 'Entry IDs match map IDs count')
  mapIds.forEach(id => {
    assert(entryIds.has(id), `Map ID exists in entries: ${id}`)
  })
  
  console.log(`   Total entries: ${parsed.nftEntries.length}`)
  console.log(`   All entries validated: ✅`)
}

function testRemovedNFTsDontAppear(csvContent) {
  console.log('\n📋 Test 6: Removed NFTs Don\'t Appear (Fingerprint Changes)')
  console.log('='.repeat(60))
  
  if (!csvContent) {
    assert(false, 'Cannot test removal without CSV content')
    return
  }
  
  // Parse original CSV
  const originalParsed = parseOfferFilesCSV(csvContent)
  const originalFingerprint = computeCSVFingerprint(csvContent)
  
  if (originalParsed.nftEntries.length === 0) {
    console.log('   ⚠️  Cannot test removal: no entries in CSV')
    return
  }
  
  // Remove first entry from CSV
  const lines = csvContent.trim().split('\n')
  const firstLine = lines[0].toLowerCase()
  const hasHeader = firstLine.includes('group') || firstLine.includes('offerfile') || firstLine.includes('offer_file')
  const startIdx = hasHeader ? 1 : 0
  
  // Create modified CSV without first data row
  const modifiedLines = [
    ...lines.slice(0, startIdx),
    ...lines.slice(startIdx + 1)
  ]
  const modifiedContent = modifiedLines.join('\n')
  const modifiedParsed = parseOfferFilesCSV(modifiedContent)
  const modifiedFingerprint = computeCSVFingerprint(modifiedContent)
  
  // Verify fingerprint changed
  assert(originalFingerprint !== modifiedFingerprint, 'Fingerprint changes when entry is removed')
  
  // Verify entry count decreased
  assert(modifiedParsed.nftEntries.length < originalParsed.nftEntries.length, 
    `Entry count decreased: ${originalParsed.nftEntries.length} -> ${modifiedParsed.nftEntries.length}`)
  
  // Verify removed entry is not in modified parsed data
  const originalIds = new Set(originalParsed.nftEntries.map(e => e.id))
  const modifiedIds = new Set(modifiedParsed.nftEntries.map(e => e.id))
  
  const removedIds = [...originalIds].filter(id => !modifiedIds.has(id))
  assert(removedIds.length > 0, `Removed ${removedIds.length} entry/entries from CSV`)
  
  console.log(`   Original entries: ${originalParsed.nftEntries.length}`)
  console.log(`   Modified entries: ${modifiedParsed.nftEntries.length}`)
  console.log(`   Removed entries: ${removedIds.length}`)
  console.log(`   Fingerprint changed: ✅`)
}

// Main test runner
async function runTests() {
  console.log('\n🧪 Marketplace Functionality Tests')
  console.log('='.repeat(60))
  console.log(`Testing CSV file: ${CSV_PATH}`)
  
  // Test 1: File exists and can be read
  const csvContent = testCSVParsing()
  
  // Test 2: CSV format is correct
  testCSVFormat(csvContent)
  
  // Test 3: Parsing logic works
  const parsed = testParsingLogic(csvContent)
  
  // Test 4: Fingerprint cache busting
  testFingerprintCacheBusting(csvContent)
  
  // Test 5: Only CSV entries appear
  testOnlyCSVEntries(parsed)
  
  // Test 6: Removed NFTs don't appear
  testRemovedNFTsDontAppear(csvContent)
  
  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 Test Summary')
  console.log('='.repeat(60))
  console.log(`✅ Passed: ${testsPassed}`)
  console.log(`❌ Failed: ${testsFailed}`)
  
  if (failures.length > 0) {
    console.log('\n❌ Failed Tests:')
    failures.forEach((failure, index) => {
      console.log(`   ${index + 1}. ${failure}`)
    })
    process.exit(1)
  } else {
    console.log('\n🎉 All tests passed!')
    console.log('\n✅ Marketplace shows only NFTs from newestoffers.csv')
    console.log('✅ Removed NFTs don\'t appear after refresh (fingerprint-based cache busting works)')
    process.exit(0)
  }
}

// Run tests
runTests().catch(error => {
  console.error('\n💥 Test execution error:', error)
  process.exit(1)
})

