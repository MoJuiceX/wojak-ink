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
      title="PREVIEW"
      style={{
        width: isMobile ? 'calc(100vw - 20px)' : '600px',
        height: isMobile ? 'calc(100vh - 100px)' : '680px', // 656px content + ~24px title bar
        maxWidth: isMobile ? 'calc(100vw - 20px)' : 'min(600px, calc(100vw - 40px))',
        maxHeight: isMobile ? 'calc(100vh - 100px)' : 'min(680px, calc(100vh - 40px))',
        left: isMobile ? '10px' : undefined,
        top: isMobile ? '10px' : undefined,
      }}
      onClose={onClose}
    >
      <div className="window-body" style={{
        padding: '2px 8px 2px 8px',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--window-face)',
        height: '656px',
        overflow: 'auto',
        boxSizing: 'border-box',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          overflow: 'hidden',
          background: 'var(--window-face)',
          paddingBottom: '0',
          minHeight: 0,
          flexShrink: 1,
        }}>
          <img
            src={imageDataUrl}
            alt={filename || 'Image'}
            style={{
              maxWidth: '584px',
              maxHeight: '600px',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              display: 'block',
            }}
            onError={(e) => {
              console.error('Failed to load image:', imageDataUrl?.substring(0, 50))
              e.target.style.display = 'none'
              e.target.parentElement.innerHTML = '<p style="color: var(--text); text-align: center; padding: 20px;">Failed to load image</p>'
            }}
          />
        </div>
        <div style={{
          padding: '2px 8px',
          borderTop: '1px solid var(--border-dark)',
          display: 'flex',
          gap: '8px',
          justifyContent: 'center',
          flexWrap: 'wrap',
          flexShrink: 0,
          background: 'var(--window-face)',
          marginTop: 'auto',
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
        </div>
      </div>
    </Window>
  )
}

