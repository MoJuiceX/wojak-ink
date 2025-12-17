import React, { useState, useEffect } from 'react'
import { getAllLayerImages } from '../../lib/memeImageManifest'
import { UI_LAYER_ORDER } from '../../lib/memeLayers'
import { Select, Button } from '../ui'

export default function ImageLibraryPanel({ onImageSelect }) {
  const [selectedCategory, setSelectedCategory] = useState(UI_LAYER_ORDER[0]?.name || '')
  const [images, setImages] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    try {
      const loadedImages = {}
      UI_LAYER_ORDER.forEach(layer => {
        loadedImages[layer.name] = getAllLayerImages(layer.name)
      })
      setImages(loadedImages)
      setLoading(false)
    } catch (err) {
      console.error("Failed to load wojak creator images:", err)
      setError(err)
      setLoading(false)
    }
  }, [])

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value)
  }

  const currentCategoryImages = images[selectedCategory] || []

  if (loading) {
    return <div style={{ fontFamily: "'MS Sans Serif', sans-serif" }}>Loading images...</div>
  }

  if (error) {
    return <div style={{ color: 'red', fontFamily: "'MS Sans Serif', sans-serif" }}>Error loading images: {error.message}</div>
  }

  return (
    <div style={{ fontFamily: "'MS Sans Serif', sans-serif" }}>
      <h3 style={{ fontSize: '12px', marginBottom: '8px' }}>Memetic Energy</h3>
      <div className="field-row" style={{ marginBottom: '8px' }}>
        <Select 
          value={selectedCategory} 
          onChange={handleCategoryChange}
          options={UI_LAYER_ORDER.map(layer => ({
            value: layer.name,
            label: layer.name
          }))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{
        border: '1px inset #c0c0c0',
        backgroundColor: '#ffffff',
        padding: '4px',
        minHeight: '150px',
        maxHeight: 'calc(100dvh - 250px)', /* Use dynamic viewport height */
        overflowY: 'auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '4px',
      }}>
        {currentCategoryImages.map((image, index) => (
          <Button
            key={image.path || index}
            onClick={() => onImageSelect(image.path)}
            style={{
              width: '100%',
              height: '60px',
              padding: '2px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '9px',
              lineHeight: '1.1',
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'normal',
            }}
            title={image.displayName}
          >
            <img
              src={image.path}
              alt={image.displayName}
              style={{ maxWidth: '40px', maxHeight: '40px', objectFit: 'contain', marginBottom: '2px' }}
            />
            {image.displayName}
          </Button>
        ))}
      </div>
      <p style={{ fontSize: '10px', marginTop: '8px', color: '#808080' }}>
        Click an image to copy it to your clipboard, then paste into Paint.
      </p>
    </div>
  )
}

