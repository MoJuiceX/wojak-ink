/**
 * Big Pulp: Build Combo Explorer Index
 *
 * Generates combo_index_v1/ files for the Combo Explorer feature.
 *
 * Inputs:
 * - public/Wojak_Farmers_Plot_metadata_FIXED DRAC.json (PRIMARY source for traits)
 * - public/nftRarityData.json (ONLY for rank mapping)
 *
 * Outputs:
 * - public/assets/BigPulp/combo_index_v1/inverted_index.json
 * - public/assets/BigPulp/combo_index_v1/pair_counts.json
 * - public/assets/BigPulp/combo_index_v1/partner_index.json
 * - public/assets/BigPulp/combo_index_v1/trait_catalog.json
 * - public/assets/BigPulp/combo_index_v1/traits_by_nft_XXXX_YYYY.json (42 shard files)
 *
 * Usage:
 *   node scripts/build_bigpulp_combo_index.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const FILES = {
  metadata: path.join(ROOT, 'public/Wojak_Farmers_Plot_metadata_FIXED DRAC.json'),
  rarityData: path.join(ROOT, 'public/nftRarityData.json'),
  outputDir: path.join(ROOT, 'public/assets/BigPulp/combo_index_v1'),
}

// Category mapping from metadata trait_type to internal keys
const CATEGORY_MAP = {
  'Base': 'base',
  'Face': 'face',
  'Mouth': 'mouth',
  'Face Wear': 'facewear',
  'Head': 'head',
  'Clothes': 'clothes',
  'Background': 'background',
}

const CATEGORIES = ['base', 'face', 'mouth', 'facewear', 'head', 'clothes', 'background']

// Maximum global count for pairs to include (Hunter Mode max is 25)
const MAX_PAIR_COUNT = 25

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (err) {
    throw new Error(`Failed to read ${filePath}: ${err.message}`)
  }
}

function writeJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8')
  } catch (err) {
    throw new Error(`Failed to write ${filePath}: ${err.message}`)
  }
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

// Normalize trait value (preserve case, trim, consistent spacing)
function normalizeTrait(trait) {
  if (!trait || typeof trait !== 'string') return 'None'
  return trait.trim().replace(/\s+/g, ' ')
}

// Generate trait key: category::traitValue
function generateTraitKey(category, traitValue) {
  return `${category}::${normalizeTrait(traitValue)}`
}

// Generate pair key (order-independent)
function generatePairKey(traitKey1, traitKey2) {
  const sorted = [traitKey1, traitKey2].sort()
  return sorted.join('||')
}

function main() {
  console.log('[Big Pulp] Building combo explorer index...\n')

  // Read input files
  let metadata, rarityData
  try {
    metadata = readJson(FILES.metadata)
    console.log('✓ Read Wojak_Farmers_Plot_metadata_FIXED DRAC.json')
  } catch (err) {
    console.error('✗ Failed to read metadata:', err.message)
    process.exit(1)
  }

  try {
    rarityData = readJson(FILES.rarityData)
    console.log('✓ Read nftRarityData.json')
  } catch (err) {
    console.error('✗ Failed to read nftRarityData.json:', err.message)
    process.exit(1)
  }

  // Ensure output directory exists
  ensureDir(FILES.outputDir)

  // Step 1: Extract and normalize all NFT data
  console.log('\n[Step 1] Extracting and normalizing NFT data...')
  const nftData = new Map() // nftId -> { rank, image, traits: { base, face, ... } }
  const invertedIndex = new Map() // traitKey -> Set of nftIds
  const traitCounts = new Map() // traitKey -> count

  for (const nft of metadata) {
    if (!nft.edition || !nft.attributes) continue

    const nftId = String(nft.edition)
    const traits = {}
    let hasAllTraits = true

    // Extract traits from attributes
    for (const attr of nft.attributes) {
      if (!attr.trait_type || !attr.value) continue
      const internalCategory = CATEGORY_MAP[attr.trait_type]
      if (internalCategory) {
        traits[internalCategory] = normalizeTrait(attr.value)
      }
    }

    // Check if all 7 categories are present
    for (const cat of CATEGORIES) {
      if (!traits[cat]) {
        hasAllTraits = false
        break
      }
    }

    if (!hasAllTraits) {
      console.warn(`⚠ NFT #${nftId} missing some traits, skipping`)
      continue
    }

    // Get rank from rarityData
    let rank = null
    if (rarityData[nftId] && Array.isArray(rarityData[nftId]) && rarityData[nftId].length > 0) {
      rank = rarityData[nftId][0]
    }

    // Store NFT data
    nftData.set(nftId, {
      rank,
      image: nft.image || null,
      traits,
    })

    // Build inverted index and trait counts
    for (const [category, traitValue] of Object.entries(traits)) {
      const traitKey = generateTraitKey(category, traitValue)
      
      if (!invertedIndex.has(traitKey)) {
        invertedIndex.set(traitKey, new Set())
      }
      invertedIndex.get(traitKey).add(nftId)
      
      traitCounts.set(traitKey, (traitCounts.get(traitKey) || 0) + 1)
    }
  }

  console.log(`  Processed ${nftData.size} NFTs`)
  console.log(`  Unique traits: ${invertedIndex.size}`)

  // Step 2: Build pair counts
  console.log('\n[Step 2] Building pair counts...')
  const pairCounts = new Map() // pairKey -> { global: count }

  for (const [nftId, { traits }] of nftData.entries()) {
    const traitKeys = []
    for (const [category, traitValue] of Object.entries(traits)) {
      traitKeys.push(generateTraitKey(category, traitValue))
    }

    // Generate all cross-category pairs (C(7,2) = 21)
    for (let i = 0; i < traitKeys.length; i++) {
      for (let j = i + 1; j < traitKeys.length; j++) {
        const traitKey1 = traitKeys[i]
        const traitKey2 = traitKeys[j]
        
        // Extract categories to ensure cross-category only
        const cat1 = traitKey1.split('::')[0]
        const cat2 = traitKey2.split('::')[0]
        
        if (cat1 !== cat2) {
          const pairKey = generatePairKey(traitKey1, traitKey2)
          pairCounts.set(pairKey, (pairCounts.get(pairKey) || 0) + 1)
        }
      }
    }
  }

  // Filter to pairs with global <= MAX_PAIR_COUNT
  const filteredPairCounts = new Map()
  for (const [pairKey, count] of pairCounts.entries()) {
    if (count <= MAX_PAIR_COUNT) {
      filteredPairCounts.set(pairKey, { global: count })
    }
  }

  console.log(`  Total pairs: ${pairCounts.size}`)
  console.log(`  Filtered pairs (<=${MAX_PAIR_COUNT}): ${filteredPairCounts.size}`)

  // Step 3: Build partner index
  console.log('\n[Step 3] Building partner index...')
  const partnerIndex = new Map() // traitKey -> [{ traitKey, global }, ...]

  for (const [pairKey, { global }] of filteredPairCounts.entries()) {
    const [traitKey1, traitKey2] = pairKey.split('||')
    
    if (!partnerIndex.has(traitKey1)) {
      partnerIndex.set(traitKey1, [])
    }
    if (!partnerIndex.has(traitKey2)) {
      partnerIndex.set(traitKey2, [])
    }

    partnerIndex.get(traitKey1).push({ traitKey: traitKey2, global })
    partnerIndex.get(traitKey2).push({ traitKey: traitKey1, global })
  }

  // Sort partner arrays by global asc then traitKey asc
  for (const [traitKey, partners] of partnerIndex.entries()) {
    partners.sort((a, b) => {
      if (a.global !== b.global) return a.global - b.global
      return a.traitKey.localeCompare(b.traitKey)
    })
  }

  console.log(`  Traits with partners: ${partnerIndex.size}`)

  // Step 4: Build trait catalog
  console.log('\n[Step 4] Building trait catalog...')
  const traitCatalog = {}
  for (const cat of CATEGORIES) {
    traitCatalog[cat] = []
  }

  for (const [traitKey, count] of traitCounts.entries()) {
    const [category, traitValue] = traitKey.split('::')
    if (traitCatalog[category]) {
      traitCatalog[category].push({ trait: traitValue, count })
    }
  }

  // Sort by count asc then name asc (rarer first)
  for (const cat of CATEGORIES) {
    traitCatalog[cat].sort((a, b) => {
      if (a.count !== b.count) return a.count - b.count
      return a.trait.localeCompare(b.trait)
    })
  }

  console.log(`  Traits per category: ${Object.entries(traitCatalog).map(([k, v]) => `${k}:${v.length}`).join(', ')}`)

  // Step 5: Build sharded traits files
  console.log('\n[Step 5] Building sharded traits files...')
  const SHARD_SIZE = 100
  const shards = new Map() // rangeKey -> { range: [start, end], nfts: {} }

  for (const [nftId, data] of nftData.entries()) {
    const idNum = parseInt(nftId, 10)
    if (isNaN(idNum)) continue

    const shardStart = Math.floor((idNum - 1) / SHARD_SIZE) * SHARD_SIZE + 1
    const shardEnd = Math.min(shardStart + SHARD_SIZE - 1, 4200)
    const rangeKey = `${String(shardStart).padStart(4, '0')}_${String(shardEnd).padStart(4, '0')}`

    if (!shards.has(rangeKey)) {
      shards.set(rangeKey, {
        range: [shardStart, shardEnd],
        nfts: {},
      })
    }

    shards.get(rangeKey).nfts[nftId] = {
      rank: data.rank,
      image: data.image,
      traits: data.traits,
    }
  }

  console.log(`  Created ${shards.size} shard files`)

  // Step 6: Write all output files
  console.log('\n[Step 6] Writing output files...')
  const generatedAt = new Date().toISOString()

  // Write inverted index
  const invertedIndexObj = {
    schema_version: '1.0',
    generated_at: generatedAt,
    categories: CATEGORIES,
    traits: {},
    trait_counts: {},
  }

  for (const [traitKey, nftIdSet] of invertedIndex.entries()) {
    const sortedIds = Array.from(nftIdSet).sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
    invertedIndexObj.traits[traitKey] = sortedIds
    invertedIndexObj.trait_counts[traitKey] = traitCounts.get(traitKey)
  }

  writeJson(path.join(FILES.outputDir, 'inverted_index.json'), invertedIndexObj)
  console.log('  ✓ inverted_index.json')

  // Write pair counts
  const pairCountsObj = {
    schema_version: '1.0',
    generated_at: generatedAt,
    pairs: Object.fromEntries(filteredPairCounts),
  }
  writeJson(path.join(FILES.outputDir, 'pair_counts.json'), pairCountsObj)
  console.log('  ✓ pair_counts.json')

  // Write partner index
  const partnerIndexObj = {
    schema_version: '1.0',
    generated_at: generatedAt,
    partners: Object.fromEntries(partnerIndex),
  }
  writeJson(path.join(FILES.outputDir, 'partner_index.json'), partnerIndexObj)
  console.log('  ✓ partner_index.json')

  // Write trait catalog
  const traitCatalogObj = {
    schema_version: '1.0',
    categories: traitCatalog,
  }
  writeJson(path.join(FILES.outputDir, 'trait_catalog.json'), traitCatalogObj)
  console.log('  ✓ trait_catalog.json')

  // Write sharded traits files
  for (const [rangeKey, shardData] of shards.entries()) {
    const shardObj = {
      schema_version: '1.0',
      range: shardData.range,
      nfts: shardData.nfts,
    }
    const filename = `traits_by_nft_${rangeKey}.json`
    writeJson(path.join(FILES.outputDir, filename), shardObj)
  }
  console.log(`  ✓ ${shards.size} shard files`)

  console.log('\n✅ Combo explorer index build complete!')
  console.log(`   Output directory: ${FILES.outputDir}`)
}

main()




