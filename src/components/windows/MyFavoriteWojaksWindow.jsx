import Window from './Window'
import { useState, useEffect } from 'react'
import { loadFavoriteWojaks, removeFavoriteWojak } from '../../utils/desktopStorage'
import { Button } from '../ui'
import { playSound } from '../../utils/soundManager'
import { downloadCanvasAsPNG, canvasToBlob } from '../../utils/imageUtils'
import { blobUrlToDataUrl } from '../../utils/imageUtils'

export default function MyFavoriteWojaksWindow({
  isOpen,
  onClose,
  favoriteWojaks,
  onRemove,
  onViewImage
}) {
  const [wojaks, setWojaks] = useState(favoriteWojaks || [])

  // Reload when favoriteWojaks prop changes
  useEffect(() => {
    if (favoriteWojaks) {
      setWojaks(favoriteWojaks)
    } else {
      setWojaks(loadFavoriteWojaks())
    }
  }, [favoriteWojaks])

  const handleRemove = (wojakId) => {
    if (window.confirm('Remove this wojak from favorites?')) {
      playSound('click')
      const result = removeFavoriteWojak(wojakId)
      if (result.success) {
        setWojaks(loadFavoriteWojaks())
        if (onRemove) {
          onRemove(wojakId)
        }
      }
    }
  }

  const handleView = async (wojak) => {
    playSound('click')
    const imageData = wojak.dataUrl || wojak.image
    
    if (!imageData) {
      alert('No image data available')
      return
    }
    
    try {
      let dataUrl = imageData
      
      // Convert blob URL to data URL if needed
      if (imageData.startsWith('blob:')) {
        dataUrl = await blobUrlToDataUrl(imageData)
      }
      
      // Validate data URL
      if (!dataUrl || !dataUrl.startsWith('data:image/')) {
        alert('Invalid image data format')
        return
      }
      
      // Call callback to open ImageViewerWindow
      if (onViewImage) {
        onViewImage(dataUrl, wojak.name || 'Favorite Wojak')
      } else {
        console.warn('onViewImage callback not provided')
        alert('View functionality is not available')
      }
    } catch (error) {
      console.error('Error viewing wojak:', error)
      alert('Failed to view image: ' + error.message)
    }
  }

  const handleDownload = async (wojak) => {
    playSound('click')
    try {
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640
      const imageDataUrl = wojak.dataUrl || wojak.image
      const filename = wojak.name || `favorite-wojak-${wojak.id}.png`
      
      if (!imageDataUrl) {
        alert('No image data available')
        return
      }
      
      if (isMobile) {
        // Mobile: Open image in new tab so user can save via long-press
        const newWindow = window.open('', '_blank', 'noopener,noreferrer')
        if (newWindow) {
          const doc = newWindow.document
          doc.open()
          doc.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>${filename}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                  * { margin: 0; padding: 0; box-sizing: border-box; }
                  body {
                    background: #000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    padding: 20px;
                  }
                  img {
                    max-width: 100%;
                    max-height: 100vh;
                    object-fit: contain;
                    display: block;
                  }
                </style>
              </head>
              <body>
                <img src="${imageDataUrl}" alt="${filename}" />
              </body>
            </html>
          `)
          doc.close()
        }
      } else {
        // Desktop: Download directly
        if (wojak.dataUrl) {
          // Convert data URL to blob and download
          const response = await fetch(wojak.dataUrl)
          const blob = await response.blob()
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = filename
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
        } else if (wojak.image) {
          // Download from image URL
          const link = document.createElement('a')
          link.href = wojak.image
          link.download = filename
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }
      }
    } catch (error) {
      console.error('Error downloading wojak:', error)
      alert('Failed to download wojak')
    }
  }

  if (!isOpen) return null

  return (
    <Window
      id="my-favorite-wojaks"
      title="MY FAVORITE WOJAKS"
      style={{
        width: 'clamp(280px, 92vw, 600px)',
        maxWidth: 'min(calc(100% - 16px), 600px)',
        left: '100px',
        top: '100px'
      }}
      onClose={onClose}
    >
      <div className="window-body">
        {/* Header */}
        <div style={{
          padding: '8px',
          borderBottom: '1px solid var(--border-dark)',
          marginBottom: '8px',
          fontFamily: 'MS Sans Serif, sans-serif'
        }}>
          <div className="status-text">
            {wojaks.length} favorite wojak{wojaks.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Grid of favorite wojaks */}
        {wojaks.length === 0 ? (
          <div className="empty-state-text" style={{
            padding: '40px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontFamily: 'MS Sans Serif, sans-serif'
          }}>
            No favorite wojaks yet.<br />
            Create wojaks in the Wojak Generator and save them here!
          </div>
        ) : (
          <div 
            className="favorite-wojaks-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: '12px',
              padding: '8px',
              maxHeight: '500px',
              overflowY: 'auto'
            }}
          >
            {wojaks.map((wojak) => (
              <div
                key={wojak.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '8px',
                  background: 'var(--surface-3)',
                  border: '1px inset var(--border-dark)',
                  gap: '4px'
                }}
              >
                <img
                  src={wojak.dataUrl || wojak.image}
                  alt={wojak.name || 'Favorite Wojak'}
                  onClick={() => handleView(wojak)}
                  style={{
                    width: '64px',
                    height: '64px',
                    objectFit: 'contain',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-dark)',
                    padding: '2px',
                    cursor: 'pointer'
                  }}
                />
                <div className="item-label" style={{
                  fontFamily: 'MS Sans Serif, sans-serif',
                  textAlign: 'center',
                  wordBreak: 'break-word',
                  maxWidth: '100%',
                  color: '#000',
                  fontSize: '11px'
                }}>
                  {wojak.name || 'Favorite Wojak'}
                </div>
                {wojak.savedAt && (
                  <div style={{
                    fontFamily: 'MS Sans Serif, sans-serif',
                    fontSize: '9px',
                    color: 'var(--text-muted)',
                    textAlign: 'center'
                  }}>
                    {new Date(wojak.savedAt).toLocaleDateString()}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '4px', width: '100%', flexWrap: 'wrap' }}>
                  <Button
                    onClick={() => handleView(wojak)}
                    style={{
                      padding: '2px 6px',
                      flex: 1,
                      minWidth: '60px'
                    }}
                  >
                    View
                  </Button>
                  <Button
                    onClick={() => handleDownload(wojak)}
                    style={{
                      padding: '2px 6px',
                      flex: 1,
                      minWidth: '60px'
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    onClick={() => handleRemove(wojak.id)}
                    style={{
                      padding: '2px 6px',
                      flex: 1,
                      minWidth: '60px'
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Window>
  )
}

