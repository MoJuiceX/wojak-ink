/**
 * Wojak Creator Rules System
 * 
 * This file contains rules that govern which layer combinations are allowed.
 * Rules can disable layers based on selections in other layers.
 * 
 * To add a new rule:
 * 1. Add a new function that checks the condition
 * 2. Add it to the RULES array
 * 3. The function should return an object with:
 *    - disabledLayers: array of layer names to disable
 *    - reason: optional message explaining why
 */

/**
 * Check if a path contains a specific image identifier
 * @param {string} path - Image path
 * @param {string} identifier - Identifier to search for (e.g., "Astronaut")
 * @returns {boolean}
 */
function pathContains(path, identifier) {
  if (!path) return false
  return path.toLowerCase().includes(identifier.toLowerCase())
}

/**
 * Rule: Base must never be None - auto-default to Classic
 * Normalization step: If user selects any trait while Base is None/empty, auto-set Base to Classic
 * This runs early as a normalization step before computing disabledTraits
 * @param {Object} selectedLayers - Object mapping layer names to selected image paths
 * @returns {Object} Object with forceSelections
 */
function ruleBaseNeverNone(selectedLayers) {
  const basePath = selectedLayers['Base']
  const isBaseEmpty = !basePath || basePath === '' || basePath === 'None'
  
  // Check if any other trait is selected (excluding Base itself)
  const hasAnyOtherTrait = Object.keys(selectedLayers).some(layerName => {
    if (layerName === 'Base') return false
    const layerValue = selectedLayers[layerName]
    return layerValue && layerValue !== '' && layerValue !== 'None'
  })
  
  // If Base is empty and any other trait is selected, auto-set Base to Classic
  if (isBaseEmpty && hasAnyOtherTrait) {
    // Classic base path: /wojak-creator/BASE/BASE_Base-Wojak_classic.png
    const classicPath = '/wojak-creator/BASE/BASE_Base-Wojak_classic.png'
    return {
      disabledLayers: [],
      forceSelections: {
        Base: classicPath,
      },
    }
  }
  
  return { disabledLayers: [] }
}

/**
 * Rule: If Astronaut clothes is selected, disable Head layer
 * @param {Object} selectedLayers - Object mapping layer names to selected image paths
 * @returns {Object} Object with disabledLayers array
 */
function ruleAstronautNoHead(selectedLayers) {
  const clothesPath = selectedLayers['Clothes']
  
  if (pathContains(clothesPath, 'Astronaut')) {
    return {
      disabledLayers: ['Head'],
      reason: 'Astronaut suit includes helmet - head trait not available'
    }
  }
  
  return { disabledLayers: [] }
}

/**
 * Rule 1: FacialHair can only be selected with certain MouthBase options
 * FacialHair requires MouthBase to be one of: numb, teeth, golden teeth, smile, screaming, pizza, pipe
 * BUT FacialHair can be combined with MouthItem (cig, joint, cohiba)
 * 
 * Behavior:
 * - User can select FacialHair even when MouthBase is None
 * - When FacialHair is selected and MouthBase is None or not allowed, auto-set MouthBase to Numb
 * - After auto-setting, facial hair remains selected and enabled
 * - User can change MouthBase to any allowed mouth traits while keeping facial hair
 * - If user changes MouthBase to disallowed mouth later, facial hair is auto-cleared
 * 
 * @param {Object} selectedLayers - Object mapping layer names to selected image paths
 * @returns {Object} Object with disabledLayers, clearSelections, forceSelections
 */
