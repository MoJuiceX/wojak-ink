import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Big Pulp: Auto-generate answers for "AUTO-GENERATED" placeholders
 *
 * - Reads question_tree_v2.json
 * - Reads all_nft_analysis.json
 * - Reads nftRarityData.json (for trait pair counting)
 * - Generates answers for:
 *   1. 5 missing base type questions (best_alien_soyjaks, best_alien_waifus, etc.)
 *   2. 1 discovery question (traits_that_almost_never_pair)
 * - Writes to question_tree_v2.generated.json (always)
 * - If --write flag: overwrites question_tree_v2.json
 *
 * Usage:
 *   node scripts/build_question_tree_extras.mjs           # dry run (generates .generated.json)
 *   node scripts/build_question_tree_extras.mjs --write   # writes to question_tree_v2.json
 */

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const FILES = {
  questionTree: path.join(ROOT, 'public/assets/BigPulp/question_tree_v2.json'),
  analysis: path.join(ROOT, 'public/assets/BigPulp/all_nft_analysis.json'),
  rarityData1: path.join(ROOT, 'public/nftRarityData.json'),
  rarityData2: path.join(ROOT, 'public/assets/BigPulp/nftRarityData.json'),
  output: path.join(ROOT, 'public/assets/BigPulp/question_tree_v2.generated.json'),
}

const args = new Set(process.argv.slice(2))
const shouldWrite = args.has('--write')

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (err) {
    throw new Error(`Failed to read ${filePath}: ${err.message}`)
  }
}

function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile()
  } catch {
    return false
  }
}

function normalizeBaseName(base) {
  return String(base || '').trim()
}

function normalizeId(id) {
  const n = parseInt(String(id).trim(), 10)
  if (isNaN(n) || n < 1 || n > 4200) return null
  return String(n)
}

function dedupeAndClampNftIds(ids, max = 10) {
  const out = []
  const seen = new Set()
  for (const id of ids) {
    const norm = normalizeId(id)
    if (!norm) continue
    if (seen.has(norm)) continue
    seen.add(norm)
    out.push(norm)
    if (out.length >= max) break
  }
  return out
}

/**
 * Generate answer text for "best [base]" question
 */
function generateBestBaseAnswer(baseName, nfts, analysis) {
  const count = nfts.length
  const displayName = baseName
  const displayPlural = baseName + 's'

  // Header
  let header
  if (count <= 150) {
    header = `${displayPlural}—only ${count} exist:`
  } else {
    header = `Top ${displayPlural} out of ${count}:`
  }

  // Top 5 highlights
  const top5 = nfts.slice(0, 5)
  const lines = top5.map((nftId, idx) => {
    const nft = analysis[nftId]
    if (!nft) return `#${nftId} (Rank ${nft?.rank || '?'}) - No data`

    const rank = nft.rank || 999999
    let highlight = ''

    // Prefer analysis.highlight, else analysis.story_hook, else generic
    if (nft.highlight && String(nft.highlight).trim()) {
      highlight = String(nft.highlight).trim()
    } else if (nft.story_hook && String(nft.story_hook).trim()) {
      highlight = String(nft.story_hook).trim()
    } else {
      const tier = nft.tier_label || nft.tier || 'Common'
      const uniqueCount = nft.unique_count || 0
      highlight = `Rank context: ${tier} tier with ${uniqueCount} unique pairing(s).`
    }

    const prefix = idx === 0 ? `#${nftId} (Rank ${rank}) - ` : `#${nftId} (Rank ${rank}) - `
    return prefix + highlight
  })

  // Big Pulp note (factual, no invented facts)
  let note = ''
  if (count <= 50) {
    note = `${displayPlural} are rare. Low supply = high demand potential. 🍊`
  } else if (top5.some(id => (analysis[id]?.rank || 999999) <= 100)) {
    note = `${displayName} has strong performers in the top tiers. 🍊`
  } else {
    note = `${displayPlural} showcase diverse trait combinations. 🍊`
  }

  return [header, '', ...lines, '', note].join('\n')
}

