import Window from './Window'
import { useState, useEffect } from 'react'
import { getAllLayerImages } from '../../lib/memeImageManifest'
import { UI_LAYER_ORDER } from '../../lib/memeLayers'
import { playSound } from '../../utils/soundManager'

export default function MimeticEnergyWindow({
  isOpen,
  onClose
}) {
  const [selectedCategory, setSelectedCategory] = useState(UI_LAYER_ORDER[0]?.name || '')
  const [images, setImages] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isOpen) return
    
    setLoading(true)
    try {
      const loadedImages = {}
      UI_LAYER_ORDER.forEach(layer => {
        loadedImages[layer.name] = getAllLayerImages(layer.name)
      })
      setImages(loadedImages)
      setLoading(false)
    } catch (err) {
      console.error("Failed to load trait images:", err)
      setLoading(false)
    }
  }, [isOpen])

  const handleCategoryChange = (e) => {
    playSound('click')
    setSelectedCategory(e.target.value)
  }

  if (!isOpen) return null

  const currentCategoryImages = images[selectedCategory] || []

  return (
    <Window
      id="mimetic-energy"
      title="MIMETIC ENERGY"
      style={{
        width: 'clamp(400px, 90vw, 800px)',
        maxWidth: 'min(calc(100% - 16px), 800px)',
        left: '100px',
        top: '100px',
        height: '600px'
      }}
      onClose={onClose}
    >
      <div className="window-body" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        overflow: 'hidden'
      }}>
        {/* Category Selector */}
        <div style={{
          padding: '8px',
          borderBottom: '1px solid var(--border-dark)',
          marginBottom: '8px',
          fontFamily: 'MS Sans Serif, sans-serif'
        }}>
          <label style={{ marginRight: '8px' }}>Category:</label>
          <select
            value={selectedCategory}
            onChange={handleCategoryChange}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              fontFamily: 'MS Sans Serif, sans-serif',
              padding: '2px 4px',
              background: 'var(--input-bg)',
              border: '1px inset var(--border-dark)',
              minWidth: '150px'
            }}
          >
            {UI_LAYER_ORDER.map(layer => (
              <option key={layer.name} value={layer.name}>
                {layer.name}
              </option>
            ))}
          </select>
          <span style={{ marginLeft: '16px', color: 'var(--text-muted)' }}>
            {currentCategoryImages.length} trait{currentCategoryImages.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Trait Grid */}
        {loading ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontFamily: 'MS Sans Serif, sans-serif'
          }}>
            Loading traits...
          </div>
        ) : currentCategoryImages.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontFamily: 'MS Sans Serif, sans-serif'
          }}>
            No traits found in this category.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: '12px',
              padding: '8px',
              overflowY: 'auto',
              flex: 1
            }}
          >
            {currentCategoryImages.map((trait, index) => (
              <div
                key={trait.path || index}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '8px',
                  background: 'var(--surface-3)',
                  border: '1px inset var(--border-dark)',
                  gap: '4px',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  playSound('click')
                  // Could open image in viewer or copy to clipboard
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--surface-2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--surface-3)'
                }}
              >
                <img
                  src={trait.path}
                  alt={trait.displayName || trait.name}
                  style={{
                    width: '64px',
                    height: '64px',
                    objectFit: 'contain',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-dark)',
                    padding: '2px',
                    imageRendering: 'pixelated'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none'
                    const parent = e.target.parentElement
                    if (parent) {
                      const errorDiv = document.createElement('div')
                      errorDiv.textContent = '?'
                      errorDiv.style.cssText = `
                        width: 64px;
                        height: 64px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: var(--input-bg);
                        border: 1px solid var(--border-dark);
                        color: var(--text-muted);
                        font-family: MS Sans Serif, sans-serif;
                      `
                      parent.insertBefore(errorDiv, e.target)
                    }
                  }}
                />
                <div style={{
                  fontFamily: 'MS Sans Serif, sans-serif',
                  textAlign: 'center',
                  wordBreak: 'break-word',
                  maxWidth: '100%',
                  color: '#000',
                  fontSize: '10px',
                  lineHeight: '1.2'
                }}>
                  {trait.displayName || trait.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Window>
  )
}