function ruleFacialHairRequiresMouthBase(selectedLayers) {
  const mouthBasePath = selectedLayers['MouthBase']
  const facialHairPath = selectedLayers['FacialHair']
  
  // Allowed MouthBase options for FacialHair
  const allowedMouthBases = ['numb', 'teeth', 'gold', 'smile', 'screeming', 'screaming', 'pizza', 'pipe']
  
  // Check if MouthBase is selected and it's not allowed with FacialHair
  // This check happens first to prioritize MouthBase selection over FacialHair
  if (mouthBasePath && mouthBasePath !== '') {
    const isAllowed = allowedMouthBases.some(allowed => pathContains(mouthBasePath, allowed))
    if (!isAllowed && facialHairPath) {
      // MouthBase changed to disallowed option (like Bubble Gum), clear FacialHair
      return {
        disabledLayers: ['FacialHair'],
        reason: 'Facial hair requires mouth base: numb, teeth, golden teeth, smile, screaming, pizza, or pipe',
        clearSelections: ['FacialHair'], // Clear if incompatible
      }
    }
  }
  
  // Check if FacialHair is selected
  if (facialHairPath) {
    // Check if MouthBase is one of the allowed options
    const hasAllowedMouthBase = mouthBasePath && mouthBasePath !== '' && allowedMouthBases.some(allowed => 
      pathContains(mouthBasePath, allowed)
    )
    
    // If FacialHair is selected but MouthBase is not allowed (e.g., Bubble Gum), change to Numb
    if (!hasAllowedMouthBase && mouthBasePath && mouthBasePath !== '' && mouthBasePath !== 'None') {
      // MouthBase is incompatible (like Bubble Gum) - change it to Numb
      const numbPath = "/wojak-creator/MOUTH/MOUTH_numb.png"
      return {
        disabledLayers: [], // Don't disable FacialHair - allow selection
        reason: 'Facial hair requires mouth base - changing to Numb',
        forceSelections: {
          MouthBase: numbPath, // Change incompatible MouthBase (Bubble Gum) to Numb
        },
      }
    }
    
    // If FacialHair is selected but MouthBase is None or empty, auto-set to Numb
    if (!hasAllowedMouthBase && (!mouthBasePath || mouthBasePath === '' || mouthBasePath === 'None')) {
      const numbPath = "/wojak-creator/MOUTH/MOUTH_numb.png"
      return {
        disabledLayers: [], // Don't disable FacialHair - allow selection
        reason: 'Facial hair requires mouth base - auto-setting to Numb',
        forceSelections: {
          MouthBase: numbPath, // Auto-set MouthBase to Numb
        },
      }
    }
  }
  
  // FacialHair is never disabled based on MouthBase being None
  // User can always select FacialHair, and MouthBase will be auto-set to Numb
  return { disabledLayers: [] }
}

/**
 * Rule 2: Mask blocks MouthItem and FacialHair
 * If Mask is selected, disable and clear MouthItem and FacialHair
 * @param {Object} selectedLayers - Object mapping layer names to selected image paths
 * @returns {Object} Object with disabledLayers array
 */
function ruleMaskBlocksOtherLayers(selectedLayers) {
  const maskPath = selectedLayers['Mask']
  
  if (maskPath) {
    return {
      disabledLayers: ['MouthItem', 'FacialHair'],
      reason: 'Mask selected — other mouth/extra traits disabled'
    }
  }
  
  return { disabledLayers: [] }
}

/**
 * Rule 3: ClothesAddon only works with Tee or Tanktop
 * ClothesAddon is only enabled if Clothes is Tee or Tanktop
 * @param {Object} selectedLayers - Object mapping layer names to selected image paths
 * @returns {Object} Object with disabledLayers array
 */
