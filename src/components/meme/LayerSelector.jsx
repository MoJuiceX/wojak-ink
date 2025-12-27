import { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react'
import { Select, Label } from '../ui'
import Tooltip from '../ui/Tooltip'
import { useImageLoader } from '../../hooks/useImageLoader'
import { getDisabledReason, getDisabledLayers } from '../../utils/wojakRules'
import { getAllLayerImages } from '../../lib/memeImageManifest'
import { COLOR_TOKENS, parseColorVariant, normalizeHeadLabel, formatDisplayLabel, parseSuitVariant, parseChiaFarmerVariant } from '../../lib/traitOptions'

// parseColorVariant, normalizeHeadLabel, formatDisplayLabel, parseSuitVariant, and parseChiaFarmerVariant are now imported from traitOptions

/**
 * Check if an item should be excluded from color grouping
 * @param {string} path - Image path
 * @param {string} rawDisplayName - Raw display name
 * @returns {boolean} True if should be excluded
 */
function shouldExcludeFromGrouping(path, rawDisplayName) {
  const pathLower = (path || '').toLowerCase()
  const nameLower = (rawDisplayName || '').toLowerCase()
  
  // Exclude Chia Farmer
  if (pathLower.includes('chia-farmer') || pathLower.includes('chia farmer') ||
      nameLower.includes('chia-farmer') || nameLower.includes('chia farmer')) {
    return true
  }
  
  return false
}

/**
 * Group options by color variants for Head/Eyes/Clothes layers
 * @param {Array} allOptions - Array of option objects with path, rawLabel, etc.
 * @param {number} startIndex - Starting index in allOptions for tracking original order
 * @param {string} layerName - Layer name (for special handling like Cap McD)
 * @returns {Object} { groups: Map, ungrouped: Array, pathToGroup: Map, capMcdVariants: Map }
 */
function groupColorVariants(allOptions, startIndex = 0, layerName = '') {
  const groups = new Map() // Map<baseName, Array<variant>>
  const ungrouped = []
  const pathToGroup = new Map() // Map<path, {baseName, variant}>
  const capMcdVariants = new Map() // Map<baseName, capMcdVariant> for Head Cap McD
  
  allOptions.forEach((option, index) => {
    const rawLabel = option.rawLabel || option.label
    const path = option.value || option.path
    
    // Exclude Chia Farmer from grouping
    if (shouldExcludeFromGrouping(path, rawLabel)) {
      ungrouped.push({ ...option, originalIndex: startIndex + index })
      return
    }
    
    // Special handling for Head Cap McD variant
    if (layerName === 'Head') {
      const pathLower = path.toLowerCase()
      const labelLower = (rawLabel || '').toLowerCase()
      const isMcDVariant = pathLower.includes('mcd') || labelLower.includes('mcd') || labelLower.includes('mc d') || labelLower.includes('mcdonald')
      
      if (isMcDVariant) {
        // Check if this is a Cap variant - check both parsed base and direct label match
        const parsed = parseColorVariant(rawLabel)
        const isCapBase = (parsed && parsed.base.toLowerCase() === 'cap') || 
                         labelLower.startsWith('cap') || 
                         pathLower.includes('cap')
        
        if (isCapBase) {
          // Store as McD variant, not as color dot variant
          capMcdVariants.set('Cap', { ...option, baseName: 'Cap' })
          pathToGroup.set(path, { baseName: 'Cap', variant: { ...option, baseName: 'Cap' }, isMcD: true })
          return // Don't add to groups or ungrouped
        }
      }
    }
    
    const parsed = parseColorVariant(rawLabel)
    
    if (parsed) {
      // This is a color variant
      const baseName = parsed.base
      if (!groups.has(baseName)) {
        groups.set(baseName, [])
      }
      const variant = {
        ...option,
        color: parsed.color,
        hex: parsed.hex,
        baseName,
        originalIndex: startIndex + index
      }
      groups.get(baseName).push(variant)
      pathToGroup.set(path, { baseName, variant })
    } else {
      // Check if this might be a base entry (no color) that belongs to an existing group
      // We'll handle this in the next pass
      ungrouped.push({ ...option, originalIndex: startIndex + index })
    }
  })
  
  // Second pass: Check if ungrouped items are base entries for existing groups
  const finalUngrouped = []
  ungrouped.forEach(option => {
    const rawLabel = (option.rawLabel || option.label || '').trim()
    let isBaseForGroup = false
    
    // Check if this matches a group base name (normalize for comparison)
    for (const [baseName, variants] of groups.entries()) {
      const normalizedBase = baseName.trim().toLowerCase()
      const normalizedLabel = rawLabel.toLowerCase()
      
      // Exact match or match with common variations
      if (normalizedLabel === normalizedBase || 
          normalizedLabel.replace(/\s+/g, ' ') === normalizedBase.replace(/\s+/g, ' ')) {
        // This is the base entry for this group
        const baseVariant = {
          ...option,
          baseName,
          color: null, // No color = base entry
          hex: null,
          originalIndex: option.originalIndex
        }
        variants.unshift(baseVariant) // Add at beginning (will be default)
        pathToGroup.set(option.value || option.path, { baseName, variant: baseVariant })
        isBaseForGroup = true
        break
      }
    }
    
    if (!isBaseForGroup) {
      finalUngrouped.push(option)
    }
  })
  
  // Sort variants within each group by originalIndex to preserve manifest order
  groups.forEach((variants, baseName) => {
    variants.sort((a, b) => a.originalIndex - b.originalIndex)
  })
  
  return { groups, ungrouped: finalUngrouped, pathToGroup, capMcdVariants }
}

/**
 * Get default variant for a group
 * Priority: 1) Base entry (no color), 2) First in manifest order
 * @param {Array} variants - Array of variant objects
 * @returns {Object} Default variant
 */
function getDefaultVariant(variants) {
  // First priority: base entry with no color
  const baseEntry = variants.find(v => !v.color)
  if (baseEntry) return baseEntry
  
  // Second priority: first in manifest order (already sorted)
  return variants[0]
}

/**
 * Get default suit variant deterministically
 * Priority: "Suit Black + Tie + Blue" if exists, else first after stable sort
 * Sort order: suitColor, then accessoryType, then accessoryColor (all case-insensitive)
 * @param {Array} suitVariants - Array of suit variant objects with parsed suit metadata
 * @returns {Object} Default suit variant
 */
function getDefaultSuitVariant(suitVariants) {
  if (!suitVariants || suitVariants.length === 0) return null
  
  // First priority: "Suit Black + Tie + Blue"
  const preferred = suitVariants.find(v => 
    v.suitColor === 'black' && 
    v.accessoryType === 'tie' && 
    v.accessoryColor === 'blue'
  )
  if (preferred) return preferred
  
  // Second priority: stable sort by suitColor, then accessoryType, then accessoryColor
  const sorted = [...suitVariants].sort((a, b) => {
    // Sort by suitColor (black before orange)
    const suitColorOrder = { 'black': 0, 'orange': 1 }
    const suitDiff = (suitColorOrder[a.suitColor] || 999) - (suitColorOrder[b.suitColor] || 999)
    if (suitDiff !== 0) return suitDiff
    
    // Then by accessoryType (tie before bow)
    const typeOrder = { 'tie': 0, 'bow': 1 }
    const typeDiff = (typeOrder[a.accessoryType] || 999) - (typeOrder[b.accessoryType] || 999)
    if (typeDiff !== 0) return typeDiff
    
    // Then by accessoryColor (alphabetical)
    return a.accessoryColor.localeCompare(b.accessoryColor)
  })
  
  return sorted[0]
}

// normalizeHeadLabel and formatDisplayLabel are now imported from traitOptions

function LayerSelector({ layerName, onSelect, selectedValue, disabled = false, selectedLayers = {}, navigation, traitIndex = -1, disableTooltip = false, isFirstRow = false }) {
  const { images, loading } = useImageLoader(layerName)
  const [options, setOptions] = useState([])
  const [selectedOption, setSelectedOption] = useState('')
  const selectRef = useRef(null)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const isFocusedTrait = navigation && traitIndex >= 0 && navigation.focusedTraitIndex === traitIndex
  const shouldGroup = ['Head', 'Eyes', 'Clothes'].includes(layerName)
  
  // Detect mobile viewport for inline styles (inline styles override CSS)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 640)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 640)
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Store grouping metadata
  const groupsRef = useRef(new Map())
  const pathToGroupRef = useRef(new Map())
  const suitVariantsRef = useRef([])
  const pathToSuitVariantRef = useRef(new Map())
  const suitMatrixLoggedRef = useRef(false)
  const capMcdVariantsRef = useRef(new Map())
  const lastCapNormalRef = useRef(null)
  const chiaFarmerVariantsRef = useRef([])
  const pathToChiaFarmerVariantRef = useRef(new Map())
  const centurionPathsRef = useRef({ normal: null, masked: null })

  // Register/unregister with navigation system
  useEffect(() => {
    if (navigation && selectRef.current && options.length > 0) {
      navigation.registerSelector(layerName, selectRef, options, selectedOption)
      return () => {
        navigation.unregisterSelector(layerName)
      }
    }
  }, [navigation, layerName, options, selectedOption])


  // Memoize options computation to prevent unnecessary recalculations
  const computedOptions = useMemo(() => {
    let allOptions = []
    const shouldGroup = ['Head', 'Eyes', 'Clothes'].includes(layerName)
    
    // Get disabled options from rules
    const { disabledOptions } = getDisabledLayers(selectedLayers)
    const layerDisabledOptions = disabledOptions?.[layerName] || []
    
    // Helper function to check if an option should be disabled
    const isOptionDisabled = (path, label) => {
      if (!layerDisabledOptions || layerDisabledOptions.length === 0) return false
      
      // Check if path or label contains any of the disabled identifiers
      const pathLower = (path || '').toLowerCase()
      const labelLower = (label || '').toLowerCase()
      
      return layerDisabledOptions.some(disabledIdentifier => {
        const identifierLower = disabledIdentifier.toLowerCase()
        return pathLower.includes(identifierLower) || labelLower.includes(identifierLower)
      })
    }
    
    // Check if Chia Farmer is selected (for checkmark on Tee/Tank)
    // Chia Farmer can be in ClothesAddon (internal) or temporarily in Clothes
    const clothesAddonPath = selectedLayers['ClothesAddon'] || ''
    const clothesPath = selectedLayers['Clothes'] || ''
    const hasChiaFarmer = (
      (clothesAddonPath && (
        clothesAddonPath.includes('Chia-Farmer') || 
        clothesAddonPath.includes('Chia Farmer')
      )) ||
      (clothesPath && (
        clothesPath.includes('Chia-Farmer') || 
        clothesPath.includes('Chia Farmer')
      ))
    )
    
    // Get current Tee/Tank selection (for checkmark)
    // Must be a Tee or Tank-top, and NOT Chia Farmer
    const isTeeOrTank = clothesPath && (
      clothesPath.includes('Tee') || 
      clothesPath.includes('Tank-Top') ||
      clothesPath.includes('tank-top')
    ) && !clothesPath.includes('Chia-Farmer')
    
    // Check if no Tee/Tank is selected (for helper text on Chia Farmer)
    const noTeeOrTank = !isTeeOrTank

    // Flatten images from all subfolders - preserve rawLabel for grouping
    Object.keys(images).forEach(subfolder => {
      const subfolderImages = images[subfolder] || []
      subfolderImages.forEach(img => {
        // Filter out images with 'none' in path or displayName for MouthBase and Clothes
        const isMouthBaseOrClothes = layerName === 'MouthBase' || layerName === 'Clothes'
        if (isMouthBaseOrClothes) {
          const pathLower = (img.path || '').toLowerCase()
          const displayNameLower = ((img.displayName || img.name) || '').toLowerCase()
          if (pathLower.includes('none') || displayNameLower.includes('none')) {
            return // Skip this image
          }
        }
        
        // Filter out McD.png from Clothes layer (it's only used as a cap color option, not a clothing item)
        if (layerName === 'Clothes') {
          const pathLower = (img.path || '').toLowerCase()
          const displayNameLower = ((img.displayName || img.name) || '').toLowerCase()
          if (pathLower.includes('mcd.png') || displayNameLower.includes('mcd') || 
              (pathLower.endsWith('mcd.png') && !pathLower.includes('head'))) {
            return // Skip McD.png logo - it's not a clothing item
          }
        }
        
        // Get rawLabel early for use in filters
        const rawLabel = img.displayName || img.name
        
        // Filter out old Wizard Glasses for Eyes layer (keep only Wizard Glasses New)
        if (layerName === 'Eyes') {
          const pathLower = (img.path || '').toLowerCase()
          const rawLabelLower = (rawLabel || '').toLowerCase()
          // Exclude old Wizard Glasses (has wizard and glasses but NOT new)
          if ((pathLower.includes('wizard') && pathLower.includes('glasses')) && 
              !pathLower.includes('new') && !rawLabelLower.includes('new')) {
            return // Skip old Wizard Glasses
          }
        }
        
        // Apply Head-specific normalization (before formatting, for grouping)
        let normalizedRawLabel = rawLabel
        if (layerName === 'Head') {
          normalizedRawLabel = normalizeHeadLabel(rawLabel, layerName)
        }
        
        let formattedLabel = formatDisplayLabel(normalizedRawLabel)
        
        // Filter out items that formatDisplayLabel returns null for (e.g., Super Mario)
        if (!formattedLabel) {
          return // Skip this option
        }
        
        // For grouping, we need to use the rawLabel (before special formatting)
        // But for display, we use formattedLabel
        // The issue: Matrix Lenses special case removes color, breaking grouping
        // Solution: Don't apply Matrix Lenses special case if it has a color variant
        if (layerName === 'Eyes') {
          const parsed = parseColorVariant(rawLabel)
          if (parsed && parsed.base.toLowerCase().includes('matrix') && parsed.base.toLowerCase().includes('lenses')) {
            // This is a color variant of Matrix Lenses - keep the color for grouping
            // But format the base name correctly
            formattedLabel = `Matrix Lenses (${parsed.color.charAt(0).toUpperCase() + parsed.color.slice(1)})`
          }
        }
        
        // Check if this is a Tee or Tank item
        const isTeeOrTankItem = img.path.includes('Tee') || img.path.includes('Tank-Top') || img.path.includes('tank-top')
        // Check if this is a Chia Farmer item
        const isChiaFarmerItem = rawLabel.toLowerCase().includes('chia') && rawLabel.toLowerCase().includes('farmer')
        // Check if this is an Astronaut item
        const isAstronautItem = rawLabel.toLowerCase().includes('astronaut') || img.path.toLowerCase().includes('astronaut')
        
        // Check if Mask is selected (for Astronaut hint)
        const hasMask = selectedLayers['Mask'] && selectedLayers['Mask'] !== '' && selectedLayers['Mask'] !== 'None'
        
        // Fix: Explicitly exclude Tee/Tank from being disabled when Chia Farmer is active
        let optionDisabled = isOptionDisabled(img.path, rawLabel)
        if (layerName === 'Clothes' && hasChiaFarmer && isTeeOrTankItem) {
          // Never disable Tee/Tank items when Chia Farmer is selected
          optionDisabled = false
        }
        
        // When Chia Farmer is active, disable all Clothing options except Tee/Tank-top and Chia Farmer variants
        // Use path-based check for Chia Farmer detection (standardized)
        const isChiaFarmerItemByPath = img.path.includes('Chia-Farmer')
        if (layerName === 'Clothes' && hasChiaFarmer && !isTeeOrTankItem && !isChiaFarmerItemByPath) {
          optionDisabled = true
        }
        
        // Add helper text to disabled Chia Farmer options
        if (layerName === 'Clothes' && optionDisabled && noTeeOrTank && isChiaFarmerItem) {
          formattedLabel = `${formattedLabel} ⓘ choose tee or tank top first`
        }
        
        // Add hint text to disabled Astronaut option when Mask is selected
        if (layerName === 'Clothes' && optionDisabled && hasMask && isAstronautItem) {
          formattedLabel = `${formattedLabel} ⓘ deselect mask first`
        }
        
        // Note: Do not add hint text to enabled options to prevent width expansion when selected
        // Helper text is only added to disabled options (which cannot be selected)
        // Chia Farmer items show without any badges or hint text (clean display)
        
        allOptions.push({
          value: img.path,
          label: formattedLabel,
          rawLabel: rawLabel, // Preserve for grouping
          fullName: img.fullName,
          disabled: optionDisabled
        })
      })
    })

    // Merge ClothesAddon images (Chia Farmer variants) into Clothes options
    if (layerName === 'Clothes') {
      const addonImages = getAllLayerImages('ClothesAddon')
      addonImages.forEach(img => {
        const rawLabel = img.displayName || img.name
        let formattedLabel = formatDisplayLabel(rawLabel)
        
        // Standardize Chia Farmer detection: use path-based check for reliability
        const isChiaFarmerItem = img.path.includes('Chia-Farmer')
        
        // Check disabled state (should be disabled if no Tee/Tank-top base exists)
        let optionDisabled = isOptionDisabled(img.path, rawLabel)
        
        // Apply helper text only to disabled Chia Farmer options (not Tee/Tank-top)
        if (optionDisabled && noTeeOrTank && isChiaFarmerItem) {
          formattedLabel = `${formattedLabel} ⓘ choose tee or tank top first`
        }
        
        allOptions.push({
          value: img.path,
          label: formattedLabel,
          rawLabel: rawLabel, // Preserve for grouping
          fullName: img.fullName,
          disabled: optionDisabled
        })
      })
      
      // Sort options alphabetically for consistent ordering (Chia Farmer variants will be grouped)
      // But only if not grouping (grouping will handle its own ordering)
      if (!shouldGroup) {
        allOptions.sort((a, b) => a.label.localeCompare(b.label))
      }
    }

    // Handle Centurion proxy option for Head layer
    // Replace both Centurion options with a single "__CENTURION__" proxy that always displays as "Centurion"
    let normalCenturionValue = null
    let maskedCenturionValue = null
    let centurionInsertIndex = -1
    
    if (layerName === 'Head') {
      // Find both Centurion asset values before filtering
      allOptions.forEach((option, index) => {
        const pathLower = (option.value || '').toLowerCase()
        if (pathLower.includes('centurion_mask')) {
          maskedCenturionValue = option.value
        } else if (pathLower.includes('centurion') && !pathLower.includes('centurion_mask')) {
          normalCenturionValue = option.value
          centurionInsertIndex = index // Track where to insert the proxy
        }
      })
      
      // Remove both Centurion options from the list
      allOptions = allOptions.filter(option => {
        const pathLower = (option.value || '').toLowerCase()
        const isCenturion = pathLower.includes('centurion') && !pathLower.includes('centurion_mask')
        const isCenturionMask = pathLower.includes('centurion_mask')
        return !isCenturion && !isCenturionMask
      })
      
      // Store Centurion paths in ref for use in handlers
      centurionPathsRef.current = {
        normal: normalCenturionValue,
        masked: maskedCenturionValue
      }
      
      // Insert single Centurion proxy option at the original position (or append if not found)
      if (normalCenturionValue || maskedCenturionValue) {
        const centurionProxyOption = {
          value: '__CENTURION__',
          label: 'Centurion',
          rawLabel: 'Centurion',
          fullName: 'Centurion',
          disabled: false,
          isCenturionProxy: true,
          normalCenturionValue: normalCenturionValue,
          maskedCenturionValue: maskedCenturionValue
        }
        
        if (centurionInsertIndex >= 0 && centurionInsertIndex < allOptions.length) {
          allOptions.splice(centurionInsertIndex, 0, centurionProxyOption)
        } else {
          // Find insertion point alphabetically (before "Chia" or at appropriate position)
          let insertIdx = allOptions.findIndex(opt => {
            const label = (opt.label || '').toLowerCase()
            return label > 'centurion'
          })
          if (insertIdx < 0) insertIdx = allOptions.length
          allOptions.splice(insertIdx, 0, centurionProxyOption)
        }
      }
    }

    // Extract suit variants and Chia Farmer variants BEFORE color grouping (only for Clothes layer)
    let suitVariants = []
    let chiaFarmerVariants = []
    let filteredOptions = allOptions
    if (shouldGroup && layerName === 'Clothes') {
      suitVariants = []
      chiaFarmerVariants = []
      filteredOptions = []
      
      allOptions.forEach(option => {
        // Check if it's a Suit variant
        const suitParsed = parseSuitVariant(option.rawLabel || option.label)
        if (suitParsed) {
          // This is a suit variant - add to suitVariants with parsed metadata
          suitVariants.push({
            ...option,
            suitColor: suitParsed.suitColor,
            accessoryType: suitParsed.accessoryType,
            accessoryColor: suitParsed.accessoryColor
          })
        } else {
          // Check if it's a Chia Farmer variant
          const chiaParsed = parseChiaFarmerVariant(option.value, option.rawLabel || option.label)
          if (chiaParsed) {
            // This is a Chia Farmer variant - add to chiaFarmerVariants with parsed metadata
            const colorHex = COLOR_TOKENS[chiaParsed.color] || '#000000'
            chiaFarmerVariants.push({
              ...option,
              color: chiaParsed.color,
              hex: colorHex
            })
          } else {
            // Not a suit or Chia Farmer variant - keep in filteredOptions for normal grouping
            filteredOptions.push(option)
          }
        }
      })
      
      // Dev-only: Log suit variant matrix once per component mount
      if (import.meta.env.DEV && !suitMatrixLoggedRef.current && suitVariants.length > 0) {
        const matrix = {
          black: { tie: [], bow: [] },
          orange: { tie: [], bow: [] }
        }
        suitVariants.forEach(v => {
          if (matrix[v.suitColor] && matrix[v.suitColor][v.accessoryType]) {
            matrix[v.suitColor][v.accessoryType].push({
              color: v.accessoryColor,
              path: v.value
            })
          }
        })
        console.log('[Suit Variant Matrix]', matrix)
        suitMatrixLoggedRef.current = true
      }
    }

    // Apply color grouping for Head/Eyes/Clothes
    if (shouldGroup) {
      const { groups, ungrouped, pathToGroup, capMcdVariants } = groupColorVariants(filteredOptions, 0, layerName)
      
      // Dev logging (development mode only)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[LayerSelector] ${layerName} - Grouped bases:`, Array.from(groups.keys()))
        groups.forEach((variants, baseName) => {
          if (variants.length > 1) {
            const colors = variants
              .filter(v => v.color)
              .map(v => v.color)
              .join(', ')
            console.log(`  - ${baseName}: ${variants.length} variants (${colors})`)
          }
        })
      }
      
      // Store groups and pathToGroup for later use (state sync, color dots)
      // We'll store these in a ref or return them with options
      const finalOptions = []
      
      // Add SUIT group option if we have suit variants (only for Clothes)
      if (layerName === 'Clothes' && suitVariants.length > 0) {
        const defaultSuitVariant = getDefaultSuitVariant(suitVariants)
        const allSuitDisabled = suitVariants.every(v => v.disabled)
        
        finalOptions.push({
          value: '__GROUP__SUIT',
          label: 'Suit',
          rawLabel: 'Suit',
          fullName: 'Suit',
          disabled: allSuitDisabled,
          isGrouped: true,
          baseName: 'Suit',
          defaultVariantPath: defaultSuitVariant?.value || suitVariants[0]?.value || '',
          variants: suitVariants,
          isSuitGroup: true // Special marker for suit group
        })
      }
      
      // Add CHIA_FARMER group option if we have Chia Farmer variants (only for Clothes)
      if (layerName === 'Clothes' && chiaFarmerVariants.length > 0) {
        // Default to blue variant, or first available
        const defaultChiaFarmerVariant = chiaFarmerVariants.find(v => v.color === 'blue') || chiaFarmerVariants[0]
        const allChiaFarmerDisabled = chiaFarmerVariants.every(v => v.disabled)
        
        // Add hint text if disabled
        let chiaFarmerLabel = 'Chia Farmer'
        if (allChiaFarmerDisabled && noTeeOrTank) {
          chiaFarmerLabel = `${chiaFarmerLabel} ⓘ choose Tee or Tank Top first`
        }
        
        finalOptions.push({
          value: '__GROUP__CHIA_FARMER',
          label: chiaFarmerLabel,
          rawLabel: 'Chia Farmer',
          fullName: 'Chia Farmer',
          disabled: allChiaFarmerDisabled,
          isGrouped: true,
          baseName: 'Chia Farmer',
          defaultVariantPath: defaultChiaFarmerVariant?.value || chiaFarmerVariants[0]?.value || '',
          variants: chiaFarmerVariants,
          isChiaFarmerGroup: true // Special marker for Chia Farmer group
        })
      }
      
      // Add grouped bases (only if >1 variant, OR if it's Matrix Lenses which should always be grouped)
      groups.forEach((variants, baseName) => {
        const isMatrixLenses = baseName.toLowerCase().includes('matrix') && baseName.toLowerCase().includes('lenses')
        if (variants.length > 1 || isMatrixLenses) {
          // Multi-variant group: create single dropdown option
          // OR single-variant Matrix Lenses (special case to ensure it shows as grouped)
          const defaultVariant = getDefaultVariant(variants)
          
          // Special handling for Matrix Lenses - show without color in group label
          let baseFormattedLabel = formatDisplayLabel(baseName)
          if (isMatrixLenses) {
            baseFormattedLabel = 'Matrix Lenses'
          }
          
          // Check if any variant is disabled (group is disabled if all are disabled)
          const allDisabled = variants.every(v => v.disabled)
          
          finalOptions.push({
            value: `__GROUP__${baseName}`, // Special marker for grouped base
            label: baseFormattedLabel,
            rawLabel: baseName,
            fullName: baseName,
            disabled: allDisabled,
            isGrouped: true,
            baseName: baseName,
            defaultVariantPath: defaultVariant.value,
            variants: variants
          })
        } else {
          // Single variant group: treat as ungrouped
          finalOptions.push(variants[0])
        }
      })
      
      // Add ungrouped options
      ungrouped.forEach(opt => {
        finalOptions.push(opt)
      })
      
      // Sort final options alphabetically
      finalOptions.sort((a, b) => {
        const labelA = a.label || ''
        const labelB = b.label || ''
        return labelA.localeCompare(labelB)
      })
      
      // Add "None" option (except for Base, MouthBase, and Clothes layers)
      if (layerName !== 'Base' && layerName !== 'MouthBase' && layerName !== 'Clothes') {
        finalOptions.unshift({ value: '', label: 'None', disabled: false })
      }
      
      // Create path-to-suit-variant map for quick lookup
      const pathToSuitVariant = new Map()
      if (layerName === 'Clothes' && suitVariants.length > 0) {
        suitVariants.forEach(variant => {
          pathToSuitVariant.set(variant.value, variant)
        })
      }
      
      // Create path-to-chia-farmer-variant map for quick lookup
      const pathToChiaFarmerVariant = new Map()
      if (layerName === 'Clothes' && chiaFarmerVariants.length > 0) {
        chiaFarmerVariants.forEach(variant => {
          pathToChiaFarmerVariant.set(variant.value, variant)
        })
      }
      
      // Add capMcdVariant to Cap group metadata if it exists
      if (layerName === 'Head' && capMcdVariants.has('Cap')) {
        const capGroupOption = finalOptions.find(opt => opt.isGrouped && opt.baseName === 'Cap')
        if (capGroupOption) {
          capGroupOption.capMcdVariant = capMcdVariants.get('Cap')
        }
      }
      
      // Return options with grouping metadata
      return {
        options: finalOptions,
        groups,
        pathToGroup,
        suitVariants: suitVariants,
        pathToSuitVariant: pathToSuitVariant,
        chiaFarmerVariants: chiaFarmerVariants,
        pathToChiaFarmerVariant: pathToChiaFarmerVariant,
        capMcdVariants: capMcdVariants
      }
    }

    // Add "None" option (except for Base, MouthBase, and Clothes layers)
    if (layerName !== 'Base' && layerName !== 'MouthBase' && layerName !== 'Clothes') {
      allOptions.unshift({ value: '', label: 'None', disabled: false })
    }

    return {
      options: allOptions,
      groups: new Map(),
      pathToGroup: new Map(),
      suitVariants: [],
      pathToSuitVariant: new Map(),
      chiaFarmerVariants: [],
      pathToChiaFarmerVariant: new Map(),
      capMcdVariants: new Map()
    }
  }, [images, selectedLayers, layerName])

  useEffect(() => {
    // Store grouping metadata
    groupsRef.current = computedOptions.groups || new Map()
    pathToGroupRef.current = computedOptions.pathToGroup || new Map()
    suitVariantsRef.current = computedOptions.suitVariants || []
    pathToSuitVariantRef.current = computedOptions.pathToSuitVariant || new Map()
    chiaFarmerVariantsRef.current = computedOptions.chiaFarmerVariants || []
    pathToChiaFarmerVariantRef.current = computedOptions.pathToChiaFarmerVariant || new Map()
    capMcdVariantsRef.current = computedOptions.capMcdVariants || new Map()
    
    // Track last normal Cap selection (not McD)
    if (layerName === 'Head' && selectedValue) {
      const groupInfo = pathToGroupRef.current.get(selectedValue)
      if (groupInfo && groupInfo.baseName === 'Cap' && !groupInfo.isMcD) {
        lastCapNormalRef.current = selectedValue
      }
    }
    
    const optionsList = computedOptions.options || computedOptions
    
    setOptions(optionsList)
    
    // Special handling for Clothes layer when Chia Farmer is active
    let effectiveSelectedValue = selectedValue
    if (layerName === 'Clothes') {
      const clothesAddonPath = selectedLayers['ClothesAddon'] || ''
      // Standardize detection: use path-based check
      const hasChiaFarmer = clothesAddonPath && clothesAddonPath.includes('Chia-Farmer')
      if (hasChiaFarmer) {
        // Show Chia Farmer selection in dropdown, not the base Tee/Tank-top
        effectiveSelectedValue = clothesAddonPath
      }
    }
    
    // Set selected value - handle grouped selections
    if (effectiveSelectedValue) {
      // Special handling for Head layer: map Centurion paths to "__CENTURION__" proxy
      if (layerName === 'Head') {
        const centurionPaths = centurionPathsRef.current
        if (effectiveSelectedValue === centurionPaths.normal || effectiveSelectedValue === centurionPaths.masked) {
          const centurionProxy = optionsList.find(opt => opt.value === '__CENTURION__')
          if (centurionProxy) {
            setSelectedOption('__CENTURION__')
            return
          }
        }
      }
      
      // First check if this is a suit variant
      const suitVariant = pathToSuitVariantRef.current.get(effectiveSelectedValue)
      if (suitVariant && layerName === 'Clothes') {
        // This is a suit variant - show SUIT group in dropdown
        const suitGroupOption = optionsList.find(opt => opt.isGrouped && opt.isSuitGroup)
        if (suitGroupOption) {
          setSelectedOption(suitGroupOption.value)
        } else {
          setSelectedOption('')
        }
      } else if (layerName === 'Clothes') {
        // Check if this is a Chia Farmer variant
        const chiaFarmerVariant = pathToChiaFarmerVariantRef.current.get(effectiveSelectedValue)
        if (chiaFarmerVariant) {
          // This is a Chia Farmer variant - show CHIA_FARMER group in dropdown
          const chiaFarmerGroupOption = optionsList.find(opt => opt.isGrouped && opt.isChiaFarmerGroup)
          if (chiaFarmerGroupOption) {
            setSelectedOption(chiaFarmerGroupOption.value)
          } else {
            setSelectedOption('')
          }
        } else {
          // Not a suit or Chia Farmer variant - check regular groups
          const groupInfo = pathToGroupRef.current.get(effectiveSelectedValue)
          if (groupInfo && shouldGroup) {
            // This is a variant in a group - show the base in dropdown
            // Use case-insensitive comparison for baseName matching
            const groupOption = optionsList.find(opt => {
              if (!opt.isGrouped) return false
              const optBaseName = (opt.baseName || '').toLowerCase().trim()
              const groupBaseName = (groupInfo.baseName || '').toLowerCase().trim()
              return optBaseName === groupBaseName
            })
            if (groupOption) {
              setSelectedOption(groupOption.value)
            } else {
              // Fallback: try to find by checking if any variant path matches
              const fallbackGroup = Array.from(optionsList).find(opt => {
                if (!opt.isGrouped || !opt.variants) return false
                return opt.variants.some(v => v.value === effectiveSelectedValue)
              })
              if (fallbackGroup) {
                setSelectedOption(fallbackGroup.value)
              } else {
                setSelectedOption('')
              }
            }
          } else {
            // Fallback: check if selected value matches any variant in any group (for all layers)
            // This handles cases where pathToGroup lookup failed but grouping exists
            const fallbackGroup = Array.from(optionsList).find(opt => {
              if (!opt.isGrouped || !opt.variants) return false
              return opt.variants.some(v => v.value === effectiveSelectedValue)
            })
            if (fallbackGroup) {
              setSelectedOption(fallbackGroup.value)
            } else {
              // Normal ungrouped option
              const found = optionsList.find(opt => opt.value === effectiveSelectedValue)
              setSelectedOption(found ? found.value : '')
            }
          }
        }
      } else {
        // For non-Clothes layers, check regular groups
        const groupInfo = pathToGroupRef.current.get(effectiveSelectedValue)
        if (groupInfo && shouldGroup) {
          // This is a variant in a group - show the base in dropdown
          // Use case-insensitive comparison for baseName matching
          const groupOption = optionsList.find(opt => {
            if (!opt.isGrouped) return false
            const optBaseName = (opt.baseName || '').toLowerCase().trim()
            const groupBaseName = (groupInfo.baseName || '').toLowerCase().trim()
            return optBaseName === groupBaseName
          })
          if (groupOption) {
            setSelectedOption(groupOption.value)
          } else {
            // Fallback: try to find by checking if any variant path matches
            const fallbackGroup = Array.from(optionsList).find(opt => {
              if (!opt.isGrouped || !opt.variants) return false
              return opt.variants.some(v => v.value === effectiveSelectedValue)
            })
            if (fallbackGroup) {
              setSelectedOption(fallbackGroup.value)
            } else {
              setSelectedOption('')
            }
          }
        } else {
          // Fallback: check if selected value matches any variant in any group (for all layers)
          // This handles cases where pathToGroup lookup failed but grouping exists
          const fallbackGroup = Array.from(optionsList).find(opt => {
            if (!opt.isGrouped || !opt.variants) return false
            return opt.variants.some(v => v.value === effectiveSelectedValue)
          })
          if (fallbackGroup) {
            setSelectedOption(fallbackGroup.value)
          } else {
            // Normal ungrouped option
            const found = optionsList.find(opt => opt.value === effectiveSelectedValue)
            setSelectedOption(found ? found.value : '')
          }
        }
      }
    } else {
      setSelectedOption('')
    }
  }, [computedOptions, selectedValue, selectedLayers, layerName, shouldGroup])

  // Memoize change handler to prevent recreation
  const handleChange = useCallback((e) => {
    const value = e.target.value
    setSelectedOption(value)
    
    // Check if the selected option is disabled
    const selectedOpt = options.find(opt => opt.value === value)
    if (selectedOpt && selectedOpt.disabled) {
      // Don't proceed with selection if disabled
      return
    }
    
    // Handle Centurion proxy selection (Head layer only)
    if (layerName === 'Head' && value === '__CENTURION__') {
      // Compute if Centurion_mask is required based on current state
      const maskActive = selectedLayers['Mask'] && selectedLayers['Mask'] !== '' && selectedLayers['Mask'] !== 'None'
      const mouthItemActive = selectedLayers['MouthItem'] && selectedLayers['MouthItem'] !== '' && selectedLayers['MouthItem'] !== 'None'
      const mouthBasePath = (selectedLayers['MouthBase'] || '').toLowerCase()
      const mouthBaseHasPipePizzaBubble = mouthBasePath.includes('pipe') || mouthBasePath.includes('pizza') || mouthBasePath.includes('bubble')
      
      const centurionMaskRequired = maskActive || mouthItemActive || mouthBaseHasPipePizzaBubble
      
      // Resolve to correct asset path
      const centurionPaths = centurionPathsRef.current
      const actualValue = centurionMaskRequired 
        ? (centurionPaths.masked || centurionPaths.normal)
        : (centurionPaths.normal || centurionPaths.masked)
      
      if (actualValue) {
        onSelect(layerName, actualValue)
      } else {
        onSelect(layerName, '')
      }
      return
    }
    
    // Handle grouped base selection
    if (shouldGroup && value.startsWith('__GROUP__')) {
      // Extract base name
      const baseName = value.replace('__GROUP__', '')
      // Find group option - handle special cases like CHIA_FARMER vs "Chia Farmer" and SUIT vs "Suit"
      let groupOption = options.find(opt => {
        if (!opt.isGrouped) return false
        // Special case for Suit: match by isSuitGroup
        if (baseName === 'SUIT' && opt.isSuitGroup) return true
        // Special case for Chia Farmer: match by isChiaFarmerGroup or by value
        if (baseName === 'CHIA_FARMER' && opt.isChiaFarmerGroup) return true
        // For other groups, match by baseName (case-insensitive)
        const optBaseName = (opt.baseName || '').toLowerCase().trim()
        const searchBaseName = baseName.toLowerCase().trim()
        return optBaseName === searchBaseName
      })
      
      // Debug logging (dev mode only)
      if (import.meta.env.DEV && baseName === 'SUIT') {
        console.log('[Suit Selection]', {
          baseName,
          groupOption: groupOption ? {
            value: groupOption.value,
            baseName: groupOption.baseName,
            isSuitGroup: groupOption.isSuitGroup,
            defaultVariantPath: groupOption.defaultVariantPath
          } : null,
          allOptions: options.filter(opt => opt.isGrouped).map(opt => ({
            value: opt.value,
            baseName: opt.baseName,
            isSuitGroup: opt.isSuitGroup
          }))
        })
      }
      
      // Special handling for Head Cap: prefer last normal cap, never default to McD
      if (layerName === 'Head' && baseName === 'Cap') {
        if (lastCapNormalRef.current) {
          onSelect(layerName, lastCapNormalRef.current)
        } else if (groupOption && groupOption.defaultVariantPath) {
          onSelect(layerName, groupOption.defaultVariantPath)
        } else {
          onSelect(layerName, '')
        }
      } else if (groupOption && groupOption.defaultVariantPath) {
        // Special handling for Chia Farmer: write to ClothesAddon (canonical layer)
        if (groupOption.isChiaFarmerGroup) {
          onSelect('ClothesAddon', groupOption.defaultVariantPath)
          // Also ensure a Tee or Tank-top is selected in Clothes (rules will handle this)
        } else if (groupOption.isSuitGroup) {
          // Special handling for Suit: ensure we select the default variant path
          // This should NOT change the dropdown selection - it should stay as "Suit"
          onSelect(layerName, groupOption.defaultVariantPath)
        } else {
          // Auto-select default variant
          onSelect(layerName, groupOption.defaultVariantPath)
        }
      } else {
        onSelect(layerName, '')
      }
    } else {
      onSelect(layerName, value)
    }
  }, [layerName, onSelect, shouldGroup, options])

  // Memoize keyboard handler to prevent recreation on every render
  const handleKeyDown = useCallback((e) => {
    // If navigation system is active and this trait is focused, handle option navigation
    if (navigation && isFocusedTrait && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      navigation.navigateOptions(e.key === "ArrowDown" ? 'down' : 'up', (layerName, value) => {
        setSelectedOption(value)
        
        // Handle Centurion proxy selection (Head layer only)
        if (layerName === 'Head' && value === '__CENTURION__') {
          const maskActive = selectedLayers['Mask'] && selectedLayers['Mask'] !== '' && selectedLayers['Mask'] !== 'None'
          const mouthItemActive = selectedLayers['MouthItem'] && selectedLayers['MouthItem'] !== '' && selectedLayers['MouthItem'] !== 'None'
          const mouthBasePath = (selectedLayers['MouthBase'] || '').toLowerCase()
          const mouthBaseHasPipePizzaBubble = mouthBasePath.includes('pipe') || mouthBasePath.includes('pizza') || mouthBasePath.includes('bubble')
          
          const centurionMaskRequired = maskActive || mouthItemActive || mouthBaseHasPipePizzaBubble
          const centurionPaths = centurionPathsRef.current
          const actualValue = centurionMaskRequired 
            ? (centurionPaths.masked || centurionPaths.normal)
            : (centurionPaths.normal || centurionPaths.masked)
          
          if (actualValue) {
            onSelect(layerName, actualValue)
          } else {
            onSelect(layerName, '')
          }
          return
        }
        
        // Handle grouped base selection
        if (shouldGroup && value.startsWith('__GROUP__')) {
          const baseName = value.replace('__GROUP__', '')
          // Find group option - handle special cases like CHIA_FARMER vs "Chia Farmer"
          let groupOption = options.find(opt => {
            if (!opt.isGrouped) return false
            // Special case for Chia Farmer: match by isChiaFarmerGroup or by value
            if (baseName === 'CHIA_FARMER' && opt.isChiaFarmerGroup) return true
            // For other groups, match by baseName
            return opt.baseName === baseName
          })
          
          // Special handling for Head Cap: prefer last normal cap, never default to McD
          if (layerName === 'Head' && baseName === 'Cap') {
            if (lastCapNormalRef.current) {
              onSelect(layerName, lastCapNormalRef.current)
            } else if (groupOption && groupOption.defaultVariantPath) {
              onSelect(layerName, groupOption.defaultVariantPath)
            } else {
              onSelect(layerName, '')
            }
          } else if (groupOption && groupOption.defaultVariantPath) {
            // Special handling for Chia Farmer: write to ClothesAddon (canonical layer)
            if (groupOption.isChiaFarmerGroup) {
              onSelect('ClothesAddon', groupOption.defaultVariantPath)
              // Also ensure a Tee or Tank-top is selected in Clothes (rules will handle this)
            } else {
              onSelect(layerName, groupOption.defaultVariantPath)
            }
          } else {
            onSelect(layerName, '')
          }
        } else {
          onSelect(layerName, value)
        }
      })
      e.preventDefault()
      e.stopPropagation()
      return
    }

    // Fallback: local navigation if no global navigation system or not focused
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      e.stopPropagation()

      const currentIndex = options.findIndex(opt => opt.value === selectedOption)
      const dir = e.key === "ArrowDown" ? 1 : -1
      
      // If current option not found, start from first/last enabled option
      let startIndex = currentIndex >= 0 ? currentIndex : (dir === 1 ? -1 : options.length)
      let nextIndex = startIndex + dir
      
      // Find next enabled option
      while (nextIndex >= 0 && nextIndex < options.length) {
        const candidate = options[nextIndex]
        if (candidate && !candidate.disabled) {
          setSelectedOption(candidate.value)
          setFocusedIndex(nextIndex)
          
          // Handle Centurion proxy selection (Head layer only)
          if (layerName === 'Head' && candidate.value === '__CENTURION__') {
            const maskActive = selectedLayers['Mask'] && selectedLayers['Mask'] !== '' && selectedLayers['Mask'] !== 'None'
            const mouthItemActive = selectedLayers['MouthItem'] && selectedLayers['MouthItem'] !== '' && selectedLayers['MouthItem'] !== 'None'
            const mouthBasePath = (selectedLayers['MouthBase'] || '').toLowerCase()
            const mouthBaseHasPipePizzaBubble = mouthBasePath.includes('pipe') || mouthBasePath.includes('pizza') || mouthBasePath.includes('bubble')
            
            const centurionMaskRequired = maskActive || mouthItemActive || mouthBaseHasPipePizzaBubble
            const centurionPaths = centurionPathsRef.current
            const actualValue = centurionMaskRequired 
              ? (centurionPaths.masked || centurionPaths.normal)
              : (centurionPaths.normal || centurionPaths.masked)
            
            if (actualValue) {
              onSelect(layerName, actualValue)
            } else {
              onSelect(layerName, '')
            }
            break
          }
          
          // Handle grouped base selection (same as handleChange)
          if (shouldGroup && candidate.value.startsWith('__GROUP__')) {
            const baseName = candidate.value.replace('__GROUP__', '')
            
            // Special handling for Head Cap: prefer last normal cap, never default to McD
            if (layerName === 'Head' && baseName === 'Cap') {
              if (lastCapNormalRef.current) {
                onSelect(layerName, lastCapNormalRef.current)
              } else if (candidate.defaultVariantPath) {
                onSelect(layerName, candidate.defaultVariantPath)
              } else {
                onSelect(layerName, '')
              }
            } else if (candidate.defaultVariantPath) {
              // Special handling for Chia Farmer: write to ClothesAddon (canonical layer)
              if (candidate.isChiaFarmerGroup) {
                onSelect('ClothesAddon', candidate.defaultVariantPath)
                // Also ensure a Tee or Tank-top is selected in Clothes (rules will handle this)
              } else {
                onSelect(layerName, candidate.defaultVariantPath)
              }
            } else {
              onSelect(layerName, '')
            }
          } else {
            onSelect(layerName, candidate.value)
          }
          break
        }
        nextIndex += dir
      }
    } else if (e.key === "Enter") {
      // Enter selects the focused option
      if (navigation && isFocusedTrait) {
        navigation.selectFocusedOption((layerName, value) => {
          setSelectedOption(value)
          // Handle grouped base selection
          if (shouldGroup && value.startsWith('__GROUP__')) {
            const baseName = value.replace('__GROUP__', '')
            // Find group option - handle special cases like CHIA_FARMER vs "Chia Farmer"
            let groupOption = options.find(opt => {
              if (!opt.isGrouped) return false
              // Special case for Chia Farmer: match by isChiaFarmerGroup or by value
              if (baseName === 'CHIA_FARMER' && opt.isChiaFarmerGroup) return true
              // For other groups, match by baseName
              return opt.baseName === baseName
            })
            
            // Special handling for Head Cap: prefer last normal cap, never default to McD
            if (layerName === 'Head' && baseName === 'Cap') {
              if (lastCapNormalRef.current) {
                onSelect(layerName, lastCapNormalRef.current)
              } else if (groupOption && groupOption.defaultVariantPath) {
                onSelect(layerName, groupOption.defaultVariantPath)
              } else {
                onSelect(layerName, '')
              }
            } else if (groupOption && groupOption.defaultVariantPath) {
              // Special handling for Chia Farmer: write to ClothesAddon (canonical layer)
              if (groupOption.isChiaFarmerGroup) {
                onSelect('ClothesAddon', groupOption.defaultVariantPath)
                // Also ensure a Tee or Tank-top is selected in Clothes (rules will handle this)
              } else {
                onSelect(layerName, groupOption.defaultVariantPath)
              }
            } else {
              onSelect(layerName, '')
            }
          } else {
            onSelect(layerName, value)
          }
        })
      } else if (focusedIndex >= 0) {
        const focusedOption = options[focusedIndex]
        if (focusedOption && !focusedOption.disabled) {
          setSelectedOption(focusedOption.value)
          
          // Handle Centurion proxy selection (Head layer only)
          if (layerName === 'Head' && focusedOption.value === '__CENTURION__') {
            const maskActive = selectedLayers['Mask'] && selectedLayers['Mask'] !== '' && selectedLayers['Mask'] !== 'None'
            const mouthItemActive = selectedLayers['MouthItem'] && selectedLayers['MouthItem'] !== '' && selectedLayers['MouthItem'] !== 'None'
            const mouthBasePath = (selectedLayers['MouthBase'] || '').toLowerCase()
            const mouthBaseHasPipePizzaBubble = mouthBasePath.includes('pipe') || mouthBasePath.includes('pizza') || mouthBasePath.includes('bubble')
            
            const centurionMaskRequired = maskActive || mouthItemActive || mouthBaseHasPipePizzaBubble
            const centurionPaths = centurionPathsRef.current
            const actualValue = centurionMaskRequired 
              ? (centurionPaths.masked || centurionPaths.normal)
              : (centurionPaths.normal || centurionPaths.masked)
            
            if (actualValue) {
              onSelect(layerName, actualValue)
            } else {
              onSelect(layerName, '')
            }
          } else if (shouldGroup && focusedOption.value.startsWith('__GROUP__')) {
          // Handle grouped base selection (same as handleChange)
            const baseName = focusedOption.value.replace('__GROUP__', '')
            
            // Special handling for Head Cap: prefer last normal cap, never default to McD
            if (layerName === 'Head' && baseName === 'Cap') {
              if (lastCapNormalRef.current) {
                onSelect(layerName, lastCapNormalRef.current)
              } else if (focusedOption.defaultVariantPath) {
                onSelect(layerName, focusedOption.defaultVariantPath)
              } else {
                onSelect(layerName, '')
              }
            } else if (focusedOption.defaultVariantPath) {
              onSelect(layerName, focusedOption.defaultVariantPath)
            } else {
              onSelect(layerName, '')
            }
          } else {
            onSelect(layerName, focusedOption.value)
          }
        }
      }
      if (selectRef.current) {
        selectRef.current.blur()
      }
    }
  }, [navigation, isFocusedTrait, options, selectedOption, layerName, onSelect, focusedIndex, shouldGroup])

  // Handle focus to track which selector is active
  const handleFocus = () => {
    const currentIndex = options.findIndex(opt => opt.value === selectedOption)
    setFocusedIndex(currentIndex >= 0 ? currentIndex : 0)
  }

  const handleBlur = () => {
    setFocusedIndex(-1)
  }

  // Map layer names to display names
  const layerDisplayNames = {
    'MouthBase': 'Mouth Base',
    'MouthItem': 'Mouth Item',
    'FacialHair': 'Facial Hair',
    'ClothesAddon': 'Clothes Add-on',
    'Mouth': 'Mouth', // Keep for backwards compatibility
  }
  const displayName = layerDisplayNames[layerName] || layerName.charAt(0).toUpperCase() + layerName.slice(1)
  const disabledReason = disabled ? getDisabledReason(layerName, selectedLayers) : null


  // Check if ClothesAddon needs hint text (when Tee/Tank-top is not selected)
  const needsBaseClothes = layerName === 'ClothesAddon' && disabled && disabledReason === 'Choose Tee or Tank Top first'

  // Determine if we should show suit variant picker
  const shouldShowSuitPicker = useMemo(() => {
    if (layerName !== 'Clothes') return false
    if (!selectedValue && selectedOption !== '__GROUP__SUIT') return false
    
    // Show if selectedValue is a suit variant OR if dropdown shows SUIT group
    const isSuitVariant = pathToSuitVariantRef.current.has(selectedValue)
    const isSuitGroup = selectedOption === '__GROUP__SUIT'
    
    return isSuitVariant || isSuitGroup
  }, [layerName, selectedValue, selectedOption])
  
  // Determine if we should show Chia Farmer variant picker
  const shouldShowChiaFarmerPicker = useMemo(() => {
    if (layerName !== 'Clothes') return false
    if (shouldShowSuitPicker) return false // Mutually exclusive with Suit picker
    
    // Check if ClothesAddon has Chia Farmer (canonical layer)
    const clothesAddonPath = selectedLayers['ClothesAddon'] || ''
    const hasChiaFarmerInAddon = clothesAddonPath && pathToChiaFarmerVariantRef.current.has(clothesAddonPath)
    
    // Show if selectedValue is a Chia Farmer variant OR if dropdown shows CHIA_FARMER group
    const isChiaFarmerVariant = pathToChiaFarmerVariantRef.current.has(selectedValue) || hasChiaFarmerInAddon
    const isChiaFarmerGroup = selectedOption === '__GROUP__CHIA_FARMER'
    
    return (isChiaFarmerVariant || isChiaFarmerGroup) && !shouldShowSuitPicker
  }, [layerName, selectedValue, selectedOption, selectedLayers, shouldShowSuitPicker])
  
  // Get current suit selection state
  const currentSuitState = useMemo(() => {
    if (!shouldShowSuitPicker) return null
    
    const suitVariants = suitVariantsRef.current
    if (suitVariants.length === 0) return null
    
    // Parse current selection
    let currentSuitColor = null
    let currentAccessoryType = null
    let currentAccessoryColor = null
    
    if (selectedValue) {
      const suitVariant = pathToSuitVariantRef.current.get(selectedValue)
      if (suitVariant) {
        currentSuitColor = suitVariant.suitColor
        currentAccessoryType = suitVariant.accessoryType
        currentAccessoryColor = suitVariant.accessoryColor
      }
    }
    
    // If no current selection, use defaults from first variant
    if (!currentSuitColor && suitVariants.length > 0) {
      const first = suitVariants[0]
      currentSuitColor = first.suitColor
      currentAccessoryType = first.accessoryType
      currentAccessoryColor = first.accessoryColor
    }
    
    // Compute available options
    const availableSuitColors = [...new Set(suitVariants.map(v => v.suitColor))].sort()
    const availableTypes = [...new Set(
      suitVariants
        .filter(v => v.suitColor === currentSuitColor)
        .map(v => v.accessoryType)
    )].sort()
    
    // Get available accessory colors for current suit color + type
    const availableAccessoryColors = [...new Set(
      suitVariants
        .filter(v => v.suitColor === currentSuitColor && v.accessoryType === currentAccessoryType)
        .map(v => v.accessoryColor)
    )].sort()
    
    return {
      suitVariants,
      currentSuitColor,
      currentAccessoryType,
      currentAccessoryColor,
      availableSuitColors,
      availableTypes,
      availableAccessoryColors
    }
  }, [shouldShowSuitPicker, selectedValue])
  
  // Get current Chia Farmer selection state
  const currentChiaFarmerState = useMemo(() => {
    if (!shouldShowChiaFarmerPicker) return null
    
    const chiaFarmerVariants = chiaFarmerVariantsRef.current
    if (chiaFarmerVariants.length === 0) return null
    
    // Get current selection from ClothesAddon (canonical layer)
    const clothesAddonPath = selectedLayers['ClothesAddon'] || ''
    let currentColor = null
    
    if (clothesAddonPath) {
      const chiaFarmerVariant = pathToChiaFarmerVariantRef.current.get(clothesAddonPath)
      if (chiaFarmerVariant) {
        currentColor = chiaFarmerVariant.color
      }
    }
    
    // If no current selection, use default (blue)
    if (!currentColor && chiaFarmerVariants.length > 0) {
      const blueVariant = chiaFarmerVariants.find(v => v.color === 'blue')
      currentColor = blueVariant ? blueVariant.color : chiaFarmerVariants[0].color
    }
    
    // Get available colors
    const availableColors = [...new Set(chiaFarmerVariants.map(v => v.color))].sort()
    
    return {
      variants: chiaFarmerVariants,
      currentColor,
      availableColors
    }
  }, [shouldShowChiaFarmerPicker, selectedLayers])
  
  // Determine active group for color dots (non-suit groups)
  // Note: When Chia Farmer is selected, we still want to show Tee/Tank-top color dots
  const activeGroup = useMemo(() => {
    if (!shouldGroup || shouldShowSuitPicker) return null
    
    // When Chia Farmer is selected, check selectedLayers['Clothes'] to find Tee/Tank-top base
    let valueToCheck = selectedValue
    if (layerName === 'Clothes' && shouldShowChiaFarmerPicker) {
      // Chia Farmer is active - check Clothes layer for Tee/Tank-top base
      const clothesPath = selectedLayers['Clothes'] || ''
      if (clothesPath && !clothesPath.includes('Chia-Farmer')) {
        valueToCheck = clothesPath
      }
    }
    
    if (!valueToCheck) {
      // Also check if dropdown shows a grouped base
      if (selectedOption && selectedOption.startsWith('__GROUP__') && selectedOption !== '__GROUP__SUIT' && selectedOption !== '__GROUP__CHIA_FARMER') {
        const baseName = selectedOption.replace('__GROUP__', '')
        const variants = groupsRef.current.get(baseName)
        if (variants && variants.length > 1) {
          const groupOption = options.find(opt => opt.isGrouped && opt.baseName === baseName)
          return {
            baseName: baseName,
            variants: variants,
            activePath: selectedValue || variants[0]?.value,
            capMcdVariant: groupOption?.capMcdVariant || null
          }
        }
      }
      return null
    }
    
    // Check if valueToCheck path belongs to a group
    const groupInfo = pathToGroupRef.current.get(valueToCheck)
    if (groupInfo) {
      const variants = groupsRef.current.get(groupInfo.baseName)
      if (variants && variants.length > 1) {
        const groupOption = options.find(opt => opt.isGrouped && opt.baseName === groupInfo.baseName)
        return {
          baseName: groupInfo.baseName,
          variants: variants,
          activePath: valueToCheck,
          capMcdVariant: groupOption?.capMcdVariant || null
        }
      }
    }
    
    // Also check if dropdown shows a grouped base
    if (selectedOption && selectedOption.startsWith('__GROUP__') && selectedOption !== '__GROUP__SUIT' && selectedOption !== '__GROUP__CHIA_FARMER') {
      const baseName = selectedOption.replace('__GROUP__', '')
      const variants = groupsRef.current.get(baseName)
      if (variants && variants.length > 1) {
        const groupOption = options.find(opt => opt.isGrouped && opt.baseName === baseName)
        return {
          baseName: baseName,
          variants: variants,
          activePath: valueToCheck || variants[0]?.value,
          capMcdVariant: groupOption?.capMcdVariant || null
        }
      }
    }
    
    return null
  }, [shouldGroup, selectedValue, selectedOption, shouldShowSuitPicker, options, layerName, selectedLayers, shouldShowChiaFarmerPicker])

  // Helper function to find suit variant matching criteria
  const findSuitVariant = useCallback((suitColor, accessoryType, accessoryColor) => {
    const suitVariants = suitVariantsRef.current
    return suitVariants.find(v => 
      v.suitColor === suitColor && 
      v.accessoryType === accessoryType && 
      v.accessoryColor === accessoryColor
    )
  }, [])
  
  // Helper function to find first available variant for suit color + type
  const findFirstVariantForSuitAndType = useCallback((suitColor, accessoryType) => {
    const suitVariants = suitVariantsRef.current
    const matches = suitVariants.filter(v => 
      v.suitColor === suitColor && v.accessoryType === accessoryType
    )
    return matches.length > 0 ? matches[0] : null
  }, [])
  
  // Handler for suit color dot click
  const handleSuitColorClick = useCallback((suitColor) => {
    if (!currentSuitState) return
    
    const { currentAccessoryType, currentAccessoryColor } = currentSuitState
    
    // Try to preserve current accessory type + color
    let targetVariant = findSuitVariant(suitColor, currentAccessoryType, currentAccessoryColor)
    
    // If not available, try to preserve type with first available color
    if (!targetVariant) {
      targetVariant = findFirstVariantForSuitAndType(suitColor, currentAccessoryType)
    }
    
    // If still not available, get first variant for this suit color
    if (!targetVariant) {
      const suitVariants = suitVariantsRef.current
      targetVariant = suitVariants.find(v => v.suitColor === suitColor)
    }
    
    if (targetVariant) {
      onSelect(layerName, targetVariant.value)
    }
  }, [currentSuitState, layerName, onSelect, findSuitVariant, findFirstVariantForSuitAndType])
  
  // Handler for accessory type toggle
  const handleAccessoryTypeToggle = useCallback((accessoryType) => {
    if (!currentSuitState) return
    
    const { currentSuitColor, currentAccessoryColor } = currentSuitState
    
    // Try to preserve current accessory color
    let targetVariant = findSuitVariant(currentSuitColor, accessoryType, currentAccessoryColor)
    
    // If not available, get first variant for this suit color + type
    if (!targetVariant) {
      targetVariant = findFirstVariantForSuitAndType(currentSuitColor, accessoryType)
    }
    
    if (targetVariant) {
      onSelect(layerName, targetVariant.value)
    }
  }, [currentSuitState, layerName, onSelect, findSuitVariant, findFirstVariantForSuitAndType])
  
  // Handler for accessory color dot click
  const handleAccessoryColorClick = useCallback((accessoryColor) => {
    if (!currentSuitState) return
    
    const { currentSuitColor, currentAccessoryType } = currentSuitState
    
    const targetVariant = findSuitVariant(currentSuitColor, currentAccessoryType, accessoryColor)
    if (targetVariant) {
      onSelect(layerName, targetVariant.value)
    }
  }, [currentSuitState, layerName, onSelect, findSuitVariant])
  
  // Handler for Chia Farmer color dot click
  const handleChiaFarmerColorClick = useCallback((color) => {
    if (!currentChiaFarmerState) return
    
    const { variants } = currentChiaFarmerState
    const targetVariant = variants.find(v => v.color === color)
    
    if (targetVariant) {
      // Write to ClothesAddon (canonical layer)
      onSelect('ClothesAddon', targetVariant.value)
    }
  }, [currentChiaFarmerState, onSelect])

  // Get tooltip content (only if tooltip is enabled)
  const tooltipContent = !disableTooltip ? (
    disabled && disabledReason 
      ? `${displayName}: ${disabledReason}`
      : selectedOption && options.find(opt => opt.value === selectedOption)
      ? `${displayName}: ${options.find(opt => opt.value === selectedOption)?.label || 'Selected'}`
      : `${displayName}: Select a trait`
  ) : null

  // Debug: Log computed styles after render
  useEffect(() => {
    if (shouldGroup && shouldShowSuitPicker && currentSuitState && !shouldShowChiaFarmerPicker) {
      setTimeout(() => {
        const picker = document.querySelector('#wojak-generator .suit-variant-picker');
        const row = document.querySelector('#wojak-generator .suit-variant-row');
        const slot = document.querySelector('#wojak-generator .trait-dot-slot');
        if (picker && row && slot) {
          // Styles are now enforced via inline styles on mobile
        }
      }, 100);
    }
  }, [shouldGroup, shouldShowSuitPicker, currentSuitState, shouldShowChiaFarmerPicker]);

  const selectorContent = (
    <div 
      className={`trait-selector-wrapper ${isFocusedTrait ? 'trait-focused' : ''}`}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      {/* Fixed-height message slot - always rendered for ALL rows to prevent layout shift */}
      <div className="trait-message-slot">
        {/* Reserved space - message shown inside select when disabled */}
      </div>
      <Label 
        htmlFor={`select-${layerName}`} 
        className="trait-label"
        style={{ 
          marginTop: isFirstRow ? '-6px' : '-14px', // First row stays in place, others move higher
          marginBottom: '0px', // Spacing below label (reduced to 0)
          transform: isFirstRow ? 'translateY(0)' : 'translateY(-4px)', // Additional transform for non-first rows
          paddingBottom: '0px' // Reduced padding below label to 0
        }}
      >
        {displayName}:
      </Label>
      <div 
        className="trait-select-wrapper"
        style={{
          marginTop: isFirstRow ? '0px' : '-4px', // First row stays in place, others move higher - MUST match CSS (reduced from -12px to bring closer to label)
          transform: isFirstRow ? 'translateY(0)' : 'translateY(-4px)', // Additional transform for non-first rows
          ...((shouldGroup && activeGroup && activeGroup.variants.length > 1 && !shouldShowSuitPicker) ? {
            display: 'flex',
            gap: '8px',
            width: '100%'
          } : (shouldGroup && shouldShowSuitPicker && currentSuitState && !shouldShowChiaFarmerPicker) ? {
            display: 'flex',
            gap: '4px',
            width: '100%',
            minWidth: 0,
            overflow: 'visible'
          } : undefined)
        }}
      >
        {/* Main dropdown - always show, but smaller when suit is selected */}
        <Select
          ref={selectRef}
          id={`select-${layerName}`}
          value={selectedOption}
          onChange={handleChange}
          onInput={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          options={loading ? [{ value: '', label: 'Loading...' }] : options}
          disabled={loading || disabled}
          className={`trait-select ${isFocusedTrait ? 'trait-select-focused' : ''} ${disabled && disabledReason ? 'has-disabled-message' : ''}`}
          style={(shouldGroup && activeGroup && activeGroup.variants.length > 1 && !shouldShowSuitPicker) ? {
            width: '50%',
            minWidth: 0,
            boxSizing: 'border-box',
            flex: '0 0 50%'
          } : (shouldGroup && shouldShowSuitPicker && currentSuitState && !shouldShowChiaFarmerPicker) ? {
            width: 'calc(25% - 3px)',
            minWidth: 0,
            maxWidth: 'calc(25% - 3px)',
            boxSizing: 'border-box',
            flex: '0 0 calc(25% - 3px)'
          } : { width: '100%', minWidth: 0, boxSizing: 'border-box' }}
        />
        {/* Color dropdown - shown when color options are available */}
        {shouldGroup && activeGroup && activeGroup.variants.length > 1 && !shouldShowSuitPicker && (
          <Select
            id={`select-${layerName}-color`}
            value={activeGroup.activePath || ''}
            onChange={(e) => {
              const selectedColorValue = e.target.value
              if (selectedColorValue) {
                onSelect(layerName, selectedColorValue)
              }
            }}
            options={activeGroup.variants.map(variant => {
              const isBaseVariant = !variant.color || !variant.hex
              const label = isBaseVariant 
                ? 'Base' 
                : variant.color ? variant.color.charAt(0).toUpperCase() + variant.color.slice(1) 
                : 'Default'
              return {
                value: variant.value,
                label: label
              }
            })}
            disabled={loading || disabled}
            className="trait-select trait-color-select"
            style={{
              width: '50%',
              minWidth: 0,
              boxSizing: 'border-box',
              flex: '0 0 50%'
            }}
          />
        )}
        {/* Suit dropdowns - three dropdowns: suit color, accessory type (Tie/Bow), and accessory color */}
        {shouldGroup && shouldShowSuitPicker && currentSuitState && !shouldShowChiaFarmerPicker && (
          <>
            {/* Suit color dropdown */}
            <Select
              id={`select-${layerName}-suit-color`}
              value={currentSuitState.currentSuitColor || ''}
              onChange={(e) => {
                const suitColor = e.target.value
                if (suitColor && currentSuitState) {
                  handleSuitColorClick(suitColor)
                }
              }}
              options={currentSuitState.availableSuitColors.map(color => ({
                value: color,
                label: color.charAt(0).toUpperCase() + color.slice(1)
              }))}
              disabled={loading || disabled}
              className="trait-select trait-suit-select"
              style={{
                width: 'calc(25% - 3px)',
                minWidth: 0,
                maxWidth: 'calc(25% - 3px)',
                boxSizing: 'border-box',
                flex: '0 0 calc(25% - 3px)'
              }}
            />
            {/* Accessory type dropdown (Tie/Bow) */}
            <Select
              id={`select-${layerName}-accessory-type`}
              value={currentSuitState.currentAccessoryType || ''}
              onChange={(e) => {
                const accessoryType = e.target.value
                if (accessoryType && currentSuitState) {
                  handleAccessoryTypeToggle(accessoryType)
                }
              }}
              options={currentSuitState.availableTypes.map(type => ({
                value: type,
                label: type.charAt(0).toUpperCase() + type.slice(1).toUpperCase()
              }))}
              disabled={loading || disabled || currentSuitState.availableTypes.length === 0}
              className="trait-select trait-suit-select"
              style={{
                width: 'calc(25% - 3px)',
                minWidth: 0,
                maxWidth: 'calc(25% - 3px)',
                boxSizing: 'border-box',
                flex: '0 0 calc(25% - 3px)'
              }}
            />
            {/* Accessory color dropdown */}
            <Select
              id={`select-${layerName}-accessory-color`}
              value={currentSuitState.currentAccessoryColor || ''}
              onChange={(e) => {
                const accessoryColor = e.target.value
                if (accessoryColor && currentSuitState) {
                  handleAccessoryColorClick(accessoryColor)
                }
              }}
              options={currentSuitState.availableAccessoryColors && currentSuitState.availableAccessoryColors.length > 0 ? currentSuitState.availableAccessoryColors.map(color => ({
                value: color,
                label: color.charAt(0).toUpperCase() + color.slice(1)
              })) : []}
              disabled={loading || disabled || !currentSuitState.availableAccessoryColors || currentSuitState.availableAccessoryColors.length === 0}
              className="trait-select trait-suit-select"
              style={{
                width: 'calc(25% - 3px)',
                minWidth: 0,
                maxWidth: 'calc(25% - 3px)',
                boxSizing: 'border-box',
                flex: '0 0 calc(25% - 3px)'
              }}
            />
          </>
        )}
        {disabled && disabledReason && (
          <span className="trait-disabled-message">{disabledReason}</span>
        )}
      </div>
      {/* Fixed-height slot for variant pickers - ALWAYS rendered to prevent layout shift */}
      <div 
        className="trait-dot-slot"
        style={isMobile ? { display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', paddingLeft: '4px', paddingRight: '4px' } : undefined}
      >
          {/* Suit variant picker - REMOVED: Now using three dropdowns instead of color dots and buttons */}
        {/* Color variant picker - HIDDEN: Now using color dropdown instead of dots
            Show even when Chia Farmer is selected (Tee/Tank-top dots come first) */}
        {false && shouldGroup && activeGroup && activeGroup.variants.length > 1 && !shouldShowSuitPicker && (
          <div 
            className="color-variant-picker"
            style={isMobile ? { 
              display: 'flex', 
              flexDirection: 'row', 
              flexWrap: 'nowrap', 
              alignItems: 'center', 
              width: '100%', 
              minWidth: 0,
              maxWidth: 'none',
              overflowX: 'auto', 
              overflowY: 'hidden', 
              gap: '8px', 
              paddingLeft: '4px', 
              paddingRight: '4px',
              position: 'relative',
              zIndex: 1
            } : undefined}
          >
            <div 
              className={`color-dots ${layerName === 'Head' && activeGroup.baseName === 'Cap' && activeGroup.capMcdVariant && selectedValue === activeGroup.capMcdVariant.value ? 'is-muted' : ''}`}
              style={isMobile ? { display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', width: '100%', overflowX: 'auto', overflowY: 'hidden', gap: '8px', padding: '6px 4px' } : undefined}
            >
              {activeGroup.variants.map(variant => {
                // Include base variants (no color) as well as color variants
                const isBaseVariant = !variant.color || !variant.hex
                const isColorVariant = variant.color && variant.hex
                
                // Skip if neither base nor color variant (shouldn't happen, but safety check)
                if (!isBaseVariant && !isColorVariant) return null
                
                const isActive = variant.value === activeGroup.activePath
                const variantDisabled = variant.disabled || disabled
                
                // Determine dot style: base variant gets special styling
                const dotStyle = isBaseVariant 
                  ? { 
                      backgroundColor: '#e0e0e0', // Light gray for base
                      border: '2px solid #808080', // Darker gray border
                      ['--dot-color']: '#e0e0e0'
                    }
                  : { 
                      backgroundColor: variant.hex, 
                      ['--dot-color']: variant.hex 
                    }
                
                const ariaLabel = isBaseVariant
                  ? 'Set to base variant (remove color)'
                  : `Set color: ${variant.color.charAt(0).toUpperCase() + variant.color.slice(1)}`
                
                return (
                  <button
                    key={variant.value}
                    type="button"
                    className={`color-dot ${isActive ? 'active' : ''} ${isBaseVariant ? 'base-variant' : ''}`}
                    style={dotStyle}
                    onClick={() => !variantDisabled && onSelect(layerName, variant.value)}
                    disabled={variantDisabled}
                    aria-label={ariaLabel}
                    onMouseDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  />
                )
              })}
            </div>
            {/* McD icon button for Head Cap variants */}
            {layerName === 'Head' && activeGroup.baseName === 'Cap' && activeGroup.capMcdVariant && (
              <button
                type="button"
                className={`cap-mcd-button ${selectedValue === activeGroup.capMcdVariant.value ? 'active' : ''}`}
                onClick={() => !disabled && onSelect('Head', activeGroup.capMcdVariant.value)}
                disabled={disabled}
                aria-label="Select McDonald's Cap"
                title="McD Cap"
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <img src="/wojak-creator/CLOTHES/McD.png" alt="McD" />
              </button>
            )}
          </div>
        )}
        {/* Visual divider between Tee/Tank-top dots and Chia Farmer dots */}
        {shouldGroup && shouldShowChiaFarmerPicker && currentChiaFarmerState && !shouldShowSuitPicker && (
          (() => {
            // Check if there's a Tee/Tank-top base with variants to show divider
            const clothesPath = selectedLayers['Clothes'] || ''
            const hasTeeOrTankBase = clothesPath && (
              clothesPath.includes('Tee') || 
              clothesPath.includes('Tank-Top') || 
              clothesPath.includes('tank-top')
            ) && !clothesPath.includes('Chia-Farmer')
            
            if (!hasTeeOrTankBase) return null
            
            // Check if this base has variants
            const groupInfo = pathToGroupRef.current.get(clothesPath)
            const hasVariants = groupInfo && groupsRef.current.get(groupInfo.baseName)?.length > 1
            
            return hasVariants ? (
              <div className="chia-farmer-divider">
                <div className="divider-line"></div>
              </div>
            ) : null
          })()
        )}
        {/* Chia Farmer variant picker - single row color dots (rendered AFTER Tee/Tank-top dots) */}
        {shouldGroup && shouldShowChiaFarmerPicker && currentChiaFarmerState && !shouldShowSuitPicker && (
          <div 
            className="chia-farmer-variant-picker"
            style={isMobile ? { display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', width: '100%', overflowX: 'auto', overflowY: 'hidden', gap: '8px', paddingLeft: '4px', paddingRight: '4px' } : undefined}
          >
            <div 
              className="color-dots"
              style={isMobile ? { display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', width: '100%', overflowX: 'auto', overflowY: 'hidden', gap: '8px', padding: '6px 4px' } : undefined}
            >
              {currentChiaFarmerState.availableColors.map(color => {
                const isActive = color === currentChiaFarmerState.currentColor
                const colorHex = COLOR_TOKENS[color] || '#000000'
                
                return (
                  <button
                    key={color}
                    type="button"
                    className={`color-dot ${isActive ? 'active' : ''}`}
                    style={{ backgroundColor: colorHex, ['--dot-color']: colorHex }}
                    onClick={() => handleChiaFarmerColorClick(color)}
                    disabled={disabled}
                    aria-label={`Set Chia Farmer color: ${color.charAt(0).toUpperCase() + color.slice(1)}`}
                    onMouseDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  />
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  if (disableTooltip) {
    return selectorContent
  }

  return (
    <Tooltip content={tooltipContent} position="right" delay={200}>
      {selectorContent}
    </Tooltip>
  )
}

// Memoize LayerSelector to prevent unnecessary re-renders
// Only re-render if props actually change
export default memo(LayerSelector, (prevProps, nextProps) => {
  // Re-render if these props change
  return (
    prevProps.layerName === nextProps.layerName &&
    prevProps.selectedValue === nextProps.selectedValue &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.traitIndex === nextProps.traitIndex &&
    prevProps.disableTooltip === nextProps.disableTooltip &&
    // Deep compare selectedLayers (only relevant layers for this selector)
    prevProps.selectedLayers?.[prevProps.layerName] === nextProps.selectedLayers?.[nextProps.layerName] &&
    // Compare navigation focused trait index
    prevProps.navigation?.focusedTraitIndex === nextProps.navigation?.focusedTraitIndex
  )
})

