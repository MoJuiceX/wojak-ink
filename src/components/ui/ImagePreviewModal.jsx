import { useEffect } from 'react'
import Window from '../windows/Window'
import Button from './Button'
import { playSound } from '../../utils/soundManager'

/**
 * Image Preview Modal Component
 * Shows a full-size preview of an image with download functionality
 * Windows 98 style modal using the Window component
 */
export default function ImagePreviewModal({ 
  isOpen, 
  onClose, 
  image 
}) {
  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        playSound('click')
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen || !image) return null

  const handleDownload = () => {
    playSound('click')
    
    try {
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a')
      link.href = image.path
      link.download = image.fileName || image.name + '.png'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Failed to download image:', error)
      // Fallback: open in new tab
      window.open(image.path, '_blank')
    }
  }

  const handleBackdropClick = (e) => {
    // Close if clicking on the backdrop (not the window content)
    if (e.target === e.currentTarget) {
      playSound('click')
      onClose()
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000, // High z-index to appear above all windows
        cursor: 'default'
      }}
      onClick={handleBackdropClick}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        style={{ maxWidth: '76.5vw', maxHeight: '76.5vh' }}
      >
        <Window
          id="image-preview-modal"
          title="IMAGE PREVIEW"
          style={{
            width: 'clamp(340px, 76.5vw, 680px)',
            maxWidth: 'min(calc(100vw - 40px), 680px)',
            maxHeight: '76.5vh'
          }}
          onClose={() => {
            playSound('click')
            onClose()
          }}
        >
          <div className="window-body" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            padding: '10px',
            fontFamily: 'MS Sans Serif, sans-serif'
          }}>
            {/* Image Name */}
            <div style={{
              padding: '3px 7px',
              background: 'var(--surface-3)',
              border: '1px inset var(--border-dark)',
              fontFamily: 'MS Sans Serif, sans-serif',
              fontSize: '10px',
              wordBreak: 'break-word'
            }}>
              <strong>File:</strong> {image.fileName || image.name + '.png'}
            </div>

            {/* Image Preview */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: '1px inset var(--border-dark)',
              padding: '3px',
              minHeight: '170px',
              maxHeight: '51vh',
              overflow: 'hidden'
            }}>
              <img
                src={image.path}
                alt={image.displayName || image.name}
                style={{
                  maxWidth: 'calc(100% - 6px)',
                  maxHeight: 'calc(51vh - 6px)',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  imageRendering: 'auto',
                  display: 'block'
                }}
                onError={(e) => {
                  e.target.style.display = 'none'
                  const parent = e.target.parentElement
                  if (parent) {
                    const errorDiv = document.createElement('div')
                    errorDiv.textContent = 'Failed to load image'
                    errorDiv.style.cssText = `
                      padding: 20px;
                      text-align: center;
                      color: var(--text-muted);
                      font-family: MS Sans Serif, sans-serif;
                    `
                    parent.appendChild(errorDiv)
                  }
                }}
              />
            </div>

            {/* Display Name */}
            {image.displayName && (
              <div style={{
                padding: '3px 7px',
                background: 'var(--surface-3)',
                border: '1px inset var(--border-dark)',
                fontFamily: 'MS Sans Serif, sans-serif',
                fontSize: '10px',
                wordBreak: 'break-word',
                textAlign: 'center'
              }}>
                {image.displayName}
              </div>
            )}

            {/* Buttons */}
            <div style={{
              display: 'flex',
              gap: '7px',
              justifyContent: 'flex-end',
              paddingTop: '7px',
              borderTop: '1px solid var(--border-dark)'
            }}>
              <Button
                onClick={handleDownload}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                Download
              </Button>
              <Button
                onClick={() => {
                  playSound('click')
                  onClose()
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                Close
              </Button>
            </div>
          </div>
        </Window>
      </div>
    </div>
  )
}