function ruleClothesAddonRequiresTeeOrTanktop(selectedLayers) {
  const clothesPath = selectedLayers['Clothes']
  const clothesAddonPath = selectedLayers['ClothesAddon']
  
  // Check if ClothesAddon (internal) has Chia Farmer selected
  const hasChiaFarmerAddon = clothesAddonPath && (
    pathContains(clothesAddonPath, 'Chia-Farmer') || 
    pathContains(clothesAddonPath, 'Chia Farmer')
  )
  
  // Check if Clothes (base layer) is Tee or Tanktop
  // Note: Clothes can be Tee/Tank-top OR temporarily Chia Farmer (which gets moved to ClothesAddon)
  const isTeeOrTanktop = clothesPath && (
    pathContains(clothesPath, 'Tee') || 
    pathContains(clothesPath, 'Tank-Top') ||
    pathContains(clothesPath, 'tank-top')
  ) && !pathContains(clothesPath, 'Chia-Farmer') // Exclude Chia Farmer from base check
  
  // Check if user is trying to select Chia Farmer in Clothes dropdown
  const isSelectingChiaFarmer = clothesPath && (
    pathContains(clothesPath, 'Chia-Farmer') || 
    pathContains(clothesPath, 'Chia Farmer')
  )
  
  // CORRECT BEHAVIOR:
  // 1. If NO Tee/Tank Top is selected, disable Chia Farmer options
  if (!isTeeOrTanktop && !hasChiaFarmerAddon) {
    return {
      disabledLayers: [],
      disabledOptions: {
        Clothes: ['Chia Farmer', 'Chia-Farmer'], // Disable Chia Farmer options
      },
    }
  }
  
  // 2. If Chia Farmer is selected (in ClothesAddon) but no Tee/Tank-top exists, auto-insert Tee Blue
  if (hasChiaFarmerAddon && !isTeeOrTanktop) {
    return {
      disabledLayers: [],
      forceSelections: {
        Clothes: '/wojak-creator/CLOTHES/CLOTHES_Tee_blue.png', // Auto-insert Tee Blue
      },
      disabledOptions: {
        Clothes: ['Astronaut', 'Hoodie', 'Jacket', 'Sweater'], // Disable non-Tee/Tank-top options
      },
    }
  }
  
  // 3. If user is selecting Chia Farmer but no Tee/Tank-top exists yet, auto-insert Tee Blue
  if (isSelectingChiaFarmer && !isTeeOrTanktop) {
    return {
      disabledLayers: [],
      forceSelections: {
        Clothes: '/wojak-creator/CLOTHES/CLOTHES_Tee_blue.png', // Auto-insert Tee Blue
      },
      disabledOptions: {
        Clothes: ['Astronaut', 'Hoodie', 'Jacket', 'Sweater'], // Disable non-Tee/Tank-top options
      },
    }
  }
  
  // 4. If Chia Farmer is active (in ClothesAddon), allow all clothes to be selectable
  // When user selects a non-Tee/Tank-top item, Chia Farmer will be automatically cleared
  // (handled by useMemeGenerator.js selectLayerInternal logic)
  if (hasChiaFarmerAddon && isTeeOrTanktop) {
    // Chia Farmer is selected + Tee/Tank-top exists
    // Allow all clothing items to be selectable - selecting non-Tee/Tank-top will clear Chia Farmer
    return {
      disabledLayers: [],
      clearSelections: [], // No need to clear here - useMemeGenerator.js handles it when selection changes
      // NOTE: All clothing items remain selectable, including non-Tee/Tank-top items
      // When user selects a non-Tee/Tank-top item, the existing logic in useMemeGenerator.js
      // will automatically clear ClothesAddon (Chia Farmer)
    }
  }
  
  // 5. Normal state: Tee/Tank-top is selected, Chia Farmer is not selected
  // Everything is available (normal state)
  return { disabledLayers: [] }
}

/**
 * Rule: Copium Mask forces valid MouthBase
 * If Copium Mask is selected, only allow compatible mouth bases (Teeth/Gold/Smile/Screaming/Numb)
 * If Pizza, Bubble Gum, or empty/None is selected, force to Numb
 * Disables Pizza and Bubble Gum options in the dropdown
 * @param {Object} selectedLayers - Object mapping layer names to selected image paths
 * @returns {Object} Object with forceSelections and disabledOptions
 */
