import fs from 'node:fs'
import path from 'node:path'

/**
 * Big Pulp: Fill `nft_ids` for ALL static questions (up to 10)
 *
 * - Deterministic, repeatable.
 * - Uses local data files only (no network).
 *
 * Usage:
 *   node scripts/generateBigPulpStaticPreviewIds.mjs           # dry run (prints summary)
 *   node scripts/generateBigPulpStaticPreviewIds.mjs --write   # writes updated question_tree_v2.json
 */

const MAX_IDS = 10

const ROOT = process.cwd()
const FILES = {
  questionTree: path.join(ROOT, 'public/assets/BigPulp/question_tree_v2.json'),
  traitInsights: path.join(ROOT, 'public/assets/BigPulp/trait_insights.json'),
  comboDb: path.join(ROOT, 'public/assets/BigPulp/combo_database.json'),
  analysis: path.join(ROOT, 'public/assets/BigPulp/all_nft_analysis.json'),
}

const args = new Set(process.argv.slice(2))
const shouldWrite = args.has('--write')

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function isValidNftId(n) {
  return Number.isInteger(n) && n >= 1 && n <= 4200
}

function normalizeId(id) {
  const n = parseInt(String(id).trim(), 10)
  if (!isValidNftId(n)) return null
  return String(n)
}

