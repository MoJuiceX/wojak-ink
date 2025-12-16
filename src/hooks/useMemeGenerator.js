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
      
      // Check if any layers should be disabled after this selection
      const { disabledLayers } = getDisabledLayers(newLayers)
      
      // Clear selections for layers that are now disabled
      const clearedLayers = { ...newLayers }
      disabledLayers.forEach(disabledLayer => {
        if (clearedLayers[disabledLayer]) {
          clearedLayers[disabledLayer] = ''
        }
      })
      
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
        const imagePath = selectedLayers[layerName]

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