function ruleCopiumMaskForcesValidMouthBase(selectedLayers) {
  const mask = selectedLayers?.Mask
  const mouthBase = selectedLayers?.MouthBase

  const isCopium = typeof mask === "string" && pathContains(mask, "Copium-Mask")

  if (!isCopium) return { disabledLayers: [] }

  // Check if MouthBase is Pizza, Bubble Gum, or empty/None
  const isPizza = typeof mouthBase === "string" && pathContains(mouthBase, "Pizza")
  const isBubbleGum = typeof mouthBase === "string" && pathContains(mouthBase, "Bubble-Gum")
  const isEmpty = !mouthBase || mouthBase === "" || mouthBase === "None"

  // If user currently has a forbidden mouth selected, auto-correct to Numb
  if (isPizza || isBubbleGum || isEmpty) {
    const numbPath = "/wojak-creator/MOUTH/MOUTH_numb.png"
    return {
      disabledLayers: [],
      reason: "Copium Mask requires a compatible mouth base.",
      forceSelections: {
        MouthBase: numbPath,
      },
      disabledOptions: {
        MouthBase: ["Pizza", "Bubble-Gum", "Bubble Gum"], // Disable these options in dropdown
      },
    }
  }

  // Disable Pizza and Bubble Gum options even if current selection is valid
  return {
    disabledLayers: [],
    disabledOptions: {
      MouthBase: ["Pizza", "Bubble-Gum", "Bubble Gum"], // Disable these options in dropdown
    },
  }
}

/**
 * Rule: Mask forces MouthBase to Numb
 * If any Mask (except Copium) is selected, automatically set MouthBase to Numb and clear MouthItem
 * @param {Object} selectedLayers - Object mapping layer names to selected image paths
 * @returns {Object} Object with forceSelections
 */
function ruleMaskForcesNumbMouth(selectedLayers) {
  const mask = selectedLayers?.Mask
  const mouthBase = selectedLayers?.MouthBase

  const hasMask = mask && mask !== "" && mask !== "None"
  
  // Skip this rule for Copium Mask (handled by ruleCopiumMaskForcesValidMouthBase)
  const isCopium = typeof mask === "string" && pathContains(mask, "Copium-Mask")
  if (isCopium) return { disabledLayers: [] }

  if (!hasMask) return { disabledLayers: [] }

  // Find the path to the numb mouth - construct it based on the pattern
  // Path should be: /wojak-creator/MOUTH/MOUTH_numb.png
  const numbPath = "/wojak-creator/MOUTH/MOUTH_numb.png"

  // If mask is selected, force MouthBase = Numb and clear MouthItem
  return {
    disabledLayers: [],
    reason: "Mask selected — mouth must be Numb.",
    forceSelections: {
      MouthBase: numbPath,
      MouthItem: "",
    },
  }
}

/**
 * Rule: Pipe disables MouthItem
 * If Pipe is selected in MouthBase, disable and clear MouthItem
 * @param {Object} selectedLayers - Object mapping layer names to selected image paths
 * @returns {Object} Object with disabledLayers array and clearSelections
 */
function rulePipeDisablesMouthItem(selectedLayers) {
  const mouthBase = selectedLayers?.MouthBase
  const isPipe = typeof mouthBase === "string" && pathContains(mouthBase, "Pipe")

  if (!isPipe) return { disabledLayers: [] }

  return {
    disabledLayers: ["MouthItem"],
    reason: "Remove Pipe.",
    clearSelections: ["MouthItem"],
  }
}

/**
 * Rule: Cig/Joint/Cohiba requires MouthBase
 * If Cig, Joint, or Cohiba is selected in MouthItem AND MouthBase is None/empty,
 * automatically set MouthBase to Numb
 * User can still change MouthBase after this auto-selection
 * @param {Object} selectedLayers - Object mapping layer names to selected image paths
 * @returns {Object} Object with forceSelections (only when MouthBase is None)
 */
