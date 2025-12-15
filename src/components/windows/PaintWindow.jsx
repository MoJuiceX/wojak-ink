import { useState, useRef, useEffect } from 'react'
import Window from './Window'
import ImageLibraryPanel from '../paint/ImageLibraryPanel'

export default function PaintWindow({ onClose }) {
  const iframeRef = useRef(null)
  const [jspaintReady, setJspaintReady] = useState(false)

  // Handle inserting image into JS Paint
  const handleImageInsert = async (imagePath) => {
    if (!iframeRef.current) return

    try {
      // Load the image and convert to blob
      const response = await fetch(imagePath)
      const blob = await response.blob()
      
      // Create a File object from the blob
      const file = new File([blob], 'memetic-energy.png', { type: 'image/png' })
      
      // Try multiple methods to insert the image into JS Paint
      
      // Method 1: Try to use JS Paint's file input if accessible
      try {
        const iframe = iframeRef.current
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
        
        if (iframeDoc) {
          // Look for file input in JS Paint
          const fileInput = iframeDoc.querySelector('input[type="file"]')
          if (fileInput) {
            const dataTransfer = new DataTransfer()
            dataTransfer.items.add(file)
            fileInput.files = dataTransfer.files
            fileInput.dispatchEvent(new Event('change', { bubbles: true }))
            return
          }
        }
      } catch (err) {
        console.log('Direct file input method failed (cross-origin):', err)
      }

      // Method 2: Try clipboard API
      try {
        const item = new ClipboardItem({ 'image/png': blob })
        await navigator.clipboard.write([item])
        
        // Try to trigger paste in JS Paint iframe
        if (iframeRef.current.contentWindow) {
          // Focus the iframe and send Ctrl+V
          iframeRef.current.contentWindow.focus()
          // Note: We can't directly send keyboard events due to security, but clipboard is ready
          alert('Image copied to clipboard! Press Ctrl+V in Paint to paste it.')
        }
      } catch (err) {
        console.log('Clipboard method failed:', err)
        
        // Method 3: Fallback - open image in new window for manual copy
        const imageUrl = URL.createObjectURL(blob)
        const newWindow = window.open(imageUrl, '_blank')
        if (newWindow) {
          alert('Image opened in new window. Right-click and copy the image, then paste it into Paint (Ctrl+V).')
        } else {
          alert('Please allow popups to open the image, or manually navigate to the image and copy it.')
        }
      }
    } catch (error) {
      console.error('Error inserting image:', error)
      alert('Failed to insert image. You can manually open the image file and copy it into Paint.')
    }
  }

  // Inject CSS to hide JS Paint's internal window frame and force classic theme
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const injectCSS = () => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
        if (!iframeDoc) return

        // Check if CSS is already injected
        if (iframeDoc.getElementById('embedded-mode-css')) return

        // Create and inject embedded CSS
        const style = iframeDoc.createElement('style')
        style.id = 'embedded-mode-css'
        style.textContent = `
          /* Force body/html to fill iframe when embedded */
          html, body {
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }

          /* Ensure .jspaint fills available space */
          body.embedded .jspaint {
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Ensure vertical container fills height */
          body.embedded .jspaint > .vertical {
            height: 100% !important;
            min-height: 0 !important;
            overflow: hidden !important;
          }

          /* Ensure status bar and color palette are always visible */
          body.embedded .status-area {
            flex-shrink: 0 !important;
            visibility: visible !important;
            display: flex !important;
          }
        `
        iframeDoc.head.appendChild(style)

        // Force classic theme via localStorage
        try {
          const iframeWindow = iframe.contentWindow
          if (iframeWindow && iframeWindow.localStorage) {
            iframeWindow.localStorage.setItem('jspaint theme', 'classic.css')
            iframeWindow.localStorage.setItem('jspaint disable seasonal theme', 'true')
          }
        } catch (e) {
          console.log('Could not set localStorage in iframe:', e)
        }
      } catch (error) {
        console.log('Could not inject CSS into iframe (may be cross-origin):', error)
      }
    }

    // Try to inject immediately
    injectCSS()

    // Also try after iframe loads
    const handleLoad = () => {
      setTimeout(injectCSS, 100) // Small delay to ensure JS Paint has initialized
    }

    iframe.addEventListener('load', handleLoad)
    return () => iframe.removeEventListener('load', handleLoad)
  }, [])

  // Listen for JS Paint ready
  useEffect(() => {
    const handleMessage = (event) => {
      // Listen for messages from JS Paint iframe
      if (event.data && event.data.type === 'jspaint-ready') {
        setJspaintReady(true)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return (
    <Window
      id="paint-window"
      title="MEMETIC_ENERGY_PAINT.EXE"
      style={{
        width: '1000px',
        height: '750px',
        minWidth: '800px',
        minHeight: '600px',
      }}
      onClose={onClose}
    >
      <div
        style={{
          display: 'flex',
          flex: 1,
          width: '100%',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {/* JS Paint iframe */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: 0, // Critical for flex children
          }}
        >
          <iframe
            ref={iframeRef}
            src="/jspaint/index.html?embedded=true"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              flex: 1,
              minHeight: 0, // Critical for flex children
            }}
            title="JS Paint"
            allow="clipboard-read; clipboard-write"
          />
        </div>

        {/* Memetic Energy Image Library Sidebar */}
        <div
          className="paint-window-sidebar"
          style={{
            width: '250px',
            borderLeft: '2px inset #c0c0c0',
            background: '#c0c0c0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: "'MS Sans Serif', sans-serif",
          }}
        >
          <div
            style={{
              padding: '8px',
              borderBottom: '1px solid #808080',
              fontSize: '11px',
              fontWeight: 'bold',
              background: '#c0c0c0',
            }}
          >
            Memetic Energy
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <ImageLibraryPanel onImageSelect={handleImageInsert} />
          </div>
          <div
            style={{
              padding: '8px',
              fontSize: '10px',
              color: '#808080',
              borderTop: '1px solid #808080',
              background: '#c0c0c0',
            }}
          >
            Click an image to insert into Paint
          </div>
        </div>
      </div>
    </Window>
  )
}

