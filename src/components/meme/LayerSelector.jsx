import { useState, useEffect } from 'react'
import { Select, Label } from '../ui'
import { useImageLoader } from '../../hooks/useImageLoader'

export default function LayerSelector({ layerName, onSelect, selectedValue }) {
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

  return (
    <div style={{ marginBottom: '12px' }}>
      <Label htmlFor={`select-${layerName}`}>
        {displayName}:
      </Label>
      <Select
        id={`select-${layerName}`}
        value={selectedOption}
        onChange={handleChange}
        options={loading ? [{ value: '', label: 'Loading...' }] : options}
        disabled={loading}
        style={{ width: '100%', minWidth: '200px' }}
      />
    </div>
  )
}