function ruleCigJointCohibaRequiresMouthBase(selectedLayers) {
  const mouthItem = selectedLayers?.MouthItem
  const mouthBase = selectedLayers?.MouthBase

  // Check if MouthItem is Cig, Joint, or Cohiba
  const isCig = typeof mouthItem === "string" && pathContains(mouthItem, "Cig")
  const isJoint = typeof mouthItem === "string" && pathContains(mouthItem, "Joint")
  const isCohiba = typeof mouthItem === "string" && pathContains(mouthItem, "Cohiba")
  
  if (!isCig && !isJoint && !isCohiba) return { disabledLayers: [] }

  // Only force Numb if MouthBase is currently None/empty
  const isMouthBaseNone = !mouthBase || mouthBase === "" || mouthBase === "None"
  
  if (isMouthBaseNone) {
    const numbPath = "/wojak-creator/MOUTH/MOUTH_numb.png"
    return {
      disabledLayers: [],
      reason: "Cig/Joint/Cohiba requires a mouth base — auto-set to Numb.",
      forceSelections: {
        MouthBase: numbPath,
      },
    }
  }

  // If MouthBase is already set, do nothing (user can change it freely)
  return { disabledLayers: [] }
}

/**
 * Rule 4: Pizza disables MouthItem
 * If Pizza is selected in MouthBase, disable and clear MouthItem
 * @param {Object} selectedLayers - Object mapping layer names to selected image paths
 * @returns {Object} Object with disabledLayers array and clearSelections
 */
function rulePizzaDisablesMouthItem(selectedLayers) {
  const mouthBase = selectedLayers?.MouthBase || selectedLayers?.mouthBase
  const isPizza = typeof mouthBase === "string" && mouthBase.toLowerCase().includes("pizza")

  if (!isPizza) return { disabledLayers: [] }

  return {
    disabledLayers: ["MouthItem"],
    reason: "Remove Pizza.",
    clearSelections: ["MouthItem"],
  }
}

/**
 * Rule: Bubble Gum disables MouthItem
 * If Bubble Gum is selected in MouthBase, disable and clear MouthItem
 * @param {Object} selectedLayers - Object mapping layer names to selected image paths
 * @returns {Object} Object with disabledLayers array and forceSelections
 */
function ruleBubbleGumDisablesMouthItem(selectedLayers) {
  const mouthBase = selectedLayers?.MouthBase
  const isBubbleGum = typeof mouthBase === "string" && pathContains(mouthBase, "Bubble-Gum")

  if (!isBubbleGum) return { disabledLayers: [] }

  return {
    disabledLayers: ["MouthItem"],
    reason: "Remove Bubble Gum.",
    clearSelections: ["MouthItem"],
  }
}

/**
 * Array of all rules to check
 * Add new rules here as they are created
 * Order matters: rules earlier in the array take precedence
 */
/**
 * Rule: Tyson Tattoo requires Hannibal Mask
 * Tyson Tattoo can only exist if Hannibal Mask is selected
 * If Hannibal Mask is removed, auto-clear Tyson Tattoo
 * @param {Object} selectedLayers - Object mapping layer names to selected image paths
 * @returns {Object} Object with clearSelections
 */
function ruleTysonTattooRequiresHannibalMask(selectedLayers) {
  const maskPath = selectedLayers['Mask']
  const eyesPath = selectedLayers['Eyes']
  
  // Check if Hannibal Mask is selected
  const hasHannibalMask = maskPath && (
    pathContains(maskPath, 'Hannibal-Mask') || 
    pathContains(maskPath, 'Hannibal_Mask')
  )
  
  // Check if Tyson Tattoo is selected
  const hasTysonTattoo = eyesPath && (
    pathContains(eyesPath, 'Tyson-Tattoo') || 
    pathContains(eyesPath, 'Tyson_Tattoo')
  )
  
  // If Tyson Tattoo is selected but no Hannibal Mask, clear Tyson Tattoo
  if (hasTysonTattoo && !hasHannibalMask) {
    return {
      disabledLayers: [],
      clearSelections: ['Eyes'], // Clear Eyes (Tyson Tattoo) if no Hannibal Mask
      forceSelections: {
        Eyes: '', // Clear Tyson Tattoo
      },
    }
  }
  
  return { disabledLayers: [] }
}