/**
 * Generate answer for "traits that almost never pair" discovery question
 * Groups by base character, shows top 20 NFTs per base with rarest trait pairings
 */
function generateRarePairAnswer(rarityData, analysis) {
  // nftRarityData format: { "1": [rank, percentile, tier, base, face, mouth, face_wear, head, clothes, background], ... }
  // Indices: 3=base, 4=face, 5=mouth, 6=face_wear, 7=head, 8=clothes, 9=background

  const traitCategories = ['Base', 'Face', 'Mouth', 'Face Wear', 'Head', 'Clothes', 'Background']
  const categoryIndices = [3, 4, 5, 6, 7, 8, 9]

  // First, build global pair counts to compute rarity
  const globalPairCounts = new Map() // "Category1:Trait1|Category2:Trait2" -> count

  for (const [nftId, traits] of Object.entries(rarityData)) {
    if (!Array.isArray(traits) || traits.length < 10) continue

    const traitValues = categoryIndices.map(idx => String(traits[idx] || '').trim()).filter(Boolean)
    if (traitValues.length < 7) continue

    // Generate all 2-trait pairs for global counting
    for (let i = 0; i < traitValues.length; i++) {
      for (let j = i + 1; j < traitValues.length; j++) {
        const cat1 = traitCategories[i]
        const trait1 = traitValues[i]
        const cat2 = traitCategories[j]
        const trait2 = traitValues[j]

        const parts1 = `${cat1}:${trait1}`
        const parts2 = `${cat2}:${trait2}`
        const sorted = [parts1, parts2].sort()
        const pairKey = sorted.join('|')

        globalPairCounts.set(pairKey, (globalPairCounts.get(pairKey) || 0) + 1)
      }
    }
  }

  // Group NFTs by base
  const baseToNfts = new Map() // base -> array of { nftId, rarestPair, pairCount }

  for (const [nftId, traits] of Object.entries(rarityData)) {
    if (!Array.isArray(traits) || traits.length < 10) continue

    const base = String(traits[3] || '').trim()
    if (!base) continue

    const traitValues = categoryIndices.map(idx => String(traits[idx] || '').trim()).filter(Boolean)
    if (traitValues.length < 7) continue

    // Find rarest pair for this NFT
    let rarestPair = null
    let rarestCount = Infinity

    for (let i = 0; i < traitValues.length; i++) {
      for (let j = i + 1; j < traitValues.length; j++) {
        const cat1 = traitCategories[i]
        const trait1 = traitValues[i]
        const cat2 = traitCategories[j]
        const trait2 = traitValues[j]

        const parts1 = `${cat1}:${trait1}`
        const parts2 = `${cat2}:${trait2}`
        const sorted = [parts1, parts2].sort()
        const pairKey = sorted.join('|')
        // Format display key with spaces: "Base: Alien Baddie | Head: Construction Helmet"
        const formattedParts = sorted.map(part => {
          const colonIdx = part.indexOf(':')
          if (colonIdx !== -1) {
            const cat = part.substring(0, colonIdx)
            const trait = part.substring(colonIdx + 1)
            return `${cat}: ${trait}`
          }
          return part
        })
        const displayKey = formattedParts.join(' | ')

        const count = globalPairCounts.get(pairKey) || Infinity
        if (count < rarestCount) {
          rarestCount = count
          rarestPair = displayKey
        }
      }
    }

    if (rarestPair && rarestCount < Infinity) {
      if (!baseToNfts.has(base)) {
        baseToNfts.set(base, [])
      }
      baseToNfts.get(base).push({
        nftId: String(nftId),
        rarestPair,
        pairCount: rarestCount
      })
    }
  }

  // Sort each base by rarity (most rare first = lowest count), take top 20
  const baseSections = []
  const allNftIds = []
  const baseToNftIds = {} // Map base name to array of NFT IDs

  // Sort bases for consistent output (alphabetical)
  const sortedBases = Array.from(baseToNfts.keys()).sort()

  for (const base of sortedBases) {
    const nfts = baseToNfts.get(base)
      .sort((a, b) => {
        // Sort by pairCount (asc = most rare first), then by nftId
        if (a.pairCount !== b.pairCount) return a.pairCount - b.pairCount
        return parseInt(a.nftId, 10) - parseInt(b.nftId, 10)
      })
      .slice(0, 20) // Top 20 most rare

    if (nfts.length === 0) continue

    // Format section (remove count since all are 1-of-1s)
    // Also remove "Base: [BaseName]" from display when it matches the section base
    const lines = nfts.map(nft => {
      let displayPair = nft.rarestPair
      // Remove "Base: [CurrentBase]" from the display string if present
      const baseToRemove = `Base: ${base}`
      if (displayPair.includes(baseToRemove)) {
        // Remove the base part from the display string
        const parts = displayPair.split(' | ')
        const filteredParts = parts.filter(part => {
          const trimmed = part.trim()
          return trimmed !== baseToRemove && !trimmed.startsWith(baseToRemove + ':')
        })
        displayPair = filteredParts.join(' | ')
      }
      return `• ${displayPair} (e.g. #${nft.nftId})`
    })

    baseSections.push(`${base}:\n${lines.join('\n')}`)
    
    // Collect NFT IDs for this base
    const baseIds = []
    nfts.forEach(nft => {
      const normId = normalizeId(nft.nftId)
      if (normId) {
        baseIds.push(normId)
        if (!allNftIds.includes(normId)) {
          allNftIds.push(normId)
        }
      }
    })
    
    // Store base-to-IDs mapping
    baseToNftIds[base] = baseIds
  }

  // Generate answer text
  const header = 'Rare combos grouped by base character.\nThese are the top 20:\n\n'
  const answer = header + baseSections.join('\n\n')

  return {
    answer,
    nftIds: dedupeAndClampNftIds(allNftIds, 200), // Allow up to 200 IDs (20 per base × 10 bases)
    base_to_nft_ids: baseToNftIds // Map base names to their NFT ID arrays
  }
}

