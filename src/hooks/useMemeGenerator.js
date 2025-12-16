import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { LAYER_ORDER } from '../lib/memeLayers'
import { loadImage } from '../utils/imageUtils'
import { getDisabledLayers } from '../utils/wojakRules'

export function useMemeGenerator() {
  const [selectedLayers, setSelectedLayers] = useState({})
  const [layerVisibility, setLayerVisibility] = useState({})
  const canvasRef = useRef(null)
  const [isRendering, setIsRendering] = useState(false)

  // Initialize visibility for all layers
  useEffect(() => {
    const initialVisibility = {}
    LAYER_ORDER.forEach(layer => {
      initialVisibility[layer.name] = true
    })
    setLayerVisibility(initialVisibility)
  }, [])

  const selectLayer = useCallback((layerName, imagePath) => {
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

  const toggleLayerVisibility = useCallback((layerName) => {
    setLayerVisibility(prev => ({
      ...prev,
      [layerName]: !prev[layerName]
    }))
  }, [])

  const renderCanvas = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    setIsRendering(true)
    const ctx = canvas.getContext('2d')
    
    // Set canvas size if not set
    if (canvas.width === 0 || canvas.height === 0) {
      canvas.width = 800
      canvas.height = 800
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    try {
      // Render layers in order
      for (const layer of LAYER_ORDER) {
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
  }, [selectedLayers, layerVisibility])

  // Auto-render when layers change
  useEffect(() => {
    renderCanvas()
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