/**
 * Rule: Astronaut disables all Mouth(Item) traits
 * If Astronaut is selected: disable MouthItem layer and force MouthItem to None
 * @param {Object} selectedLayers - Object mapping layer names to selected image paths
 * @returns {Object} Object with disabledLayers, forceSelections, and clearSelections
 */
function ruleAstronautDisablesMouthItem(selectedLayers) {
  const clothesPath = selectedLayers['Clothes']
  const mouthItemPath = selectedLayers['MouthItem']
  
  const hasAstronaut = clothesPath && pathContains(clothesPath, 'Astronaut')
  
  // If Astronaut is selected: disable MouthItem layer and force MouthItem to None
  if (hasAstronaut) {
    return {
      disabledLayers: ['MouthItem'],
      reason: 'Astronaut helmet — mouth items disabled',
      forceSelections: {
        MouthItem: '', // Force MouthItem to None
      },
      clearSelections: ['MouthItem'], // Clear MouthItem if it was selected
    }
  }
  
  return { disabledLayers: [] }
}

/**
 * Rule: Astronaut and Mask are mutually exclusive
 * If Astronaut is selected: disable Mask layer and force Mask to None
 * If Mask is selected: disable Astronaut option in Clothes
 * @param {Object} selectedLayers - Object mapping layer names to selected image paths
 * @returns {Object} Object with disabledLayers, disabledOptions, forceSelections, and reasons
 */
function ruleAstronautMaskMutualExclusion(selectedLayers) {
  const clothesPath = selectedLayers['Clothes']
  const maskPath = selectedLayers['Mask']
  
  const hasAstronaut = clothesPath && pathContains(clothesPath, 'Astronaut')
  const hasMask = maskPath && maskPath !== '' && maskPath !== 'None'
  
  // If Astronaut is selected: disable Mask layer and force Mask to None
  if (hasAstronaut) {
    return {
      disabledLayers: ['Mask'],
      reason: 'Deselect Astronaut first',
      forceSelections: {
        Mask: '', // Force Mask to None
      },
      clearSelections: ['Mask'], // Clear Mask if it was selected
    }
  }
  
  // If Mask is selected: disable Astronaut option in Clothes
  if (hasMask) {
    return {
      disabledLayers: [],
      disabledOptions: {
        Clothes: ['Astronaut'], // Disable Astronaut option
      },
      reason: 'Deselect Mask first', // This will be used for the hint on Astronaut option
    }
  }
  
  return { disabledLayers: [] }
}

const RULES = [
  ruleBaseNeverNone,                  // ✅ Base normalization: auto-set Classic when any trait selected (must be first)
  ruleCopiumMaskForcesValidMouthBase, // ✅ Copium Mask special handling
  ruleMaskForcesNumbMouth,            // ✅ other masks force MouthBase to Numb
  rulePipeDisablesMouthItem,          // ✅ pipe in MouthBase blocks MouthItem
  ruleCigJointCohibaRequiresMouthBase, // ✅ Cig/Joint/Cohiba auto-sets MouthBase to Numb if None
  rulePizzaDisablesMouthItem,         // ✅ pizza blocks MouthItem
  ruleBubbleGumDisablesMouthItem,     // ✅ bubble gum blocks MouthItem
  // ruleTysonTattooRequiresHannibalMask, // DISABLED: Tyson Tattoo can now be used without mask
  ruleAstronautDisablesMouthItem,     // ✅ Astronaut disables all MouthItem traits
  ruleAstronautMaskMutualExclusion,   // ✅ Astronaut and Mask are mutually exclusive
  ruleAstronautNoHead,
  ruleFacialHairRequiresMouthBase,
  ruleMaskBlocksOtherLayers,
  ruleClothesAddonRequiresTeeOrTanktop,
]

