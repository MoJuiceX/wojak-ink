import { useState } from 'react'
import { Button, FieldRow } from '../ui'
import { downloadCanvasAsPNG, copyCanvasToClipboard } from '../../utils/imageUtils'

export default function ExportControls({ canvasRef, selectedLayers = {} }) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState('')

  // Check if at least one meaningful layer is selected
  const canDownload = 
    (selectedLayers['Base'] && selectedLayers['Base'] !== 'None') ||
    (selectedLayers['Clothes'] && selectedLayers['Clothes'] !== 'None') ||
    (selectedLayers['Eyes'] && selectedLayers['Eyes'] !== 'None') ||
    (selectedLayers['MouthBase'] && selectedLayers['MouthBase'] !== 'None')

  const handleDownload = async () => {
    if (!canvasRef.current || !canDownload) return

    setIsExporting(true)
    setExportStatus('Downloading...')

    try {
      await downloadCanvasAsPNG(canvasRef.current)
      setExportStatus('Downloaded!')
      setTimeout(() => setExportStatus(''), 2000)
    } catch (error) {
      setExportStatus('Error downloading')
      console.error('Download error:', error)
      setTimeout(() => setExportStatus(''), 2000)
    } finally {
      setIsExporting(false)
    }
  }

  const handleCopy = async () => {
    if (!canvasRef.current) return

    setIsExporting(true)
    setExportStatus('Copying...')

    try {
      await copyCanvasToClipboard(canvasRef.current)
      setExportStatus('Copied to clipboard!')
      setTimeout(() => setExportStatus(''), 2000)
    } catch (error) {
      setExportStatus('Error copying')
      console.error('Copy error:', error)
      setTimeout(() => setExportStatus(''), 2000)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div>
      <FieldRow>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Button 
            onClick={handleDownload} 
            disabled={isExporting || !canvasRef.current || !canDownload}
          >
            Download PNG
          </Button>
          {!canDownload && (
            <p style={{ 
              margin: '0', 
              fontSize: '9px', 
              color: '#666',
              fontStyle: 'italic'
            }}>
              Select a base, clothes, eyes, or mouth first.
            </p>
          )}
        </div>
        <Button 
          onClick={handleCopy} 
          disabled={isExporting || !canvasRef.current}
        >
          Copy to Clipboard
        </Button>
        <Button 
          disabled={true}
        >
          Mint
        </Button>
      </FieldRow>
      {exportStatus && (
        <p style={{ 
          margin: '8px 0 0 0', 
          fontSize: '10px', 
          color: exportStatus.includes('Error') ? '#c00' : '#008000' 
        }}>
          {exportStatus}
        </p>
      )}
    </div>
  )
}

