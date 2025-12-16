import { useState, useEffect } from 'react'
import { Select, Label } from '../ui'
import { useImageLoader } from '../../hooks/useImageLoader'
import { getDisabledReason } from '../../utils/wojakRules'

export default function LayerSelector({ layerName, onSelect, selectedValue, disabled = false, selectedLayers = {} }) {
  const { images, loading } = useImageLoader(layerName)
  const [options, setOptions] = useState([])
  const [selectedOption, setSelectedOption] = useState('')

  useEffect(() => {
    const allOptions = []
    
    // Flatten images from all subfolders
    Object.keys(images).forEach(subfolder => {
      const subfolderImages = images[subfolder] || []
      subfolderImages.forEach(img => {
        allOptions.push({
          value: img.path,
          label: img.displayName || img.name,
          fullName: img.fullName
        })
      })
    })

    // Add "None" option
    allOptions.unshift({ value: '', label: 'None' })

    setOptions(allOptions)
    
    // Set selected value
    if (selectedValue) {
      const found = allOptions.find(opt => opt.value === selectedValue)
      setSelectedOption(found ? found.value : '')
    } else {
      setSelectedOption('')
    }
  }, [images, selectedValue])

  const handleChange = (e) => {
    const value = e.target.value
    setSelectedOption(value)
    onSelect(layerName, value)
  }

  const displayName = layerName.charAt(0).toUpperCase() + layerName.slice(1)
  const disabledReason = disabled ? getDisabledReason(layerName, selectedLayers) : null

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
        options={loading ? [{ value: '', label: 'Loading...' }] : options}
        disabled={loading || disabled}
        style={{ width: '100%', minWidth: '200px' }}
      />
    </div>
  )
}

