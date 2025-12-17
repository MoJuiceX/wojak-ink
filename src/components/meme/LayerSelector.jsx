import { useState, useEffect } from 'react'
import { Select, Label } from '../ui'
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

export default function LayerSelector({ layerName, onSelect, selectedValue, disabled = false, selectedLayers = {} }) {
  const { images, loading } = useImageLoader(layerName)
  const [options, setOptions] = useState([])
  const [selectedOption, setSelectedOption] = useState('')

  useEffect(() => {
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

    setOptions(allOptions)
    
    // Set selected value
    if (selectedValue) {
      const found = allOptions.find(opt => opt.value === selectedValue)
      setSelectedOption(found ? found.value : '')
    } else {
      setSelectedOption('')
    }
  }, [images, selectedValue, selectedLayers, layerName])

  const handleChange = (e) => {
    const value = e.target.value
    setSelectedOption(value)
    onSelect(layerName, value)
  }

  // Handle keyboard navigation for immediate preview updates
  const handleKeyDown = (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return

    e.preventDefault()

    const currentIndex = options.findIndex(opt => opt.value === selectedOption)
    const dir = e.key === "ArrowDown" ? 1 : -1
    
    // If current option not found, start from first/last enabled option
    let startIndex = currentIndex
    if (currentIndex === -1) {
      startIndex = dir === 1 ? 0 : options.length - 1
    }
    
    const nextIndex = Math.max(0, Math.min(options.length - 1, startIndex + dir))
    const nextOption = options[nextIndex]

    // Skip disabled options
    if (nextOption && !nextOption.disabled && nextOption.value !== selectedOption) {
      setSelectedOption(nextOption.value)
      onSelect(layerName, nextOption.value)
    } else if (nextOption && nextOption.disabled) {
      // If next option is disabled, try to find the next enabled option
      let searchIndex = nextIndex + dir
      while (searchIndex >= 0 && searchIndex < options.length) {
        const candidate = options[searchIndex]
        if (candidate && !candidate.disabled) {
          setSelectedOption(candidate.value)
          onSelect(layerName, candidate.value)
          break
        }
        searchIndex += dir
      }
    }
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

  return (
    <div style={{ marginBottom: '12px', opacity: disabled ? 0.5 : 1 }}>
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
        id={`select-${layerName}`}
        value={selectedOption}
        onChange={handleChange}
        onInput={handleChange}
        onKeyDown={handleKeyDown}
        options={loading ? [{ value: '', label: 'Loading...' }] : options}
        disabled={loading || disabled}
        style={{ width: '100%', minWidth: '200px' }}
      />
    </div>
  )
}

