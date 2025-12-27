import Window from './Window'
import { useEffect, useState } from 'react'
import { useWindow } from '../../contexts/WindowContext'
import { Button } from '../ui'
import { downloadImageFromDataUrl } from '../../utils/imageUtils'

export default function ImageViewerWindow({ imageDataUrl, filename, onClose }) {
  const { bringToFront } = useWindow()
  const windowId = 'image-viewer'
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 640)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 640)
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (imageDataUrl) {
      bringToFront(windowId)
    }
  }, [imageDataUrl, bringToFront, windowId])

  const handleDownload = async () => {
    if (imageDataUrl) {
      try {
        await downloadImageFromDataUrl(imageDataUrl, filename || 'wojak-image.png')
      } catch (error) {
        console.error('Failed to download image:', error)
      }
    }
  }

  const handleOpenInNewTab = () => {
    if (imageDataUrl) {
      // Open image in new tab - mobile browsers can save via long-press
      const newWindow = window.open('', '_blank', 'noopener,noreferrer')
      if (newWindow) {
        const doc = newWindow.document
        doc.open()
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${filename || 'Image'}</title>
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
              <img src="${imageDataUrl}" alt="${filename || 'Image'}" />
            </body>
          </html>
        `)
        doc.close()
      }
    }
  }

  if (!imageDataUrl) return null

  return (
    <Window
      id={windowId}
      title={filename || 'IMAGE VIEWER'}
      style={{
        width: isMobile ? 'calc(100vw - 20px)' : 'clamp(400px, 80vw, 1200px)',
        height: isMobile ? 'calc(100vh - 100px)' : 'clamp(400px, 80vh, 900px)',
        maxWidth: isMobile ? 'calc(100vw - 20px)' : 'calc(100vw - 40px)',
        maxHeight: isMobile ? 'calc(100vh - 100px)' : 'calc(100vh - 40px)',
        left: isMobile ? '10px' : '50%',
        top: isMobile ? '10px' : '50%',
        transform: isMobile ? 'none' : 'translate(-50%, -50%)',
      }}
      onClose={onClose}
    >
      <div className="window-body" style={{
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        background: '#000',
        height: '100%',
        overflow: 'auto',
      }}>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto',
        }}>
          <img
            src={imageDataUrl}
            alt={filename || 'Image'}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              display: 'block',
            }}
            onError={(e) => {
              console.error('Failed to load image:', imageDataUrl?.substring(0, 50))
              e.target.style.display = 'none'
              e.target.parentElement.innerHTML = '<p style="color: white; text-align: center;">Failed to load image</p>'
            }}
          />
        </div>
        <div style={{
          padding: '8px',
          borderTop: '1px solid #333',
          display: 'flex',
          gap: '8px',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          {isMobile ? (
            <Button onClick={handleOpenInNewTab} style={{ flex: '1 1 auto', minWidth: '120px' }}>
              Open in New Tab
            </Button>
          ) : (
            <Button onClick={handleDownload} style={{ flex: '1 1 auto', minWidth: '120px' }}>
              Download
            </Button>
          )}
          {!isMobile && (
            <Button onClick={handleOpenInNewTab} style={{ flex: '1 1 auto', minWidth: '120px' }}>
              Open in New Tab
            </Button>
          )}
        </div>
      </div>
    </Window>
  )
}

