import { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react'
import { Select, Label } from '../ui'
import Tooltip from '../ui/Tooltip'
import { useImageLoader } from '../../hooks/useImageLoader'
import { getDisabledReason, getDisabledLayers } from '../../utils/wojakRules'

/**
 * Format display label for dropdown options
 * Applies title-case and specific overrides without changing the underlying value
 * @param {string} rawLabel - The raw label from the manifest
 * @returns {string} Formatted display label
 */
function formatDisplayLabel(rawLabel) {
  if (!rawLabel) return rawLabel

  // Special case: Cashtag labels (e.g., $BEPE, $CASTER) - preserve full uppercase
  if (rawLabel.startsWith('$')) {
    return rawLabel.toUpperCase()
  }

  // Special case: Chia Farmer items
  // Handle patterns like "Chia Farmer blue", "Chia-Farmer blue", "chia farmer blue"
  const chiaFarmerMatch = rawLabel.match(/chia[- ]?farmer[- ]?(\w+)/i)
  if (chiaFarmerMatch) {
    const color = chiaFarmerMatch[1]
    const colorCapitalized = color.charAt(0).toUpperCase() + color.slice(1).toLowerCase()
    return `Chia Farmer (${colorCapitalized})`
  }

  // Special case: Mom's Basement (handle special characters like Momyçôs, MomΓÇÖs, etc.)
  if (rawLabel.toLowerCase().includes('mom') && rawLabel.toLowerCase().includes('basement')) {
    return 'Mom Basement'
  }

  // Special case: NYSE labels (preserve NYSE as all caps, handle both "NYSE" and "Nyse")
  const nyseDumpMatch = rawLabel.match(/nyse\s+dump/i)
  if (nyseDumpMatch) {
    return 'NYSE Dump'
  }
  const nysePumpMatch = rawLabel.match(/nyse\s+pump/i)
  if (nysePumpMatch) {
    return 'NYSE Pump'
  }

  // Apply specific overrides (case-insensitive whole word or exact match)
  const overrides = {
    'stach': 'Stache',
    'numb': 'Numb',
    'screeming': 'Screaming',
    'neckbeard': 'Neckbeard',
  }

  const lowerLabel = rawLabel.toLowerCase().trim()
  
  // Check for exact matches first (e.g., "numb" -> "Numb")
  if (overrides[lowerLabel]) {
    return overrides[lowerLabel]
  }
  
  // Check for word boundaries (e.g., "stach" in "stach beard" -> "Stache beard")
  for (const [key, value] of Object.entries(overrides)) {
    const regex = new RegExp(`\\b${key}\\b`, 'gi')
    if (regex.test(rawLabel)) {
      return rawLabel.replace(regex, value)
    }
  }

  // Title-case words by default (capitalize first letter of each word)
  return rawLabel
    .split(' ')
    .map(word => {
      if (!word) return word
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}

function LayerSelector({ layerName, onSelect, selectedValue, disabled = false, selectedLayers = {}, navigation, traitIndex = -1 }) {
  const { images, loading } = useImageLoader(layerName)
  const [options, setOptions] = useState([])
  const [selectedOption, setSelectedOption] = useState('')
  const selectRef = useRef(null)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const isFocusedTrait = navigation && traitIndex >= 0 && navigation.focusedTraitIndex === traitIndex

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
    const allOptions = []
    
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

    // Flatten images from all subfolders
    Object.keys(images).forEach(subfolder => {
      const subfolderImages = images[subfolder] || []
      subfolderImages.forEach(img => {
        const rawLabel = img.displayName || img.name
        let formattedLabel = formatDisplayLabel(rawLabel)
        
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
        
        // Add helper text to disabled Chia Farmer options
        if (layerName === 'Clothes' && optionDisabled && noTeeOrTank && isChiaFarmerItem) {
          formattedLabel = `${formattedLabel} ⓘ choose tee or tank top first`
        }
        
        // Add hint text to disabled Astronaut option when Mask is selected
        if (layerName === 'Clothes' && optionDisabled && hasMask && isAstronautItem) {
          formattedLabel = `${formattedLabel} ⓘ deselect mask first`
        }
        
        // Add hint text to Tee/Tank items when Chia Farmer is selected
        // Explicitly exclude Chia Farmer items (they may contain "tee" or "tank-top" in path)
        if (layerName === 'Clothes' && hasChiaFarmer && isTeeOrTankItem && !isChiaFarmerItem) {
          formattedLabel = `${formattedLabel} <------ Chia Farmer underwear`
        }
        
        // Note: Chia Farmer items show without any badges or hint text (clean display)
        
        allOptions.push({
          value: img.path,
          label: formattedLabel,
          fullName: img.fullName,
          disabled: optionDisabled
        })
      })
    })

    // Add "None" option (except for Base layer - Base must never be None)
    if (layerName !== 'Base') {
      allOptions.unshift({ value: '', label: 'None', disabled: false })
    }

    return allOptions
  }, [images, selectedLayers, layerName])

  useEffect(() => {
    setOptions(computedOptions)
    
    // Set selected value
    if (selectedValue) {
      const found = computedOptions.find(opt => opt.value === selectedValue)
      setSelectedOption(found ? found.value : '')
    } else {
      setSelectedOption('')
    }
  }, [computedOptions, selectedValue])

  // Memoize change handler to prevent recreation
  const handleChange = useCallback((e) => {
    const value = e.target.value
    setSelectedOption(value)
    onSelect(layerName, value)
  }, [layerName, onSelect])

  // Memoize keyboard handler to prevent recreation on every render
  const handleKeyDown = useCallback((e) => {
    // If navigation system is active and this trait is focused, handle option navigation
    if (navigation && isFocusedTrait && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      navigation.navigateOptions(e.key === "ArrowDown" ? 'down' : 'up', (layerName, value) => {
        setSelectedOption(value)
        onSelect(layerName, value)
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
          onSelect(layerName, candidate.value)
          break
        }
        nextIndex += dir
      }
    } else if (e.key === "Enter") {
      // Enter selects the focused option
      if (navigation && isFocusedTrait) {
        navigation.selectFocusedOption((layerName, value) => {
          setSelectedOption(value)
          onSelect(layerName, value)
        })
      } else if (focusedIndex >= 0) {
        const focusedOption = options[focusedIndex]
        if (focusedOption && !focusedOption.disabled) {
          setSelectedOption(focusedOption.value)
          onSelect(layerName, focusedOption.value)
        }
      }
      if (selectRef.current) {
        selectRef.current.blur()
      }
    }
  }, [navigation, isFocusedTrait, options, selectedOption, layerName, onSelect, focusedIndex])

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
    'MouthBase': 'Mouth (Base)',
    'MouthItem': 'Mouth (Item)',
    'FacialHair': 'Facial Hair',
    'ClothesAddon': 'Clothes Add-on',
    'Mouth': 'Mouth', // Keep for backwards compatibility
  }
  const displayName = layerDisplayNames[layerName] || layerName.charAt(0).toUpperCase() + layerName.slice(1)
  const disabledReason = disabled ? getDisabledReason(layerName, selectedLayers) : null

  // Check if ClothesAddon needs hint text (when Tee/Tank-top is not selected)
  const needsBaseClothes = layerName === 'ClothesAddon' && disabled && disabledReason === 'Choose Tee or Tank Top first'

  // Get tooltip content
  const tooltipContent = disabled && disabledReason 
    ? `${displayName}: ${disabledReason}`
    : selectedOption && options.find(opt => opt.value === selectedOption)
    ? `${displayName}: ${options.find(opt => opt.value === selectedOption)?.label || 'Selected'}`
    : `${displayName}: Select a trait`

  return (
    <Tooltip content={tooltipContent} position="right" delay={200}>
      <div 
        className={`trait-selector-wrapper ${isFocusedTrait ? 'trait-focused' : ''}`}
        style={{ marginBottom: '12px', opacity: disabled ? 0.5 : 1 }}
      >
        <Label htmlFor={`select-${layerName}`}>
          {displayName}:
          {disabled && disabledReason && (
            <span style={{ 
              fontSize: '9px', 
              color: '#808080', 
              marginLeft: '8px',
              fontStyle: 'italic'
            }}>
              ({disabledReason})
            </span>
          )}
        </Label>
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
          className={isFocusedTrait ? 'trait-select-focused' : ''}
          style={{ width: '100%', minWidth: '200px' }}
        />
      </div>
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
    // Deep compare selectedLayers (only relevant layers for this selector)
    prevProps.selectedLayers?.[prevProps.layerName] === nextProps.selectedLayers?.[nextProps.layerName] &&
    // Compare navigation focused trait index
    prevProps.navigation?.focusedTraitIndex === nextProps.navigation?.focusedTraitIndex
  )
})