function uniqClamp(ids, max = MAX_IDS) {
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

function pickVariedIds(candidateIds, analysisById, max = MAX_IDS, opts = {}) {
  const maxPerBase = opts.maxPerBase ?? 2
  const selected = []
  const seen = new Set()
  const perBase = new Map()

  const push = (id) => {
    const norm = normalizeId(id)
    if (!norm) return false
    if (seen.has(norm)) return false
    seen.add(norm)
    selected.push(norm)
    return true
  }

  // Pass 1: enforce base variety
  for (const id of candidateIds) {
    const norm = normalizeId(id)
    if (!norm || seen.has(norm)) continue
    const base = analysisById[norm]?.base || 'Unknown'
    const count = perBase.get(base) || 0
    if (count >= maxPerBase) continue
    if (push(norm)) {
      perBase.set(base, count + 1)
      if (selected.length >= max) return selected
    }
  }

  // Pass 2: fill remaining without variety constraint
  for (const id of candidateIds) {
    const norm = normalizeId(id)
    if (!norm) continue
    if (push(norm) && selected.length >= max) return selected
  }

  return selected
}

function parseTraitName(questionObj) {
  if (typeof questionObj?.short === 'string' && questionObj.short.trim()) return questionObj.short.trim()
  const q = String(questionObj?.question || '')
  const prefix = 'Tell me about '
  if (q.startsWith(prefix)) return q.slice(prefix.length).trim()
  return null
}

function parseComboName(questionObj) {
  if (typeof questionObj?.short === 'string' && questionObj.short.trim()) return questionObj.short.trim()
  const q = String(questionObj?.question || '')
  const m = q.match(/What is the (.+?) combo\?/i)
  if (m) return m[1].trim()
  return null
}

function main() {
  const qt = readJson(FILES.questionTree)
  const traitInsights = readJson(FILES.traitInsights)
  const comboDb = readJson(FILES.comboDb)
  const analysisById = readJson(FILES.analysis) // { "1": { rank, base, ... }, ... }

  const allIds = Object.keys(analysisById).filter((k) => normalizeId(k)).map((k) => String(parseInt(k, 10)))

  const byRankAsc = [...allIds].sort((a, b) => (analysisById[a]?.rank ?? 999999) - (analysisById[b]?.rank ?? 999999))
  const byRankDesc = [...byRankAsc].reverse()

  // Base index (rank within base where possible)
  const baseToIds = new Map()
  for (const id of allIds) {
    const base = analysisById[id]?.base || 'Unknown'
    if (!baseToIds.has(base)) baseToIds.set(base, [])
    baseToIds.get(base).push(id)
  }
  for (const [base, ids] of baseToIds.entries()) {
    ids.sort((a, b) => {
      const av = analysisById[a]
      const bv = analysisById[b]
      // Prefer base_rank if available, otherwise overall rank
      const aKey = av?.base_rank ?? av?.rank ?? 999999
      const bKey = bv?.base_rank ?? bv?.rank ?? 999999
      return aKey - bKey
    })
  }

  // Trait index: trait -> ids sorted by overall rank
  const traitToIds = new Map()
  for (const id of allIds) {
    const traits = analysisById[id]?.s_tier_traits || []
    for (const t of traits) {
      const name = t?.trait
      if (!name) continue
      if (!traitToIds.has(name)) traitToIds.set(name, [])
      traitToIds.get(name).push(id)
    }
  }
  for (const [trait, ids] of traitToIds.entries()) {
    ids.sort((a, b) => (analysisById[a]?.rank ?? 999999) - (analysisById[b]?.rank ?? 999999))
  }

  // Combo index: comboName -> ids sorted by overall rank
  const comboToIds = new Map()
  for (const id of allIds) {
    const combos = analysisById[id]?.named_combos || []
    for (const c of combos) {
      const name = c?.name
      if (!name) continue
      if (!comboToIds.has(name)) comboToIds.set(name, [])
      comboToIds.get(name).push(id)
    }
  }
  for (const [combo, ids] of comboToIds.entries()) {
    ids.sort((a, b) => (analysisById[a]?.rank ?? 999999) - (analysisById[b]?.rank ?? 999999))
  }

  // Helpers for learn/stats
  const top10Overall = byRankAsc.slice(0, MAX_IDS)

  const topByTier = (tier, n) =>
    byRankAsc.filter((id) => String(analysisById[id]?.tier || '').toLowerCase() === tier).slice(0, n)

  const topUnique = byRankAsc.filter((id) => (analysisById[id]?.unique_count ?? 0) > 0)
  const bottomUnique = byRankDesc.filter((id) => (analysisById[id]?.unique_count ?? 0) > 0)

  const sTierHeavy = [...allIds]
    .filter((id) => (analysisById[id]?.s_tier_count ?? 0) >= 2)
    .sort((a, b) => {
      const av = analysisById[a]
      const bv = analysisById[b]
      const sA = av?.s_tier_count ?? 0
      const sB = bv?.s_tier_count ?? 0
      if (sB !== sA) return sB - sA
      return (av?.rank ?? 999999) - (bv?.rank ?? 999999)
    })

  const traitBestHolderIds = (traitNames) =>
    traitNames
      .map((t) => traitInsights?.[t]?.best_holder?.nft_id)
      .map(normalizeId)
      .filter(Boolean)

  const topTraitsByScore = Object.entries(traitInsights || {})
    .map(([trait, info]) => {
      const tier = String(info?.provenance_tier || '').toUpperCase()
      const tierScore = tier === 'S+' ? 2 : tier === 'S' ? 1 : 0
      const count = Number(info?.count ?? 999999)
      const best = normalizeId(info?.best_holder?.nft_id)
      return { trait, tierScore, count, best }
    })
    .filter((t) => t.best)
    .sort((a, b) => {
      if (b.tierScore !== a.tierScore) return b.tierScore - a.tierScore
      if (a.count !== b.count) return a.count - b.count
      return a.trait.localeCompare(b.trait)
    })
    .slice(0, MAX_IDS)
    .map((t) => t.best)

  const baseMapForTopNfts = {
    best_wojaks: 'Wojak',
    best_soyjaks: 'Soyjak',
    best_waifus: 'Waifu',
    best_baddies: 'Baddie',
    best_monkey_zoo: 'Monkey Zoo',
    best_papa_tang: 'Papa Tang',
    best_alien_wojaks: 'Alien Wojak',
    best_bepe_waifus: 'Bepe Waifu',
    best_bepe_baddies: 'Bepe Baddie',
  }

  // Mutate in memory
  const before = JSON.stringify(qt).length
  let touched = 0
  let filledMissing = 0

  for (const q of qt.static_questions || []) {
    const existing = Array.isArray(q.nft_ids) ? q.nft_ids : []
    const existingNorm = uniqClamp(existing, MAX_IDS)

    let ids = [...existingNorm]

    if (q.category === 'top_nfts') {
      const base = baseMapForTopNfts[q.id]
      if (base && baseToIds.has(base)) {
        ids = uniqClamp([...ids, ...baseToIds.get(base)], MAX_IDS)
      }
    } else if (q.category === 'traits') {
      const traitName = parseTraitName(q)
      if (traitName) {
        const best = normalizeId(traitInsights?.[traitName]?.best_holder?.nft_id)
        if (best) ids = uniqClamp([...ids, best], MAX_IDS)
        const candidates = traitToIds.get(traitName) || []
        const picked = pickVariedIds(candidates, analysisById, MAX_IDS, { maxPerBase: 2 })
        ids = uniqClamp([...ids, ...picked], MAX_IDS)
      }
    } else if (q.category === 'combos') {
      const comboName = parseComboName(q)
      if (comboName) {
        const fromDb = comboDb?.named_combos?.[comboName]?.all_nfts || []
        if (fromDb.length) {
          ids = uniqClamp([...ids, ...fromDb], MAX_IDS)
        } else {
          const candidates = comboToIds.get(comboName) || []
          const picked = pickVariedIds(candidates, analysisById, MAX_IDS, { maxPerBase: 3 })
          ids = uniqClamp([...ids, ...picked], MAX_IDS)
        }
      }
    } else if (q.category === 'learn') {
      if (q.id === 'what_is_provenance') {
        // Show provenance examples: best holders of iconic S-tier traits + some high S-tier-count NFTs
        ids = uniqClamp(
          [
            ...ids,
            ...traitBestHolderIds(['Crown', 'Neckbeard', 'Military Beret', 'MOG Glasses', 'Straitjacket']),
            ...pickVariedIds(sTierHeavy, analysisById, MAX_IDS, { maxPerBase: 2 }),
          ],
          MAX_IDS
        )
      } else if (q.id === 'what_are_tiers') {
        ids = uniqClamp(
          [
            ...ids,
            ...topByTier('legendary', 2),
            ...topByTier('elite', 2),
            ...topByTier('rare', 2),
            ...topByTier('uncommon', 2),
            ...topByTier('common', 2),
          ],
          MAX_IDS
        )
      } else if (q.id === 's_tier_traits_list') {
        ids = uniqClamp([...ids, ...topTraitsByScore], MAX_IDS)
      }
    } else if (q.category === 'stats') {
      if (q.id === 'total_supply') {
        ids = uniqClamp([...ids, ...top10Overall], MAX_IDS)
      } else if (q.id === 'rarest_base') {
        const bases = [
          'Alien Waifu',
          'Alien Baddie',
          'Bepe Waifu',
          'Bepe Baddie',
          'Alien Soyjak',
          'Bepe Soyjak',
          'Alien Wojak',
          'Bepe Wojak',
        ]
        const picks = []
        for (const base of bases) {
          const baseIds = baseToIds.get(base) || []
          // Take a couple from the rarest bases first, then one from the rest until we hit ~10
          const take = base === 'Alien Waifu' || base === 'Alien Baddie' || base === 'Bepe Waifu' || base === 'Bepe Baddie' ? 2 : 1
          picks.push(...baseIds.slice(0, take))
          if (picks.length >= MAX_IDS) break
        }
        ids = uniqClamp([...ids, ...picks], MAX_IDS)
      } else if (q.id === 'unique_combos_count') {
        const picks = [
          ...pickVariedIds(topUnique.slice(0, 200), analysisById, 5, { maxPerBase: 2 }),
          ...pickVariedIds(bottomUnique.slice(0, 400), analysisById, 7, { maxPerBase: 2 }),
        ]
        ids = uniqClamp([...ids, ...picks], MAX_IDS)
      }
    }

    // Ensure always present (even if fewer than 10 available)
    const had = Array.isArray(q.nft_ids) && q.nft_ids.length > 0
    if (!had && ids.length > 0) filledMissing += 1
    if (ids.length > 0) {
      q.nft_ids = ids
      touched += 1
    }
  }

  const after = JSON.stringify(qt).length

  // Summary
  const staticCount = (qt.static_questions || []).length
  const missing = (qt.static_questions || []).filter((q) => !Array.isArray(q.nft_ids) || q.nft_ids.length === 0)
  const short = (qt.static_questions || []).filter((q) => Array.isArray(q.nft_ids) && q.nft_ids.length > 0 && q.nft_ids.length < MAX_IDS)

  console.log('[BigPulp] Static questions:', staticCount)
  console.log('[BigPulp] Touched:', touched, 'Filled missing:', filledMissing)
  console.log('[BigPulp] Still missing:', missing.length, missing.map((q) => q.id))
  console.log('[BigPulp] Short (<10):', short.length, short.map((q) => `${q.id}:${q.nft_ids.length}`))
  console.log('[BigPulp] JSON size delta:', after - before, 'bytes')

  if (shouldWrite) {
    fs.writeFileSync(FILES.questionTree, JSON.stringify(qt, null, 2) + '\n', 'utf8')
    console.log('[BigPulp] Wrote:', FILES.questionTree)
  } else {
    console.log('[BigPulp] Dry run only. Re-run with --write to persist changes.')
  }
}

main()