/**
 * Get all disabled layers based on current selections
 * @param {Object} selectedLayers - Object mapping layer names to selected image paths
 * @returns {Object} Object with:
 *   - disabledLayers: Set of layer names that should be disabled
 *   - reasons: Map of layer name to reason message
 *   - clearSelections: Array of layer names that should be cleared
 *   - forceSelections: Object mapping layer names to forced values
 *   - disabledOptions: Object mapping layer names to arrays of option identifiers to disable
 */
export function getDisabledLayers(selectedLayers) {
  const disabledSet = new Set()
  const reasons = {}
  const clearSet = new Set()
  const forceSelections = {}
  const disabledOptions = {}
  
  // Run all rules
  for (const rule of RULES) {
    const result = rule(selectedLayers)
    
    if (result.disabledLayers && result.disabledLayers.length > 0) {
      result.disabledLayers.forEach(layerName => {
        disabledSet.add(layerName)
        if (result.reason) {
          reasons[layerName] = result.reason
        }
      })
    }
    
    // Collect layers that should be cleared
    if (result.clearSelections && result.clearSelections.length > 0) {
      result.clearSelections.forEach(layerName => {
        clearSet.add(layerName)
      })
    }
    
    // Collect forced selections (later rules override earlier ones)
    if (result.forceSelections && typeof result.forceSelections === 'object') {
      Object.assign(forceSelections, result.forceSelections)
    }
    
    // Collect disabled options (merge arrays for same layer)
    if (result.disabledOptions && typeof result.disabledOptions === 'object') {
      Object.keys(result.disabledOptions).forEach(layerName => {
        if (!disabledOptions[layerName]) {
          disabledOptions[layerName] = []
        }
        // Merge arrays, avoiding duplicates
        const newOptions = result.disabledOptions[layerName]
        if (Array.isArray(newOptions)) {
          newOptions.forEach(option => {
            if (!disabledOptions[layerName].includes(option)) {
              disabledOptions[layerName].push(option)
            }
          })
        }
      })
    }
  }
  
  return {
    disabledLayers: Array.from(disabledSet),
    reasons,
    clearSelections: Array.from(clearSet),
    forceSelections,
    disabledOptions
  }
}

/**
 * Check if a specific layer is disabled
 * @param {string} layerName - Name of the layer to check
 * @param {Object} selectedLayers - Current layer selections
 * @returns {boolean}
 */
export function isLayerDisabled(layerName, selectedLayers) {
  const { disabledLayers } = getDisabledLayers(selectedLayers)
  return disabledLayers.includes(layerName)
}

/**
 * Get the reason why a layer is disabled (if any)
 * @param {string} layerName - Name of the layer
 * @param {Object} selectedLayers - Current layer selections
 * @returns {string|null} Reason message or null if not disabled
 */
export function getDisabledReason(layerName, selectedLayers) {
  const { reasons } = getDisabledLayers(selectedLayers)
  
  // General rule: If MouthItem is disabled due to a MouthBase selection, show "Remove [item name]"
  if (layerName === 'MouthItem' && reasons[layerName]) {
    const mouthBase = selectedLayers['MouthBase']
    
    if (mouthBase && typeof mouthBase === "string") {
      const mouthBaseLower = mouthBase.toLowerCase()
      
      // Check for Pipe
      if (pathContains(mouthBase, "Pipe")) {
        return 'Remove Pipe.'
      }
      
      // Check for Pizza
      if (mouthBaseLower.includes("pizza")) {
        return 'Remove Pizza.'
      }
      
      // Check for Bubble Gum
      if (pathContains(mouthBase, "Bubble-Gum") || mouthBaseLower.includes("bubble gum")) {
        return 'Remove Bubble Gum.'
      }
    }
  }
  
  // Special handling for MouthItem and FacialHair when mask is selected
  if ((layerName === 'MouthItem' || layerName === 'FacialHair') && reasons[layerName]) {
    const maskPath = selectedLayers['Mask']
    if (maskPath && maskPath !== '' && maskPath !== 'None') {
      return 'Remove Mask.'
    }
  }
  
  return reasons[layerName] || null
}

