import { useState } from 'react'
import { Button, FieldRow } from '../ui'
import { downloadCanvasAsPNG, copyCanvasToClipboard } from '../../utils/imageUtils'

export default function ExportControls({ canvasRef, selectedLayers = {} }) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState('')

  // Require a complete base Wojak before allowing download:
  // - Base
  // - Mouth (Base)
  // - Clothing
  const hasBase =
    selectedLayers['Base'] && selectedLayers['Base'] !== 'None'
  const hasMouthBase =
    selectedLayers['MouthBase'] && selectedLayers['MouthBase'] !== 'None'
  const hasClothes =
    selectedLayers['Clothes'] && selectedLayers['Clothes'] !== 'None'

  const canDownload = hasBase && hasMouthBase && hasClothes
  const isDownloadDisabled =
    !canDownload || isExporting || !canvasRef.current

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
            disabled={isDownloadDisabled}
            className={`generator-download-btn ${!canDownload ? 'is-disabled' : ''}`}
            title={
              !canDownload
                ? 'Select Base, Mouth (Base), and Clothing to download'
                : 'Download'
            }
          >
            Download
          </Button>
          {!canDownload && (
            <p style={{ 
              margin: '0', 
              fontSize: '9px', 
              color: '#666',
              fontStyle: 'italic'
            }}>
              Select Base, Mouth (Base), and Clothing before downloading.
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

