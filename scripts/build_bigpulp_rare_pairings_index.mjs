/**
 * Big Pulp: Build Rare Pairings Index
 *
 * Generates rare_pairings_index_v1.json and sharded family files for the Rare Pairings Explorer.
 *
 * Inputs:
 * - public/nftRarityData.json (single source of truth for traits)
 * - public/assets/BigPulp/all_nft_analysis.json (for rank and S-tier data)
 *
 * Outputs:
 * - public/assets/BigPulp/rare_pairings_index_v1.json (main index, small)
 * - public/assets/BigPulp/pair_families_v1/XX.json (256 shard files, 00-ff)
 *
 * Usage:
 *   node scripts/build_bigpulp_rare_pairings_index.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const FILES = {
  rarityData: path.join(ROOT, 'public/nftRarityData.json'),
  analysis: path.join(ROOT, 'public/assets/BigPulp/all_nft_analysis.json'),
  outputIndex: path.join(ROOT, 'public/assets/BigPulp/rare_pairings_index_v1.json'),
  familiesDir: path.join(ROOT, 'public/assets/BigPulp/pair_families_v1'),
}

// Category configuration
const CATEGORIES = ['base', 'clothes', 'head', 'face', 'mouth', 'facewear']
const CATEGORY_INDICES = [3, 8, 7, 4, 5, 6] // base, clothes, head, face, mouth, face_wear
const CATEGORY_LABELS = {
  base: 'Base',
  clothes: 'Clothes',
  head: 'Head',
  face: 'Face',
  mouth: 'Mouth',
  facewear: 'Face Wear'
}

// Maximum pairs per group (to keep JSON file size manageable)
// Set to 50 to show most combinations while preventing file size issues
// Note: JavaScript JSON.stringify has a string length limit (~256MB), so we need this limit
const MAX_PAIRS_PER_GROUP = 50

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

// djb2 hash function (same as codebase)
function hashString(str) {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i)
    hash |= 0
  }
  return hash >>> 0
}

function getShardPrefix(str) {
  const hash = hashString(str)
  const hex = hash.toString(16).padStart(8, '0')
  return hex.substring(0, 2).toLowerCase()
}

// Normalize trait string
function normalizeTrait(trait) {
  if (!trait || typeof trait !== 'string') return 'None'
  return trait.trim()
    .replace(/\s+/g, ' ') // replace multiple spaces with single
    .replace(/[""]/g, '"') // normalize quotes
    .replace(/['']/g, "'") // normalize apostrophes
    .replace(/[-–—]/g, '-') // normalize dashes
}

// Build S-tier trait set for provenance bonus
function buildSTierTraitSet(analysis) {
  const sTierSet = new Set()
  for (const nftId in analysis) {
    const nft = analysis[nftId]
    if (nft?.s_tier_traits) {
      for (const st of nft.s_tier_traits) {
        if (st?.trait && st?.category) {
          // Store as "category:trait" for lookup
          const key = `${st.category.toLowerCase()}:${normalizeTrait(st.trait)}`
          sTierSet.add(key)
        }
      }
    }
  }
  return sTierSet
}

// Check if pair has provenance bonus
function hasProvenanceBonus(pair1, pair2, sTierSet) {
  const key1 = `${pair1.category.toLowerCase()}:${normalizeTrait(pair1.trait)}`
  const key2 = `${pair2.category.toLowerCase()}:${normalizeTrait(pair2.trait)}`
  return sTierSet.has(key1) || sTierSet.has(key2)
}

// Generate pairKey (order-independent)
function generatePairKey(cat1, trait1, cat2, trait2) {
  const part1 = `${cat1}:${normalizeTrait(trait1)}`
  const part2 = `${cat2}:${normalizeTrait(trait2)}`
  const parts = [part1, part2].sort()
  return parts.join('||')
}

function main() {
  console.log('[Big Pulp] Building rare pairings index...\n')

  // Read input files
  let rarityData, analysis
  try {
    rarityData = readJson(FILES.rarityData)
    console.log('✓ Read nftRarityData.json')
  } catch (err) {
    console.error('✗ Failed to read nftRarityData.json:', err.message)
    process.exit(1)
  }

  try {
    analysis = readJson(FILES.analysis)
    console.log('✓ Read all_nft_analysis.json')
  } catch (err) {
    console.error('✗ Failed to read all_nft_analysis.json:', err.message)
    process.exit(1)
  }

  // Build S-tier trait set
  const sTierSet = buildSTierTraitSet(analysis)
  console.log(`✓ Built S-tier trait set (${sTierSet.size} traits)`)

  // Step 1: Extract and normalize traits
  console.log('\n[Step 1] Extracting and normalizing traits...')
  const nftTraits = new Map() // nftId -> {traits: [...], original: [...]}
  const normalizationReport = {
    traits_normalized: 0,
    missing_traits_filled: 0,
    examples: []
  }

  const uniqueTraitsPerCategory = {
    base: new Set(),
    clothes: new Set(),
    head: new Set(),
    face: new Set(),
    mouth: new Set(),
    facewear: new Set()
  }

  for (let nftId = 1; nftId <= 4200; nftId++) {
    const idStr = String(nftId)
    const rarity = rarityData[idStr]
    
    if (!Array.isArray(rarity) || rarity.length < 10) {
      normalizationReport.missing_traits_filled++
      // Fill with "None"
      const traits = CATEGORIES.map(() => ({ normalized: 'None', original: 'None' }))
      nftTraits.set(idStr, { traits, original: traits })
      continue
    }

    const traits = []
    const original = []
    let normalized = false

    for (let i = 0; i < CATEGORIES.length; i++) {
      const cat = CATEGORIES[i]
      const idx = CATEGORY_INDICES[i]
      const rawValue = String(rarity[idx] || '').trim()
      
      if (!rawValue) {
        normalizationReport.missing_traits_filled++
        traits.push({ normalized: 'None', original: 'None' })
        original.push('None')
      } else {
        const normalizedValue = normalizeTrait(rawValue)
        if (normalizedValue !== rawValue) {
          normalized = true
        }
        traits.push({ normalized: normalizedValue, original: rawValue })
        original.push(rawValue)
        uniqueTraitsPerCategory[cat].add(normalizedValue)
      }
    }

    if (normalized) {
      normalizationReport.traits_normalized++
      if (normalizationReport.examples.length < 10) {
        normalizationReport.examples.push({
          nftId: idStr,
          original,
          normalized: traits.map(t => t.normalized)
        })
      }
    }

    nftTraits.set(idStr, { traits, original })
  }

  console.log(`  Processed ${nftTraits.size} NFTs`)
  console.log(`  Traits normalized: ${normalizationReport.traits_normalized}`)
  console.log(`  Missing traits filled: ${normalizationReport.missing_traits_filled}`)

  // Step 2: Build global pair counts
  console.log('\n[Step 2] Building global pair counts...')
  const globalPairCounts = new Map() // pairKey -> count
  const pairToNfts = new Map() // pairKey -> Set of nftIds

  for (const [nftId, { traits }] of nftTraits.entries()) {
    // Generate all unordered pairs (C(6,2) = 15)
    for (let i = 0; i < traits.length; i++) {
      for (let j = i + 1; j < traits.length; j++) {
        const trait1 = traits[i]
        const trait2 = traits[j]

        // Skip if either is "None"
        if (trait1.normalized === 'None' || trait2.normalized === 'None') {
          continue
        }

        const cat1 = CATEGORIES[i]
        const cat2 = CATEGORIES[j]
        const pairKey = generatePairKey(cat1, trait1.normalized, cat2, trait2.normalized)

        globalPairCounts.set(pairKey, (globalPairCounts.get(pairKey) || 0) + 1)
        
        if (!pairToNfts.has(pairKey)) {
          pairToNfts.set(pairKey, new Set())
        }
        pairToNfts.get(pairKey).add(nftId)
      }
    }
  }

  console.log(`  Total unique pairs: ${globalPairCounts.size}`)

  // Step 3: Build group membership
  console.log('\n[Step 3] Building group membership...')
  const primaryGroups = {} // category -> {traitValue -> [nftIds]}
  const drilldownGroups = {} // "cat1__cat2" -> {"trait1::trait2" -> [nftIds]}

  // Initialize primary groups
  for (const cat of CATEGORIES) {
    primaryGroups[cat] = {}
  }

  // Initialize drilldown groups
  for (let i = 0; i < CATEGORIES.length; i++) {
    for (let j = 0; j < CATEGORIES.length; j++) {
      if (i !== j) {
        const key = `${CATEGORIES[i]}__${CATEGORIES[j]}`
        drilldownGroups[key] = {}
      }
    }
  }

  // Populate primary groups
  for (const [nftId, { traits }] of nftTraits.entries()) {
    for (let i = 0; i < CATEGORIES.length; i++) {
      const cat = CATEGORIES[i]
      const traitValue = traits[i].normalized
      if (traitValue !== 'None') {
        if (!primaryGroups[cat][traitValue]) {
          primaryGroups[cat][traitValue] = []
        }
        primaryGroups[cat][traitValue].push(nftId)
      }
    }
  }

  // Populate drilldown groups
  for (const [nftId, { traits }] of nftTraits.entries()) {
    for (let i = 0; i < CATEGORIES.length; i++) {
      for (let j = 0; j < CATEGORIES.length; j++) {
        if (i !== j) {
          const key = `${CATEGORIES[i]}__${CATEGORIES[j]}`
          const trait1 = traits[i].normalized
          const trait2 = traits[j].normalized
          if (trait1 !== 'None' && trait2 !== 'None') {
            const subgroupKey = `${trait1}::${trait2}`
            if (!drilldownGroups[key][subgroupKey]) {
              drilldownGroups[key][subgroupKey] = []
            }
            drilldownGroups[key][subgroupKey].push(nftId)
          }
        }
      }
    }
  }

  // Filter drilldown groups with count < 5 (keep at least 5 NFTs per subgroup to reduce data size)
  // This filters out very rare combinations while keeping most pairs
  for (const key in drilldownGroups) {
    for (const subgroupKey in drilldownGroups[key]) {
      if (drilldownGroups[key][subgroupKey].length < 5) {
        delete drilldownGroups[key][subgroupKey]
      }
    }
  }

  console.log(`  Primary groups: ${Object.keys(primaryGroups).length} categories`)
  for (const cat of CATEGORIES) {
    console.log(`    ${cat}: ${Object.keys(primaryGroups[cat]).length} groups`)
  }

  // Step 4: Build in-group pair counts and sort by global rarity
  console.log('\n[Step 4] Computing pairs per group...')
  const views = {
    primary: {},
    drilldown: {}
  }

  // Process primary groups
  for (const cat of CATEGORIES) {
    views.primary[cat] = {}
    
    for (const [traitValue, nftIds] of Object.entries(primaryGroups[cat])) {
      // Count pairs within this group
      const groupPairCounts = new Map() // pairKey -> count
      const pairToBestExample = new Map() // pairKey -> {nftId, rank}

      for (const nftId of nftIds) {
        const { traits } = nftTraits.get(nftId)
        const nftRank = analysis[nftId]?.rank || 999999

        // Generate pairs for this NFT
        for (let i = 0; i < traits.length; i++) {
          for (let j = i + 1; j < traits.length; j++) {
            const trait1 = traits[i]
            const trait2 = traits[j]

            if (trait1.normalized === 'None' || trait2.normalized === 'None') {
              continue
            }

            const cat1 = CATEGORIES[i]
            const cat2 = CATEGORIES[j]
            const pairKey = generatePairKey(cat1, trait1.normalized, cat2, trait2.normalized)

            groupPairCounts.set(pairKey, (groupPairCounts.get(pairKey) || 0) + 1)

            // Track best example (lowest rank, then lowest numeric id)
            if (!pairToBestExample.has(pairKey)) {
              pairToBestExample.set(pairKey, { nftId, rank: nftRank })
            } else {
              const current = pairToBestExample.get(pairKey)
              if (nftRank < current.rank || (nftRank === current.rank && parseInt(nftId) < parseInt(current.nftId))) {
                pairToBestExample.set(pairKey, { nftId, rank: nftRank })
              }
            }
          }
        }
      }

      // Build pairs array
      const scoredPairs = []
      for (const [pairKey, inGroupCount] of groupPairCounts.entries()) {
        const globalCount = globalPairCounts.get(pairKey) || 0
        const bestExample = pairToBestExample.get(pairKey)
        
        // Parse pairKey to get categories and traits
        const [part1, part2] = pairKey.split('||')
        const [cat1, trait1Norm] = part1.split(':')
        const [cat2, trait2Norm] = part2.split(':')

        // Find original traits for display
        let trait1Orig = trait1Norm
        let trait2Orig = trait2Norm
        for (const nftId of nftIds) {
          const { traits, original } = nftTraits.get(nftId)
          const idx1 = CATEGORIES.indexOf(cat1)
          const idx2 = CATEGORIES.indexOf(cat2)
          if (traits[idx1]?.normalized === trait1Norm && traits[idx2]?.normalized === trait2Norm) {
            trait1Orig = original[idx1]
            trait2Orig = original[idx2]
            break
          }
        }

        scoredPairs.push({
          pairKey,
          globalCount,
          inGroupCount,
          bestExample: bestExample.nftId,
          rank: bestExample.rank,
          pairs: [
            { category: CATEGORY_LABELS[cat1], trait: trait1Orig },
            { category: CATEGORY_LABELS[cat2], trait: trait2Orig }
          ]
        })
      }

      // Sort by global count ASC (rarest first), then tie-breakers
      scoredPairs.sort((a, b) => {
        if (a.globalCount !== b.globalCount) return a.globalCount - b.globalCount // ASC (rarest first)
        if (a.inGroupCount !== b.inGroupCount) return a.inGroupCount - b.inGroupCount // ASC
        if (a.rank !== b.rank) return a.rank - b.rank // ASC
        return a.pairKey.localeCompare(b.pairKey) // stable sort
      })

      const nftIdsSet = new Set(nftIds)
      const allPairs = scoredPairs.slice(0, MAX_PAIRS_PER_GROUP).map(p => {
        // Get family arrays
        const familyGlobalRaw = Array.from(pairToNfts.get(p.pairKey) || [])
        const familyGlobalSorted = familyGlobalRaw.sort((a, b) => parseInt(a) - parseInt(b))
        
        // Handle truncation if > 200
        let familyGlobal = familyGlobalSorted
        let familyTruncated = false
        let familyTotalGlobal = familyGlobalSorted.length
        if (familyGlobalSorted.length > 200) {
          familyGlobal = familyGlobalSorted.slice(0, 200)
          familyTruncated = true
        }
        
        // Filter to group members
        const familyInGroup = familyGlobalSorted.filter(id => nftIdsSet.has(id))
        
        // Build pair label
        const pairLabel = `${p.pairs[0].trait} + ${p.pairs[1].trait}`
        
        return {
          nftId: p.bestExample,
          rank: p.rank,
          group_label: traitValue,
          pairs: p.pairs,
          pair_key: p.pairKey,
          pairKey: p.pairKey, // Keep for backward compatibility
          pair_label: pairLabel,
          pair_count_global: p.globalCount,
          pair_count_in_group: p.inGroupCount,
          family_global: familyGlobal,
          family_in_group: familyInGroup,
          ...(familyTruncated ? { family_truncated: true, family_total_global: familyTotalGlobal } : {})
        }
      })

      views.primary[cat][traitValue] = {
        label: traitValue,
        count: nftIds.length,
        items: allPairs
      }
    }
  }

  // Process drilldown groups (similar logic)
  for (const [ddKey, subgroups] of Object.entries(drilldownGroups)) {
    views.drilldown[ddKey] = {}
    
    for (const [subgroupKey, nftIds] of Object.entries(subgroups)) {
      const [trait1, trait2] = subgroupKey.split('::')
      const [primaryCat, drillCat] = ddKey.split('__')

      // Count pairs within this subgroup
      const groupPairCounts = new Map()
      const pairToBestExample = new Map()

      for (const nftId of nftIds) {
        const { traits } = nftTraits.get(nftId)
        const nftRank = analysis[nftId]?.rank || 999999

        for (let i = 0; i < traits.length; i++) {
          for (let j = i + 1; j < traits.length; j++) {
            const trait1val = traits[i]
            const trait2val = traits[j]

            if (trait1val.normalized === 'None' || trait2val.normalized === 'None') {
              continue
            }

            const cat1 = CATEGORIES[i]
            const cat2 = CATEGORIES[j]
            const pairKey = generatePairKey(cat1, trait1val.normalized, cat2, trait2val.normalized)

            groupPairCounts.set(pairKey, (groupPairCounts.get(pairKey) || 0) + 1)

            if (!pairToBestExample.has(pairKey)) {
              pairToBestExample.set(pairKey, { nftId, rank: nftRank })
            } else {
              const current = pairToBestExample.get(pairKey)
              if (nftRank < current.rank || (nftRank === current.rank && parseInt(nftId) < parseInt(current.nftId))) {
                pairToBestExample.set(pairKey, { nftId, rank: nftRank })
              }
            }
          }
        }
      }

      // Sort by global count ASC (rarest first), then tie-breakers
      const scoredPairs = []
      for (const [pairKey, inGroupCount] of groupPairCounts.entries()) {
        const globalCount = globalPairCounts.get(pairKey) || 0
        const bestExample = pairToBestExample.get(pairKey)
        
        const [part1, part2] = pairKey.split('||')
        const [cat1, trait1Norm] = part1.split(':')
        const [cat2, trait2Norm] = part2.split(':')

        // Find original traits
        let trait1Orig = trait1Norm
        let trait2Orig = trait2Norm
        for (const nftId of nftIds) {
          const { traits, original } = nftTraits.get(nftId)
          const idx1 = CATEGORIES.indexOf(cat1)
          const idx2 = CATEGORIES.indexOf(cat2)
          if (traits[idx1]?.normalized === trait1Norm && traits[idx2]?.normalized === trait2Norm) {
            trait1Orig = original[idx1]
            trait2Orig = original[idx2]
            break
          }
        }

        scoredPairs.push({
          pairKey,
          globalCount,
          inGroupCount,
          bestExample: bestExample.nftId,
          rank: bestExample.rank,
          pairs: [
            { category: CATEGORY_LABELS[cat1], trait: trait1Orig },
            { category: CATEGORY_LABELS[cat2], trait: trait2Orig }
          ]
        })
      }

      scoredPairs.sort((a, b) => {
        if (a.globalCount !== b.globalCount) return a.globalCount - b.globalCount // ASC (rarest first)
        if (a.inGroupCount !== b.inGroupCount) return a.inGroupCount - b.inGroupCount // ASC
        if (a.rank !== b.rank) return a.rank - b.rank // ASC
        return a.pairKey.localeCompare(b.pairKey) // stable sort
      })

      const nftIdsSet = new Set(nftIds)
      const allPairs = scoredPairs.slice(0, MAX_PAIRS_PER_GROUP).map(p => {
        // Get family arrays
        const familyGlobalRaw = Array.from(pairToNfts.get(p.pairKey) || [])
        const familyGlobalSorted = familyGlobalRaw.sort((a, b) => parseInt(a) - parseInt(b))
        
        // Handle truncation if > 200
        let familyGlobal = familyGlobalSorted
        let familyTruncated = false
        let familyTotalGlobal = familyGlobalSorted.length
        if (familyGlobalSorted.length > 200) {
          familyGlobal = familyGlobalSorted.slice(0, 200)
          familyTruncated = true
        }
        
        // Filter to group members
        const familyInGroup = familyGlobalSorted.filter(id => nftIdsSet.has(id))
        
        // Build pair label
        const pairLabel = `${p.pairs[0].trait} + ${p.pairs[1].trait}`
        
        return {
          nftId: p.bestExample,
          rank: p.rank,
          group_label: `${trait1} + ${trait2}`,
          pairs: p.pairs,
          pair_key: p.pairKey,
          pairKey: p.pairKey, // Keep for backward compatibility
          pair_label: pairLabel,
          pair_count_global: p.globalCount,
          pair_count_in_group: p.inGroupCount,
          family_global: familyGlobal,
          family_in_group: familyInGroup,
          ...(familyTruncated ? { family_truncated: true, family_total_global: familyTotalGlobal } : {})
        }
      })

      views.drilldown[ddKey][subgroupKey] = {
        label: `${trait1} + ${trait2}`,
        count: nftIds.length,
        items: allPairs
      }
    }
  }

  console.log(`  Processed ${Object.keys(views.primary).length} primary categories`)
  console.log(`  Processed ${Object.keys(views.drilldown).length} drilldown combinations`)

  // Step 5: Build sharded family files
  console.log('\n[Step 5] Building sharded family files...')
  ensureDir(FILES.familiesDir)

  // Initialize 256 shard maps
  const shards = {}
  for (let i = 0; i < 256; i++) {
    const prefix = i.toString(16).padStart(2, '0').toLowerCase()
    shards[prefix] = {}
  }

  // For each unique pairKey, build family list
  let totalFamilyMembers = 0
  for (const [pairKey, nftIdSet] of pairToNfts.entries()) {
    const prefix = getShardPrefix(pairKey)
    const nftIds = Array.from(nftIdSet)
    
    // Sort by rank, then numeric id
    nftIds.sort((a, b) => {
      const rankA = analysis[a]?.rank || 999999
      const rankB = analysis[b]?.rank || 999999
      if (rankA !== rankB) return rankA - rankB
      return parseInt(a) - parseInt(b)
    })

    shards[prefix][pairKey] = nftIds
    totalFamilyMembers += nftIds.length
  }

  // Write shard files
  const shardSizes = []
  const timestamp = new Date().toISOString()
  
  for (const [prefix, pairs] of Object.entries(shards)) {
    const shardData = {
      schema_version: "1.0",
      generated_at: timestamp,
      pairs
    }
    
    const filePath = path.join(FILES.familiesDir, `${prefix}.json`)
    writeJson(filePath, shardData)
    
    const size = fs.statSync(filePath).size
    shardSizes.push(size)
  }

  const avgSize = shardSizes.reduce((a, b) => a + b, 0) / shardSizes.length
  const minSize = Math.min(...shardSizes)
  const maxSize = Math.max(...shardSizes)
  const totalSize = shardSizes.reduce((a, b) => a + b, 0)

  console.log(`  Created 256 shard files`)
  console.log(`  Total unique pairs: ${globalPairCounts.size}`)
  console.log(`  Total family members: ${totalFamilyMembers}`)
  console.log(`  Shard sizes: avg ${(avgSize / 1024).toFixed(1)}KB, min ${(minSize / 1024).toFixed(1)}KB, max ${(maxSize / 1024).toFixed(1)}KB, total ${(totalSize / 1024 / 1024).toFixed(2)}MB`)

  // Step 6: Build and write main index
  console.log('\n[Step 6] Writing main index...')
  
  const inputCounts = {
    total_nfts_processed: nftTraits.size,
    unique_traits_per_category: {},
    total_unique_pairKeys: globalPairCounts.size
  }

  for (const cat of CATEGORIES) {
    inputCounts.unique_traits_per_category[cat] = uniqueTraitsPerCategory[cat].size
  }

  const indexData = {
    schema_version: "1.3",
    generated_at: timestamp,
    source_files: ["nftRarityData.json", "all_nft_analysis.json"],
    input_counts: inputCounts,
    normalization_report: normalizationReport,
    categories: CATEGORIES,
    views
  }

  writeJson(FILES.outputIndex, indexData)
  const indexSize = fs.statSync(FILES.outputIndex).size
  console.log(`  Main index size: ${(indexSize / 1024).toFixed(1)}KB`)

  // Verification output
  console.log('\n[Verification]')
  const sortedPairs = Array.from(globalPairCounts.entries())
    .sort((a, b) => a[1] - b[1])
    .slice(0, 5)
  
  console.log('  Top 5 rarest global pairs:')
  for (const [pairKey, count] of sortedPairs) {
    console.log(`    ${pairKey}: ${count}`)
  }

  // Count groups per category
  for (const cat of CATEGORIES) {
    const groupCount = Object.keys(views.primary[cat]).length
    console.log(`  ${cat}: ${groupCount} groups`)
  }

  // Assert no empty items arrays
  let emptyGroups = 0
  for (const cat of CATEGORIES) {
    for (const [key, group] of Object.entries(views.primary[cat])) {
      if (!group.items || group.items.length === 0) {
        emptyGroups++
        console.warn(`    Warning: Empty items array in primary.${cat}.${key}`)
      }
    }
  }
  for (const [ddKey, subgroups] of Object.entries(views.drilldown)) {
    for (const [subgroupKey, group] of Object.entries(subgroups)) {
      if (!group.items || group.items.length === 0) {
        emptyGroups++
        console.warn(`    Warning: Empty items array in drilldown.${ddKey}.${subgroupKey}`)
      }
    }
  }

  if (emptyGroups === 0) {
    console.log('  ✓ No empty items arrays found')
  }

  console.log('\n✓ Build complete!')
  console.log(`  Main index: ${FILES.outputIndex}`)
  console.log(`  Family shards: ${FILES.familiesDir}/XX.json (256 files)`)
}

main()

