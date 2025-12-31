import Window from './Window'
import { useState, useEffect, useMemo } from 'react'
import { getAllMemeticEnergyImages, getMemeticEnergyCategories } from '../../lib/memeticEnergyLoader'
import { playSound } from '../../utils/soundManager'
import ImagePreviewModal from '../ui/ImagePreviewModal'

export default function MemeticEnergyWindow({
  isOpen,
  onClose
}) {
  const categories = useMemo(() => getMemeticEnergyCategories(), [])
  const [selectedCategory, setSelectedCategory] = useState(categories[0] || '')
  const [images, setImages] = useState({})
  const [loading, setLoading] = useState(true)
  const [previewImage, setPreviewImage] = useState(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    
    setLoading(true)
    try {
      const loadedImages = {}
      categories.forEach(category => {
        loadedImages[category] = getAllMemeticEnergyImages(category)
      })
      setImages(loadedImages)
      setLoading(false)
    } catch (err) {
      console.error("Failed to load memetic energy images:", err)
      setLoading(false)
    }
  }, [isOpen, categories])

  const handleCategoryChange = (e) => {
    playSound('click')
    setSelectedCategory(e.target.value)
  }

  const handleImageClick = (image) => {
    playSound('click')
    setPreviewImage(image)
    setIsPreviewOpen(true)
  }

  const handleClosePreview = () => {
    playSound('click')
    setIsPreviewOpen(false)
    setPreviewImage(null)
  }

  if (!isOpen) return null

  const currentCategoryImages = images[selectedCategory] || []

  return (
    <>
      <Window
        id="memetic-energy"
        title="MEMETIC ENERGY"
        style={{
          width: 'clamp(500px, 90vw, 900px)',
          maxWidth: 'min(calc(100% - 16px), 900px)',
          left: '100px',
          top: '100px',
          height: '700px'
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
              color: 'var(--text)',
              minWidth: '150px',
              fontSize: '11px'
            }}
          >
            {categories.map(category => (
              <option key={category} value={category} style={{ color: 'var(--text)', background: 'var(--input-bg)' }}>
                {category}
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
            className="memetic-energy-grid scroll-allowed"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: '12px',
              padding: '8px',
              overflowY: 'scroll',
              overflowX: 'hidden',
              flex: 1,
              minHeight: 0,
              maxHeight: '100%',
              height: 0
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
                onClick={() => handleImageClick(trait)}
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

    {/* Image Preview Modal - rendered outside Window to overlay everything */}
    <ImagePreviewModal
      isOpen={isPreviewOpen}
      onClose={handleClosePreview}
      image={previewImage}
    />
    </>
  )
}

