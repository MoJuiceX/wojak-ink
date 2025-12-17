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
          const maskPath = selectedLayers['Mask']
          if (maskPath && (maskPath.includes('Hannibal-Mask') || maskPath.includes('Hannibal_Mask'))) {
            imagePath = maskPath
          } else {
            imagePath = null // Don't render if not Hannibal Mask
          }
        } else if (layerName === 'TysonTattoo') {
          // TysonTattoo is stored in Eyes layer, but only render if HannibalMask exists
          const hannibalMaskPath = selectedLayers['Mask']
          const hasHannibalMask = hannibalMaskPath && (
            hannibalMaskPath.includes('Hannibal-Mask') || 
            hannibalMaskPath.includes('Hannibal_Mask')
          )
          if (hasHannibalMask) {
            const eyesPath = selectedLayers['Eyes']
            if (eyesPath && (eyesPath.includes('Tyson-Tattoo') || eyesPath.includes('Tyson_Tattoo'))) {
              imagePath = eyesPath
            } else {
              imagePath = null // Don't render if not Tyson Tattoo
            }
          } else {
            imagePath = null // Don't render if no Hannibal Mask
          }
        } else if (layerName === 'Clothes') {
          // Exclude Astronaut from regular Clothes rendering (it's handled by virtual layer)
          const clothesPath = selectedLayers['Clothes']
          if (clothesPath && (clothesPath.includes('Astronaut') || clothesPath.includes('astronaut'))) {
            imagePath = null // Skip Astronaut in regular Clothes layer (renders in virtual layer instead)
          }
          // Other clothes items render normally here
        } else if (layerName === 'Eyes') {
          // Exclude TysonTattoo from regular Eyes rendering (it's handled by virtual layer)
          const eyesPath = selectedLayers['Eyes']
          if (eyesPath && (eyesPath.includes('Tyson-Tattoo') || eyesPath.includes('Tyson_Tattoo'))) {
            imagePath = null // Skip Tyson Tattoo in regular Eyes layer (renders in virtual layer instead)
          }
          // Other eyes items (glasses, etc.) render normally here
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
  }, [selectedLayers, layerVisibility, renderOrder, canvasDimensions])
  
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

  return {
    selectedLayers,
    layerVisibility,
    selectLayer,
    toggleLayerVisibility,
    canvasRef,
    renderCanvas,
    isRendering,
    disabledLayers
  }
}

