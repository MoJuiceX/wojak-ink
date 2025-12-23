import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { LAYER_ORDER } from '../lib/memeLayers'
import { loadImage, preloadImages } from '../utils/imageUtils'
import { getDisabledLayers } from '../utils/wojakRules'
import { debounce } from '../utils/debounce'
import { getAllLayerImages } from '../lib/memeImageManifest'

export function useMemeGenerator() {
  const [selectedLayers, setSelectedLayers] = useState({})
  const [layerVisibility, setLayerVisibility] = useState({})
  const canvasRef = useRef(null)
  const [isRendering, setIsRendering] = useState(false)
  
  // Memoize layer composition for faster lookups
  const layerComposition = useMemo(() => {
    return LAYER_ORDER.map(layer => ({
      name: layer.name,
      folder: layer.folder,
      zIndex: layer.zIndex
    }))
  }, [])
  
  // Memoize image paths for currently selected layers (for faster rendering)
  const selectedImagePaths = useMemo(() => {
    return Object.entries(selectedLayers)
      .filter(([_, path]) => path && path !== '')
      .map(([_, path]) => path)
  }, [selectedLayers])

  // Initialize visibility for all layers
  useEffect(() => {
    const initialVisibility = {}
    LAYER_ORDER.forEach(layer => {
      initialVisibility[layer.name] = true
    })
    setLayerVisibility(initialVisibility)
  }, [])

  // Pick a random valid image path for a layer (used for Clothes default on open).
  // Excludes "None" and optionally excludes substrings (e.g. Chia-Farmer overlay).
  const resolveRandomValidPath = (layerName, options = {}) => {
    const { excludeSubstrings = [] } = options
    const images = getAllLayerImages(layerName) || []
    if (!images.length) return null

    const isValid = (img) => {
      const p = (img?.path || '').trim()
      const dn = (img?.displayName || '').trim().toLowerCase()
      if (!p) return false
      if (p.toLowerCase().includes('none')) return false
      if (dn.includes('none')) return false
      const lowerPath = p.toLowerCase()
      for (const sub of excludeSubstrings) {
        if (sub && lowerPath.includes(String(sub).toLowerCase())) return false
      }
      return true
    }

    const valid = images.filter(isValid)
    if (!valid.length) return null

    // Use crypto RNG when available (more uniform, less predictable), fallback to Math.random.
    let idx = 0
    try {
      if (window?.crypto?.getRandomValues) {
        const arr = new Uint32Array(1)
        window.crypto.getRandomValues(arr)
        idx = arr[0] % valid.length
      } else {
        idx = Math.floor(Math.random() * valid.length)
      }
    } catch {
      idx = Math.floor(Math.random() * valid.length)
    }

    return valid[idx]?.path || null
  }

  // Resolve an image path from the manifest by displayName (no hardcoded asset paths).
  // Used for deterministic defaults on generator open.
  const resolveDefaultPathByName = (layerName, desiredDisplayName) => {
    const images = getAllLayerImages(layerName) || []
    if (!images.length) return null

    const desired = String(desiredDisplayName || '').trim().toLowerCase()
    if (!desired) return null

    const isValid = (img) => {
      const p = (img?.path || '').trim()
      const dn = (img?.displayName || '').trim().toLowerCase()
      if (!p) return false
      if (p.toLowerCase().includes('none')) return false
      if (dn.includes('none')) return false
      return true
    }

    const valid = images.filter(isValid)
    if (!valid.length) return null

    // Prefer exact displayName match (case-insensitive)
    const exact = valid.find(img => String(img.displayName || '').trim().toLowerCase() === desired)
    if (exact?.path) return exact.path

    // Fallbacks if naming varies slightly
    const starts = valid.find(img => String(img.displayName || '').trim().toLowerCase().startsWith(desired))
    if (starts?.path) return starts.path

    const includes = valid.find(img => String(img.displayName || '').trim().toLowerCase().includes(desired))
    if (includes?.path) return includes.path

    return null
  }

  // Internal selectLayer function (not debounced for immediate state updates)
  const selectLayerInternal = useCallback((layerName, imagePath) => {
    setSelectedLayers(prev => {
      const newLayers = {
        ...prev,
        [layerName]: imagePath
      }
      
      // Special handling: Chia Farmer is an overlay, not a base replacement
      if (layerName === 'Clothes' && imagePath) {
        const isChiaFarmer = imagePath.includes('Chia-Farmer') || imagePath.includes('EXTRA-on-tee,tank-top_CLOTHES_Chia-Farmer')
        if (isChiaFarmer) {
          // Chia Farmer selected: store in ClothesAddon for rendering (overlay layer)
          newLayers['ClothesAddon'] = imagePath
          // Keep previous Clothes selection if it's Tee/Tank-top (base layer)
          const prevClothes = prev['Clothes']
          const prevIsTeeOrTank = prevClothes && (
            prevClothes.includes('Tee') || 
            prevClothes.includes('Tank-Top') ||
            prevClothes.includes('tank-top')
          ) && !prevClothes.includes('Chia-Farmer') // Make sure previous wasn't Chia Farmer
          
          if (prevIsTeeOrTank) {
            // Keep the Tee/Tank-top in Clothes (base layer)
            newLayers['Clothes'] = prevClothes
          } else {
            // No Tee/Tank-top exists - rules will auto-insert Tee Blue via forceSelections
            // For now, keep Chia Farmer in Clothes so rules can detect it
            // Rules will then force Tee Blue into Clothes and Chia Farmer stays in ClothesAddon
          }
        } else {
          // Non-Chia-Farmer selected in Clothes
          const prevClothesAddon = prev['ClothesAddon']
          const prevWasChiaFarmer = prevClothesAddon && (
            prevClothesAddon.includes('Chia-Farmer') || 
            prevClothesAddon.includes('EXTRA-on-tee,tank-top_CLOTHES_Chia-Farmer')
          )
          
          // If user selects a non-Tee/Tank-top item, clear Chia Farmer addon
          const isTeeOrTank = imagePath.includes('Tee') || 
                             imagePath.includes('Tank-Top') ||
                             imagePath.includes('tank-top')
          
          if (prevWasChiaFarmer && !isTeeOrTank) {
            // User selected non-Tee/Tank-top, clear Chia Farmer addon
            newLayers['ClothesAddon'] = ''
          } else if (prevWasChiaFarmer && isTeeOrTank) {
            // User switched Tee/Tank-top, keep Chia Farmer addon
            newLayers['ClothesAddon'] = prevClothesAddon
          }
        }
      }
      
      // Special handling: Centurion vs Centurion_mask based on Mask selection
      // When Mask changes, adjust Head selection if needed
      if (layerName === 'Mask') {
        const headPath = newLayers['Head'] || ''
        const hasMask = imagePath && imagePath !== '' && imagePath !== 'None'
        const pathLower = (headPath || '').toLowerCase()
        const isCenturion = pathLower.includes('centurion') && !pathLower.includes('centurion_mask')
        const isCenturionMask = pathLower.includes('centurion_mask')
        
        if (hasMask && isCenturion) {
          // Mask selected but Head is Centurion (not mask version) - switch to Centurion_mask
          const centurionMaskPath = headPath.replace(/centurion/i, 'Centurion_mask').replace(/\.png/i, '.png')
          // Try to find the actual Centurion_mask path from manifest
          const headImages = getAllLayerImages('Head') || []
          const centurionMaskImage = headImages.find(img => 
            (img.path || '').toLowerCase().includes('centurion_mask')
          )
          if (centurionMaskImage) {
            newLayers['Head'] = centurionMaskImage.path
          } else {
            // Fallback: clear Head if Centurion_mask not found
            newLayers['Head'] = ''
          }
        } else if (!hasMask && isCenturionMask) {
          // Mask cleared but Head is Centurion_mask - switch to Centurion
          const centurionPath = headPath.replace(/centurion_mask/i, 'Centurion').replace(/\.png/i, '.png')
          // Try to find the actual Centurion path from manifest
          const headImages = getAllLayerImages('Head') || []
          const centurionImage = headImages.find(img => {
            const path = (img.path || '').toLowerCase()
            return path.includes('centurion') && !path.includes('centurion_mask')
          })
          if (centurionImage) {
            newLayers['Head'] = centurionImage.path
          } else {
            // Fallback: clear Head if Centurion not found
            newLayers['Head'] = ''
          }
        }
      }
      
      // When Head changes, ensure it matches Mask selection
      if (layerName === 'Head' && imagePath) {
        const maskPath = newLayers['Mask'] || ''
        const hasMask = maskPath && maskPath !== '' && maskPath !== 'None'
        const pathLower = (imagePath || '').toLowerCase()
        const isCenturion = pathLower.includes('centurion') && !pathLower.includes('centurion_mask')
        const isCenturionMask = pathLower.includes('centurion_mask')
        
        if (hasMask && isCenturion) {
          // Mask exists but Head is Centurion (not mask version) - switch to Centurion_mask
          const headImages = getAllLayerImages('Head') || []
          const centurionMaskImage = headImages.find(img => 
            (img.path || '').toLowerCase().includes('centurion_mask')
          )
          if (centurionMaskImage) {
            newLayers['Head'] = centurionMaskImage.path
          } else {
            newLayers['Head'] = ''
          }
        } else if (!hasMask && isCenturionMask) {
          // No mask but Head is Centurion_mask - switch to Centurion
          const headImages = getAllLayerImages('Head') || []
          const centurionImage = headImages.find(img => {
            const path = (img.path || '').toLowerCase()
            return path.includes('centurion') && !path.includes('centurion_mask')
          })
          if (centurionImage) {
            newLayers['Head'] = centurionImage.path
          } else {
            newLayers['Head'] = ''
          }
        }
      }
      
      // Check if any layers should be disabled after this selection
      const { disabledLayers, clearSelections, forceSelections } = getDisabledLayers(newLayers)
      
      // Clear selections for layers that are now disabled or explicitly marked for clearing
      const clearedLayers = { ...newLayers }
      disabledLayers.forEach(disabledLayer => {
        if (clearedLayers[disabledLayer]) {
          clearedLayers[disabledLayer] = ''
        }
      })
      
      // Also clear any layers explicitly marked for clearing by rules
      if (clearSelections && clearSelections.length > 0) {
        clearSelections.forEach(layerName => {
          clearedLayers[layerName] = ''
        })
      }
      
      // Apply forced selections (rules that automatically set layer values)
      if (forceSelections && Object.keys(forceSelections).length > 0) {
        Object.entries(forceSelections).forEach(([layerName, value]) => {
          clearedLayers[layerName] = value
        })
      }
      
      return clearedLayers
    })
  }, [])

  // Enforce generator defaults on open:
  // - Base => Classic
  // - MouthBase => Numb
  // - Clothes => Random valid (excluding Chia-Farmer overlay)
  //
  // Rules:
  // - Apply ONLY if unset/empty/'None' (never override user picks).
  // - Use manifest lookup (no hardcoded filenames).
  // - Apply via selectLayerInternal so existing rules/forceSelections stay consistent.
  useEffect(() => {
    const hasValue = (v) => {
      if (v == null) return false
      const s = String(v).trim()
      if (!s) return false
      if (s.toLowerCase() === 'none') return false
      return true
    }

    const baseAlready = hasValue(selectedLayers?.Base)
    const mouthAlready = hasValue(selectedLayers?.MouthBase)
    const clothesAlready = hasValue(selectedLayers?.Clothes)

    if (baseAlready && mouthAlready && clothesAlready) return

    const baseClassicPath = baseAlready ? null : resolveDefaultPathByName('Base', 'Classic')
    const mouthNumbPath = mouthAlready ? null : resolveDefaultPathByName('MouthBase', 'Numb')
    const clothesRandomPath = clothesAlready
      ? null
      : resolveRandomValidPath('Clothes', { excludeSubstrings: ['chia-farmer'] })

    if (baseClassicPath) selectLayerInternal('Base', baseClassicPath)
    if (mouthNumbPath) selectLayerInternal('MouthBase', mouthNumbPath)
    if (clothesRandomPath) selectLayerInternal('Clothes', clothesRandomPath)
  }, [selectedLayers, selectLayerInternal])
  
  // Debounced selectLayer to prevent rapid state updates (100ms delay)
  const selectLayer = useMemo(
    () => debounce(selectLayerInternal, 100),
    [selectLayerInternal]
  )
  
  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      selectLayer.cancel?.()
    }
  }, [selectLayer])

  const toggleLayerVisibility = useCallback((layerName) => {
    setLayerVisibility(prev => ({
      ...prev,
      [layerName]: !prev[layerName]
    }))
  }, [])

  // Memoize canvas dimensions to prevent layout reflow
  const canvasDimensions = useMemo(() => ({
    width: 800,
    height: 800
  }), [])
  
  // Memoize layer rendering order for consistent composition
  const renderOrder = useMemo(() => {
    return layerComposition.slice().sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
  }, [layerComposition])
  
  // Helper: Check if a selection value is real (not empty/null/none)
  const hasRealSelection = useCallback((v) => {
    if (v == null) return false
    const s = String(v).trim()
    if (!s) return false
    if (s.toLowerCase() === 'none') return false
    return true
  }, [])
  
  // Memoize Tyson Tattoo paths from manifest (build once, use many times)
  const tysonTattooPaths = useMemo(() => {
    const images = getAllLayerImages('Eyes') || []
    const paths = new Set(
      images
        .filter(img => {
          const displayName = (img?.displayName || '').toLowerCase()
          return displayName.includes('tyson') && displayName.includes('tattoo')
        })
        .map(img => img.path)
        .filter(Boolean)
    )
    
    // DEV-only logging
    if (import.meta.env.DEV) {
      if (paths.size === 0) {
        const allDisplayNames = images
          .map(img => img?.displayName || img?.name || '')
          .filter(Boolean)
        console.warn('[DEV] TYSON_PATHS is empty. Available Eyes displayNames:', allDisplayNames)
      } else {
        console.log('[DEV] Tyson Tattoo paths found:', Array.from(paths))
      }
    }
    
    return paths
  }, [])
  
  // Memoize Ninja Turtle Mask paths from manifest (build once, use many times)
  const ninjaTurtleMaskPaths = useMemo(() => {
    const images = getAllLayerImages('Eyes') || []
    const paths = new Set(
      images
        .filter(img => {
          const displayName = (img?.displayName || '').toLowerCase()
          return displayName.includes('ninja') && displayName.includes('turtle') && displayName.includes('mask')
        })
        .map(img => img.path)
        .filter(Boolean)
    )
    
    // DEV-only warning if no Ninja Turtle Mask paths found
    if (import.meta.env.DEV) {
      if (paths.size === 0) {
        const allDisplayNames = images
          .map(img => img?.displayName || img?.name || '')
          .filter(Boolean)
        console.warn('[DEV] NINJA_TURTLE_MASK_PATHS is empty. Available Eyes displayNames:', allDisplayNames)
      } else {
        console.log('[DEV] Ninja Turtle Mask paths found:', Array.from(paths))
      }
    }
    
    return paths
  }, [])
  
  // Helper: Check if a path is a Tyson Tattoo path
  const isTysonTattooPath = useCallback((path) => {
    return !!path && tysonTattooPaths.has(path)
  }, [tysonTattooPaths])
  
  // Helper: Check if a path is a Ninja Turtle Mask path
  const isNinjaTurtleMaskPath = useCallback((path) => {
    return !!path && ninjaTurtleMaskPaths.has(path)
  }, [ninjaTurtleMaskPaths])
  
  // Debounced render function to prevent rapid re-renders
  const renderCanvasInternal = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    setIsRendering(true)
    const ctx = canvas.getContext('2d', { 
      willReadFrequently: false, // Optimize for drawing, not reading
      alpha: true 
    })
    
    // Set canvas size if not set (prevent layout reflow by setting once)
    // Use memoized dimensions to ensure consistency
    if (canvas.width !== canvasDimensions.width || canvas.height !== canvasDimensions.height) {
      canvas.width = canvasDimensions.width
      canvas.height = canvasDimensions.height
    }
    
    // Clear canvas efficiently (use GPU-accelerated clear)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    try {
      // Compute once per render (outside loop for efficiency)
      const eyesPath = selectedLayers['Eyes']
      const maskPath = selectedLayers['Mask']
      const hasMask = hasRealSelection(maskPath)
      const isTysonSelected = isTysonTattooPath(eyesPath)
      const isNinjaSelected = isNinjaTurtleMaskPath(eyesPath)
      
      // Detect if mask is one that covers Ninja Turtle Mask (Copium, Hannibal, or Bandana)
      const isMaskThatCoversNinja = !!maskPath && (
        maskPath.toLowerCase().includes('copium') ||
        maskPath.toLowerCase().includes('hannibal') ||
        maskPath.toLowerCase().includes('bandana')
      )
      
      // DEV-only debugging when Tyson is selected
      if (import.meta.env.DEV && isTysonSelected) {
        console.log('[DEV] Tyson Tattoo rendering:', {
          hasMask,
          eyesPath,
          isTysonDetected: isTysonSelected
        })
      }
      
      // DEV-only debugging when Ninja is selected
      if (import.meta.env.DEV && isNinjaSelected) {
        console.log('[DEV] Ninja Turtle Mask rendering:', {
          eyesPath,
          maskPath,
          isMaskThatCoversNinja,
          isNinjaSelected
        })
      }
      
      // Helper to detect Hannibal Mask specifically (for HannibalMask virtual layer)
      const hasHannibalMask = !!maskPath && (
        maskPath.includes('Hannibal-Mask') || maskPath.includes('Hannibal_Mask')
      )
      
      // Render layers in memoized order (prevents re-sorting on every render)
      for (const layer of renderOrder) {
        const layerName = layer.name
        const isVisible = layerVisibility[layerName] !== false
        let imagePath = selectedLayers[layerName]

        // Handle virtual layers: Astronaut, HannibalMask, and TysonTattoo
        if (layerName === 'Astronaut') {
          // Astronaut is stored in Clothes layer, extract it
          const clothesPath = selectedLayers['Clothes']
          if (clothesPath && (clothesPath.includes('Astronaut') || clothesPath.includes('astronaut'))) {
            imagePath = clothesPath
          } else {
            imagePath = null // Don't render if not Astronaut
          }
        } else if (layerName === 'HannibalMask') {
          // HannibalMask is stored in Mask layer, extract it
          if (maskPath && (maskPath.includes('Hannibal-Mask') || maskPath.includes('Hannibal_Mask'))) {
            imagePath = maskPath
          } else {
            imagePath = null // Don't render if not Hannibal Mask
          }
        } else if (layerName === 'TysonTattoo') {
          // TysonTattoo virtual layer: ONLY render when ANY mask exists AND Eyes is TysonTattoo
          // This virtual layer exists ONLY to draw TysonTattoo under the mask
          imagePath = (hasMask && isTysonSelected) ? eyesPath : null
        } else if (layerName === 'NinjaTurtleUnderMask') {
          // NinjaTurtleUnderMask virtual layer: ONLY render when covering mask exists AND Eyes is Ninja Turtle Mask
          // This virtual layer exists ONLY to draw Ninja Turtle Mask under covering masks (Copium, Hannibal, Bandana)
          imagePath = (isMaskThatCoversNinja && isNinjaSelected) ? eyesPath : null
        } else if (layerName === 'Clothes') {
          // Exclude Astronaut from regular Clothes rendering (it's handled by virtual layer)
          const clothesPath = selectedLayers['Clothes']
          if (clothesPath && (clothesPath.includes('Astronaut') || clothesPath.includes('astronaut'))) {
            imagePath = null // Skip Astronaut in regular Clothes layer (renders in virtual layer instead)
          }
          // Other clothes items render normally here
        } else if (layerName === 'Eyes') {
          // If Tyson selected AND a mask exists, don't draw it here (it goes under-mask via TysonTattoo virtual layer)
          // If Ninja selected AND a covering mask exists, don't draw it here (it goes under-mask via NinjaTurtleUnderMask virtual layer)
          if ((hasMask && isTysonSelected) || (isMaskThatCoversNinja && isNinjaSelected)) {
            imagePath = null
          } else {
            imagePath = eyesPath // render normally (Tyson without mask, Ninja without covering mask, OR any other Eyes trait)
          }
        } else if (layerName === 'Mask') {
          // Exclude HannibalMask from regular Mask rendering (it's handled by virtual layer)
          const maskPath = selectedLayers['Mask']
          if (maskPath && (maskPath.includes('Hannibal-Mask') || maskPath.includes('Hannibal_Mask'))) {
            imagePath = null // Skip Hannibal Mask in regular Mask layer
          }
          // All other masks (including Copium) render normally here
        }
        // MouthBase renders normally (all traits including Screaming render in normal layer)

        if (isVisible && imagePath) {
          try {
            const img = await loadImage(imagePath)
            // Calculate aspect ratio to fit canvas
            const imgAspect = img.width / img.height
            const canvasAspect = canvas.width / canvas.height
            
            let drawWidth = canvas.width
            let drawHeight = canvas.height
            let drawX = 0
            let drawY = 0
            
            if (imgAspect > canvasAspect) {
              // Image is wider - fit to width
              drawHeight = canvas.width / imgAspect
              drawY = (canvas.height - drawHeight) / 2
            } else {
              // Image is taller - fit to height
              drawWidth = canvas.height * imgAspect
              drawX = (canvas.width - drawWidth) / 2
            }
            
            ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)
          } catch (error) {
            console.error(`Error loading image for ${layerName}:`, error)
          }
        }
      }
    } catch (error) {
      console.error('Error rendering canvas:', error)
    } finally {
      setIsRendering(false)
    }
  }, [selectedLayers, layerVisibility, renderOrder, canvasDimensions, hasRealSelection, isTysonTattooPath, isNinjaTurtleMaskPath])
  
  // Preload next likely assets based on current selection
  useEffect(() => {
    // Preload images for currently selected layers (they're already cached, but ensure they're ready)
    if (selectedImagePaths.length > 0) {
      preloadImages(selectedImagePaths).catch(() => {
        // Silently fail - individual loads will handle errors
      })
    }
    
    // Predict and preload likely next selections:
    // - If user is selecting Base, preload Eyes layer images
    // - If user is selecting Eyes, preload Head layer images
    // - If user is selecting Clothes, preload ClothesAddon images
    const preloadPredictive = async () => {
      const predictions = []
      
      if (selectedLayers['Base']) {
        // User has Base selected - likely to select Eyes next
        const eyesImages = getAllLayerImages('Eyes')
        if (eyesImages.length > 0) {
          // Preload first 5 Eyes images (most common)
          const topEyes = eyesImages.slice(0, 5).map(img => img.path)
          predictions.push(...topEyes)
        }
      }
      
      if (selectedLayers['Eyes']) {
        // User has Eyes selected - likely to select Head next
        const headImages = getAllLayerImages('Head')
        if (headImages.length > 0) {
          const topHead = headImages.slice(0, 5).map(img => img.path)
          predictions.push(...topHead)
        }
      }
      
      if (selectedLayers['Clothes']) {
        // User has Clothes selected - likely to select ClothesAddon next
        const addonImages = getAllLayerImages('ClothesAddon')
        if (addonImages.length > 0) {
          const topAddon = addonImages.slice(0, 5).map(img => img.path)
          predictions.push(...topAddon)
        }
      }
      
      // Preload predicted images in background (low priority)
      if (predictions.length > 0) {
        // Use requestIdleCallback if available, otherwise setTimeout
        const preloadFn = () => {
          preloadImages(predictions).catch(() => {
            // Silently fail - these are just predictions
          })
        }
        
        if (window.requestIdleCallback) {
          requestIdleCallback(preloadFn, { timeout: 2000 })
        } else {
          setTimeout(preloadFn, 100)
        }
      }
    }
    
    preloadPredictive()
  }, [selectedLayers, selectedImagePaths])

  // Debounced render function (150ms delay for rapid trait switching)
  const renderCanvas = useMemo(
    () => debounce(renderCanvasInternal, 150),
    [renderCanvasInternal]
  )

  // Auto-render when layers change (debounced)
  useEffect(() => {
    renderCanvas()
    // Cleanup on unmount
    return () => {
      renderCanvas.cancel?.()
    }
  }, [selectedLayers, layerVisibility, renderCanvas])

  // Compute disabled layers based on rules
  const disabledLayers = useMemo(() => {
    const { disabledLayers: disabled } = getDisabledLayers(selectedLayers)
    return disabled
  }, [selectedLayers])

  // Helper to parse suit variant (duplicated from LayerSelector for use here)
  const parseSuitVariant = (rawDisplayName) => {
    if (!rawDisplayName) return null
    const lowerName = rawDisplayName.toLowerCase().trim()
    if (!lowerName.startsWith('suit')) return null
    const match = lowerName.match(/^suit\s+(\w+)\s+(\w+)\s+(tie|bow)$/)
    if (match) {
      const suitColor = match[1].toLowerCase()
      const accessoryColor = match[2].toLowerCase()
      const accessoryType = match[3].toLowerCase()
      if (suitColor !== 'black' && suitColor !== 'orange') return null
      if (accessoryType !== 'tie' && accessoryType !== 'bow') return null
      return { suitColor, accessoryType, accessoryColor }
    }
    return null
  }

  // Helper: Check if an option is "None" (empty or contains "none")
  const isNoneOption = useCallback((img) => {
    if (!img) return true
    const path = (img?.path || '').trim()
    const displayName = (img?.displayName || img?.name || '').trim().toLowerCase()
    if (!path) return true
    if (path.toLowerCase().includes('none')) return true
    if (displayName.includes('none')) return true
    return false
  }, [])

  // Helper: Find option by display name (case-insensitive)
  const findOptionByDisplayName = useCallback((images, targetName) => {
    const targetLower = String(targetName || '').trim().toLowerCase()
    if (!targetLower) return null
    return images.find(img => {
      const displayName = (img?.displayName || img?.name || '').trim().toLowerCase()
      return displayName === targetLower || displayName.includes(targetLower)
    })
  }, [])

  // Helper: Pick weighted random option
  const pickWeighted = useCallback((options, weights) => {
    if (!options || options.length === 0) return null
    if (options.length === 1) return options[0]
    
    // Calculate cumulative weights
    const cumulative = []
    let sum = 0
    for (let i = 0; i < options.length; i++) {
      sum += weights[i] || 1
      cumulative.push(sum)
    }
    
    // Pick random value
    let random = 0
    try {
      if (window?.crypto?.getRandomValues) {
        const arr = new Uint32Array(1)
        window.crypto.getRandomValues(arr)
        random = (arr[0] / 0xFFFFFFFF) * sum
      } else {
        random = Math.random() * sum
      }
    } catch {
      random = Math.random() * sum
    }
    
    // Find which option this falls into
    for (let i = 0; i < cumulative.length; i++) {
      if (random <= cumulative[i]) {
        return options[i]
      }
    }
    
    // Fallback to last option
    return options[options.length - 1]
  }, [])

  // Randomize all layers - picks random valid option for each layer
  const randomizeAllLayers = useCallback(() => {
    // Generator layer order (respects dependencies: Base/Head/Eyes/MouthBase first, then Mask, then dependent layers)
    // Note: Mask is processed before Head to enable Head filtering based on Mask selection
    const GENERATOR_LAYER_ORDER = ['Eyes', 'Base', 'MouthBase', 'Mask', 'Head', 'MouthItem', 'FacialHair', 'Clothes', 'Background']
    
    const newLayers = {}
    
    // First pass: pick random valid option for each layer
    GENERATOR_LAYER_ORDER.forEach(layerName => {
      const images = getAllLayerImages(layerName) || []
      if (!images.length) {
        newLayers[layerName] = ''
        return
      }
      
      // Special handling for Mask: weighted to pick "None" 85% of the time
      if (layerName === 'Mask') {
        const noneOption = { path: '', displayName: 'None' } // Treat empty as "None"
        const maskOptions = images.filter(img => !isNoneOption(img))
        
        // 85% chance for None, 15% chance for a mask
        const useNone = (() => {
          try {
            if (window?.crypto?.getRandomValues) {
              const arr = new Uint32Array(1)
              window.crypto.getRandomValues(arr)
              return (arr[0] / 0xFFFFFFFF) < 0.85
            } else {
              return Math.random() < 0.85
            }
          } catch {
            return Math.random() < 0.85
          }
        })()
        
        if (useNone || maskOptions.length === 0) {
          newLayers[layerName] = ''
        } else {
          // Pick random mask
          let idx = 0
          try {
            if (window?.crypto?.getRandomValues) {
              const arr = new Uint32Array(1)
              window.crypto.getRandomValues(arr)
              idx = arr[0] % maskOptions.length
            } else {
              idx = Math.floor(Math.random() * maskOptions.length)
            }
          } catch {
            idx = Math.floor(Math.random() * maskOptions.length)
          }
          newLayers[layerName] = maskOptions[idx]?.path || ''
        }
        return
      }
      
      // Special handling for MouthBase: weighted to pick "Numb" 70% of the time
      if (layerName === 'MouthBase') {
        const validImages = images.filter(img => {
          const path = (img?.path || '').trim()
          const displayName = (img?.displayName || img?.name || '').trim().toLowerCase()
          if (!path) return false
          if (path.toLowerCase().includes('none') || displayName.includes('none')) return false
          return true
        })
        
        if (validImages.length === 0) {
          newLayers[layerName] = ''
          return
        }
        
        // Find Numb option
        const numbOption = findOptionByDisplayName(validImages, 'Numb')
        const otherOptions = validImages.filter(img => img !== numbOption)
        
        // 70% chance for Numb, 30% chance for other options
        const useNumb = (() => {
          try {
            if (window?.crypto?.getRandomValues) {
              const arr = new Uint32Array(1)
              window.crypto.getRandomValues(arr)
              return (arr[0] / 0xFFFFFFFF) < 0.7
            } else {
              return Math.random() < 0.7
            }
          } catch {
            return Math.random() < 0.7
          }
        })()
        
        if (useNumb && numbOption) {
          newLayers[layerName] = numbOption.path || ''
        } else if (otherOptions.length > 0) {
          // Pick random from other options
          let idx = 0
          try {
            if (window?.crypto?.getRandomValues) {
              const arr = new Uint32Array(1)
              window.crypto.getRandomValues(arr)
              idx = arr[0] % otherOptions.length
            } else {
              idx = Math.floor(Math.random() * otherOptions.length)
            }
          } catch {
            idx = Math.floor(Math.random() * otherOptions.length)
          }
          newLayers[layerName] = otherOptions[idx]?.path || ''
        } else {
          // Fallback to any valid image
          let idx = 0
          try {
            if (window?.crypto?.getRandomValues) {
              const arr = new Uint32Array(1)
              window.crypto.getRandomValues(arr)
              idx = arr[0] % validImages.length
            } else {
              idx = Math.floor(Math.random() * validImages.length)
            }
          } catch {
            idx = Math.floor(Math.random() * validImages.length)
          }
          newLayers[layerName] = validImages[idx]?.path || ''
        }
        return
      }
      
      // Special handling for Clothes: separate suit variants from regular options
      if (layerName === 'Clothes') {
        const suitVariants = []
        const regularOptions = []
        
        images.forEach(img => {
          const path = (img?.path || '').trim()
          const displayName = (img?.displayName || img?.name || '').trim()
          if (!path) return
          if (path.toLowerCase().includes('none') || displayName.toLowerCase().includes('none')) return
          
          const parsed = parseSuitVariant(displayName)
          if (parsed) {
            suitVariants.push(img)
          } else {
            regularOptions.push(img)
          }
        })
        
        // Randomly decide: 50% chance to pick suit, 50% chance to pick regular option
        // But only if both are available
        let candidates = []
        if (suitVariants.length > 0 && regularOptions.length > 0) {
          const useSuit = Math.random() < 0.5
          candidates = useSuit ? suitVariants : regularOptions
        } else if (suitVariants.length > 0) {
          candidates = suitVariants
        } else if (regularOptions.length > 0) {
          candidates = regularOptions
        }
        
        if (candidates.length === 0) {
          newLayers[layerName] = ''
          return
        }
        
        // Pick random from candidates
        let idx = 0
        try {
          if (window?.crypto?.getRandomValues) {
            const arr = new Uint32Array(1)
            window.crypto.getRandomValues(arr)
            idx = arr[0] % candidates.length
          } else {
            idx = Math.floor(Math.random() * candidates.length)
          }
        } catch {
          idx = Math.floor(Math.random() * candidates.length)
        }
        
        newLayers[layerName] = candidates[idx]?.path || ''
        return
      }
      
      // Special handling for Head: filter Centurion options based on Mask selection
      if (layerName === 'Head') {
        const hasMask = newLayers['Mask'] && newLayers['Mask'] !== '' && newLayers['Mask'] !== 'None'
        const validImages = images.filter(img => {
          const path = (img?.path || '').trim()
          const displayName = (img?.displayName || img?.name || '').trim().toLowerCase()
          if (!path) return false
          
          const pathLower = path.toLowerCase()
          const isCenturion = pathLower.includes('centurion') && !pathLower.includes('centurion_mask')
          const isCenturionMask = pathLower.includes('centurion_mask')
          
          if (hasMask) {
            // When Mask != None: show Centurion_mask, hide Centurion
            return !isCenturion
          } else {
            // When Mask == None: show Centurion, hide Centurion_mask
            return !isCenturionMask
          }
        })
        
        if (validImages.length === 0) {
          newLayers[layerName] = ''
          return
        }
        
        // Pick random valid image
        let idx = 0
        try {
          if (window?.crypto?.getRandomValues) {
            const arr = new Uint32Array(1)
            window.crypto.getRandomValues(arr)
            idx = arr[0] % validImages.length
          } else {
            idx = Math.floor(Math.random() * validImages.length)
          }
        } catch {
          idx = Math.floor(Math.random() * validImages.length)
        }
        
        newLayers[layerName] = validImages[idx]?.path || ''
        return
      }
      
      // For other layers: filter valid images (exclude "None" for Base)
      const excludeNone = layerName === 'Base'
      const validImages = images.filter(img => {
        const path = (img?.path || '').trim()
        const displayName = (img?.displayName || img?.name || '').trim().toLowerCase()
        if (!path) return false
        if (excludeNone && (path.toLowerCase().includes('none') || displayName.includes('none'))) {
          return false
        }
        return true
      })
      
      if (validImages.length === 0) {
        newLayers[layerName] = ''
        return
      }
      
      // Pick random valid image
      let idx = 0
      try {
        if (window?.crypto?.getRandomValues) {
          const arr = new Uint32Array(1)
          window.crypto.getRandomValues(arr)
          idx = arr[0] % validImages.length
        } else {
          idx = Math.floor(Math.random() * validImages.length)
        }
      } catch {
        idx = Math.floor(Math.random() * validImages.length)
      }
      
      // For grouped layers (Head, Eyes), we need to pick actual variant paths
      // For now, just use the path - selectLayerInternal will handle grouping logic
      newLayers[layerName] = validImages[idx]?.path || ''
    })
    
    // Apply rules (clearSelections, forceSelections) to ensure valid state
    const { disabledLayers: disabled, clearSelections, forceSelections } = getDisabledLayers(newLayers)
    
    // Clear disabled layers
    disabled.forEach(layerName => {
      newLayers[layerName] = ''
    })
    
    // Clear explicitly marked layers
    if (clearSelections && clearSelections.length > 0) {
      clearSelections.forEach(layerName => {
        newLayers[layerName] = ''
      })
    }
    
    // Apply forced selections
    if (forceSelections && Object.keys(forceSelections).length > 0) {
      Object.entries(forceSelections).forEach(([layerName, value]) => {
        newLayers[layerName] = value
      })
    }
    
    // Set final state (use selectLayerInternal pattern for Chia Farmer handling)
    setSelectedLayers(prev => {
      const finalLayers = { ...newLayers }
      
      // Handle Chia Farmer special case (same logic as selectLayerInternal)
      if (finalLayers['Clothes'] && finalLayers['Clothes'].includes('Chia-Farmer')) {
        finalLayers['ClothesAddon'] = finalLayers['Clothes']
        // Check if we need to add Tee/Tank-top base
        const prevClothes = prev['Clothes']
        const prevIsTeeOrTank = prevClothes && (
          prevClothes.includes('Tee') || 
          prevClothes.includes('Tank-Top') ||
          prevClothes.includes('tank-top')
        ) && !prevClothes.includes('Chia-Farmer')
        
        if (prevIsTeeOrTank) {
          finalLayers['Clothes'] = prevClothes
        }
        // Otherwise rules will force Tee Blue
      } else {
        // Non-Chia-Farmer: clear ClothesAddon if it was Chia Farmer
        const prevClothesAddon = prev['ClothesAddon']
        const prevWasChiaFarmer = prevClothesAddon && (
          prevClothesAddon.includes('Chia-Farmer') || 
          prevClothesAddon.includes('EXTRA-on-tee,tank-top_CLOTHES_Chia-Farmer')
        )
        
        const isTeeOrTank = finalLayers['Clothes'] && (
          finalLayers['Clothes'].includes('Tee') || 
          finalLayers['Clothes'].includes('Tank-Top') ||
          finalLayers['Clothes'].includes('tank-top')
        )
        
        if (prevWasChiaFarmer && !isTeeOrTank) {
          finalLayers['ClothesAddon'] = ''
        } else if (prevWasChiaFarmer && isTeeOrTank) {
          finalLayers['ClothesAddon'] = prevClothesAddon
        }
      }
      
      return finalLayers
    })
  }, [])

  return {
    selectedLayers,
    layerVisibility,
    selectLayer,
    toggleLayerVisibility,
    canvasRef,
    renderCanvas,
    isRendering,
    disabledLayers,
    randomizeAllLayers
  }
}