function main() {
  console.log('[Big Pulp] Building question tree extras...\n')

  // Read inputs
  let questionTree, analysis, rarityData

  try {
    questionTree = readJson(FILES.questionTree)
    console.log('✓ Read question_tree_v2.json')
  } catch (err) {
    console.error('✗ Failed to read question tree:', err.message)
    process.exit(1)
  }

  try {
    analysis = readJson(FILES.analysis)
    console.log('✓ Read all_nft_analysis.json')
  } catch (err) {
    console.error('✗ Failed to read analysis:', err.message)
    process.exit(1)
  }

  // Try to read nftRarityData (required for discovery question)
  if (fileExists(FILES.rarityData1)) {
    try {
      rarityData = readJson(FILES.rarityData1)
      console.log('✓ Read nftRarityData.json from public/')
    } catch (err) {
      console.error('✗ Failed to read rarity data:', err.message)
      process.exit(1)
    }
  } else if (fileExists(FILES.rarityData2)) {
    try {
      rarityData = readJson(FILES.rarityData2)
      console.log('✓ Read nftRarityData.json from public/assets/BigPulp/')
    } catch (err) {
      console.error('✗ Failed to read rarity data:', err.message)
      process.exit(1)
    }
  } else {
    console.error('✗ nftRarityData.json not found!')
    console.error('  Tried:', FILES.rarityData1)
    console.error('  Tried:', FILES.rarityData2)
    console.error('\n  Please provide/export the full trait table to generate discovery answers.')
    process.exit(1)
  }

  // Group NFTs by base
  const baseToNfts = new Map()
  for (const [nftId, nftData] of Object.entries(analysis)) {
    const base = normalizeBaseName(nftData?.base)
    if (!base) continue
    if (!baseToNfts.has(base)) baseToNfts.set(base, [])
    baseToNfts.get(base).push(nftId)
  }

  // Sort each base group by rank
  for (const [base, ids] of baseToNfts.entries()) {
    ids.sort((a, b) => {
      const aRank = analysis[a]?.rank || 999999
      const bRank = analysis[b]?.rank || 999999
      return aRank - bRank
    })
  }

  // Base name mapping (from question ID to analysis base name)
  const baseMapping = {
    best_alien_soyjaks: 'Alien Soyjak',
    best_alien_waifus: 'Alien Waifu',
    best_alien_baddies: 'Alien Baddie',
    best_bepe_wojaks: 'Bepe Wojak',
    best_bepe_soyjaks: 'Bepe Soyjak',
  }

  let generated = 0

  // Process static questions
  for (const q of questionTree.static_questions || []) {
    // Always regenerate traits_that_almost_never_pair, or process AUTO-GENERATED
    if (q.id === 'traits_that_almost_never_pair') {
      // Generate discovery answer (always regenerate this one)
      const result = generateRarePairAnswer(rarityData, analysis)
      q.answer = result.answer
      q.nft_ids = result.nftIds
      q.base_to_nft_ids = result.base_to_nft_ids
      generated++
      console.log(`✓ Generated answer for ${q.id} (${result.nftIds.length} NFT IDs across all bases)`)
      continue
    }

    if (q.answer !== 'AUTO-GENERATED') continue

    if (q.id in baseMapping) {
      // Generate base type answer
      const baseName = baseMapping[q.id]
      const normalizedBase = normalizeBaseName(baseName)
      const nfts = baseToNfts.get(normalizedBase) || []

      if (nfts.length === 0) {
        console.warn(`⚠ No NFTs found for base: ${baseName} (normalized: ${normalizedBase})`)
        console.warn(`  Available bases: ${Array.from(baseToNfts.keys()).join(', ')}`)
        continue
      }

      // Validate base name match
      const foundBase = Array.from(baseToNfts.keys()).find(b => normalizeBaseName(b) === normalizedBase)
      if (!foundBase) {
        console.error(`✗ Base name mismatch: "${baseName}" not found in analysis`)
        console.error(`  Available: ${Array.from(baseToNfts.keys()).join(', ')}`)
        process.exit(1)
      }

      const top10 = dedupeAndClampNftIds(nfts, 10)
      q.answer = generateBestBaseAnswer(baseName, nfts, analysis)
      q.nft_ids = top10
      generated++
      console.log(`✓ Generated answer for ${q.id} (${nfts.length} NFTs, top 10 IDs)`)
    }
  }

  console.log(`\n✓ Generated ${generated} answers`)

  // Validate all AUTO-GENERATED are replaced
  const stillAuto = (questionTree.static_questions || []).filter(q => q.answer === 'AUTO-GENERATED')
  if (stillAuto.length > 0) {
    console.warn(`⚠ Still AUTO-GENERATED: ${stillAuto.map(q => q.id).join(', ')}`)
  }

  // Validate nft_ids
  for (const q of questionTree.static_questions || []) {
    if (!Array.isArray(q.nft_ids)) continue
    for (const id of q.nft_ids) {
      const norm = normalizeId(id)
      if (!norm) {
        console.error(`✗ Invalid nft_id in ${q.id}: "${id}"`)
        process.exit(1)
      }
    }
  }

  // Validate answers are non-empty
  for (const q of questionTree.static_questions || []) {
    if (q.answer === 'AUTO-GENERATED' || !String(q.answer || '').trim()) {
      console.error(`✗ Empty answer in ${q.id}`)
      process.exit(1)
    }
  }

  // Write output
  const outputJson = JSON.stringify(questionTree, null, 2) + '\n'
  fs.writeFileSync(FILES.output, outputJson, 'utf8')
  console.log(`✓ Wrote ${FILES.output}`)

  if (shouldWrite) {
    fs.writeFileSync(FILES.questionTree, outputJson, 'utf8')
    console.log(`✓ Wrote ${FILES.questionTree}`)
  } else {
    console.log('\n💡 Dry run complete. Re-run with --write to update question_tree_v2.json')
  }
}

main()

