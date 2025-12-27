/**
 * Verification script for weighted randomization
 * Runs lightweight simulation to verify weight-map coverage and weightedPick approximates target frequencies
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { TRAIT_FREQUENCIES } from '../src/utils/traitFrequencies.js'
import { buildWeightedMaps, getImageKey } from '../src/utils/buildWeightedMaps.js'
import { weightedPick, getRand01 } from '../src/utils/weightedPick.js'
import { getAllLayerImages } from '../src/lib/memeImageManifest.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Build manifests by layer
const manifestsByLayer = {
  Background: getAllLayerImages('Background'),
  Head: getAllLayerImages('Head'),
  Clothes: getAllLayerImages('Clothes'),
  Base: getAllLayerImages('Base'),
  Eyes: getAllLayerImages('Eyes'),
  Mask: getAllLayerImages('Mask'),
  MouthBase: getAllLayerImages('MouthBase'),
  MouthItem: getAllLayerImages('MouthItem'),
  FacialHair: getAllLayerImages('FacialHair')
}

// Build weighted maps
const { imageWeightByLayer, faceWearTraitWeights, faceWearToLayerRouting, reports } = buildWeightedMaps({ manifestsByLayer })

console.log('=== Weight Map Coverage Reports ===\n')
console.log('Unmapped Traits:', reports.unmappedTraits)
console.log('Zero Weight Images:', reports.zeroWeightImages)
console.log('Coverage %:', reports.coverage)
console.log('\n')

// Simulate randomizations
const NUM_ITERATIONS = 10000
const observedFrequencies = {
  Background: {},
  Head: {},
  Clothes: {},
  FaceWear: {},
  Mouth: {}
}

console.log(`Running ${NUM_ITERATIONS} randomizations...\n`)

for (let i = 0; i < NUM_ITERATIONS; i++) {
  // Simulate Background pick
  const bgImages = manifestsByLayer.Background || []
  if (bgImages.length > 0) {
    const bgMap = imageWeightByLayer.Background
    if (bgMap && bgMap.size > 0) {
      const picked = weightedPick(bgImages, (img) => bgMap.get(getImageKey(img)) || 0)
      if (picked) {
        const displayName = (picked.displayName || picked.name || '').toLowerCase()
        // Try to match to trait
        for (const [trait, freq] of Object.entries(TRAIT_FREQUENCIES.Background)) {
          if (normalizeKey(displayName).includes(normalizeKey(trait)) || 
              normalizeKey(trait).includes(normalizeKey(displayName))) {
            observedFrequencies.Background[trait] = (observedFrequencies.Background[trait] || 0) + 1
            break
          }
        }
      }
    }
  }
  
  // Simulate Head pick
  const headImages = manifestsByLayer.Head || []
  if (headImages.length > 0) {
    const headMap = imageWeightByLayer.Head
    if (headMap && headMap.size > 0) {
      const picked = weightedPick(headImages, (img) => headMap.get(getImageKey(img)) || 0)
      if (picked) {
        const displayName = (picked.displayName || picked.name || '').toLowerCase()
        for (const [trait, freq] of Object.entries(TRAIT_FREQUENCIES.Head)) {
          if (normalizeKey(displayName).includes(normalizeKey(trait)) || 
              normalizeKey(trait).includes(normalizeKey(displayName))) {
            observedFrequencies.Head[trait] = (observedFrequencies.Head[trait] || 0) + 1
            break
          }
        }
      }
    }
  }
  
  // Simulate Clothes pick
  const clothesImages = manifestsByLayer.Clothes || []
  if (clothesImages.length > 0) {
    const clothesMap = imageWeightByLayer.Clothes
    if (clothesMap && clothesMap.size > 0) {
      const picked = weightedPick(clothesImages, (img) => clothesMap.get(getImageKey(img)) || 0)
      if (picked) {
        const displayName = (picked.displayName || picked.name || '').toLowerCase()
        for (const [trait, freq] of Object.entries(TRAIT_FREQUENCIES.Clothes)) {
          if (normalizeKey(displayName).includes(normalizeKey(trait)) || 
              normalizeKey(trait).includes(normalizeKey(displayName))) {
            observedFrequencies.Clothes[trait] = (observedFrequencies.Clothes[trait] || 0) + 1
            break
          }
        }
      }
    }
  }
  
  // Simulate Face Wear pick (meta-layer decision)
  if (faceWearTraitWeights && faceWearTraitWeights.size > 0) {
    const faceWearTrait = weightedPick(
      Array.from(faceWearTraitWeights.keys()),
      (trait) => faceWearTraitWeights.get(trait)
    )
    if (faceWearTrait) {
      observedFrequencies.FaceWear[faceWearTrait] = (observedFrequencies.FaceWear[faceWearTrait] || 0) + 1
    }
  }
  
  // Simulate Mouth pick (will route to appropriate layer)
  const mouthFreqs = TRAIT_FREQUENCIES.Mouth || {}
  const mouthTraits = Object.keys(mouthFreqs)
  if (mouthTraits.length > 0) {
    // Pick a trait weighted by frequency
    const pickedTrait = weightedPick(mouthTraits, (trait) => mouthFreqs[trait])
    if (pickedTrait) {
      observedFrequencies.Mouth[pickedTrait] = (observedFrequencies.Mouth[pickedTrait] || 0) + 1
    }
  }
}

// Normalize observed frequencies to percentages
const normalizeObserved = (freqs) => {
  const total = Object.values(freqs).reduce((sum, count) => sum + count, 0)
  if (total === 0) return {}
  const normalized = {}
  for (const [trait, count] of Object.entries(freqs)) {
    normalized[trait] = count / total
  }
  return normalized
}

console.log('=== Observed vs Expected Frequencies ===\n')

// Compare key traits
const keyTraits = {
  Background: [
    { name: 'Chia Green', expected: TRAIT_FREQUENCIES.Background['Chia Green'] },
    { name: 'Signal Lost', expected: TRAIT_FREQUENCIES.Background['Signal Lost'] }
  ],
  Head: [
    { name: 'No Headgear', expected: TRAIT_FREQUENCIES.Head['No Headgear'] },
    { name: 'Piccolo Turban', expected: TRAIT_FREQUENCIES.Head['Piccolo Turban'] }
  ],
  Clothes: [
    { name: 'Topless', expected: TRAIT_FREQUENCIES.Clothes['Topless'] },
    { name: 'Piccolo Uniform', expected: TRAIT_FREQUENCIES.Clothes['Piccolo Uniform'] }
  ],
  FaceWear: [
    { name: 'No Face Wear', expected: TRAIT_FREQUENCIES['Face Wear']['No Face Wear'] },
    { name: 'Fake It Mask', expected: TRAIT_FREQUENCIES['Face Wear']['Fake It Mask'] }
  ],
  Mouth: [
    { name: 'Numb', expected: TRAIT_FREQUENCIES.Mouth['Numb'] },
    { name: 'Sexy Lip Bite', expected: TRAIT_FREQUENCIES.Mouth['Sexy Lip Bite'] }
  ]
}

for (const [layer, traits] of Object.entries(keyTraits)) {
  console.log(`\n${layer}:`)
  const observedNorm = normalizeObserved(observedFrequencies[layer])
  
  for (const { name, expected } of traits) {
    const observed = observedNorm[name] || 0
    const diff = Math.abs(observed - expected)
    const diffPercent = (diff / expected) * 100
    
    console.log(`  ${name}:`)
    console.log(`    Expected: ${(expected * 100).toFixed(2)}%`)
    console.log(`    Observed: ${(observed * 100).toFixed(2)}%`)
    console.log(`    Difference: ${diffPercent.toFixed(2)}%`)
  }
}

console.log('\n=== Simulation Complete ===\n')

// Helper function for normalization
function normalizeKey(str) {
  if (!str || typeof str !== 'string') {
    return ''
  }
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '')
}









