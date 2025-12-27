import Window from './Window'
import { useState, useRef, useEffect } from 'react'
import { getStorageUsage } from '../../utils/desktopStorage'
import { Button } from '../ui'
import { playSound } from '../../utils/soundManager'

export default function RecycleBinWindow({
  isOpen,
  onClose,
  recycleBin,
  onRestore,
  onDeleteForever,
  onEmptyBin,
  onExport,
  onImport
}) {
  const [storageUsage, setStorageUsage] = useState(getStorageUsage())
  const fileInputRef = useRef(null)

  // Update storage usage when recycle bin changes
  useEffect(() => {
    setStorageUsage(getStorageUsage())
  }, [recycleBin])

  const handleEmptyBin = () => {
    if (window.confirm('Permanently delete all items in Recycle Bin?')) {
      playSound('recycleBin')
      onEmptyBin()
      setStorageUsage(getStorageUsage())
    }
  }

  const handleImport = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      onImport(file)
      e.target.value = '' // Reset input
    }
  }

  if (!isOpen) return null

  return (
    <Window
      id="recycle-bin-window"
      title="RECYCLE BIN"
      style={{
        width: 'clamp(280px, 92vw, 600px)',
        maxWidth: 'min(calc(100% - 16px), 600px)',
        left: '100px',
        top: '100px'
      }}
      onClose={onClose}
    >
      <div className="window-body">
        {/* Toolbar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px',
          borderBottom: '1px solid var(--border-dark)',
          marginBottom: '8px',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            <Button onClick={handleEmptyBin}>
              Empty Recycle Bin
            </Button>
            <Button onClick={onExport}>
              Export Gallery
            </Button>
            <Button onClick={handleImport}>
              Import Gallery
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>
          <div className="status-text" style={{
            fontFamily: 'MS Sans Serif, sans-serif'
          }}>
            {recycleBin.length} item(s)
          </div>
        </div>

        {/* Storage Usage Indicator */}
        <div className="storage-info-box" style={{
          padding: '8px',
          background: 'var(--surface-3)',
          border: '1px inset var(--border-dark)',
          marginBottom: '8px',
          fontFamily: 'MS Sans Serif, sans-serif',
          color: 'var(--text-1)'
        }}>
          <div style={{ marginBottom: '4px' }}>
            Storage: {storageUsage.usedMB} MB / {storageUsage.limitMB} MB ({storageUsage.percentage}%)
          </div>
          <div style={{
            width: '100%',
            height: '12px',
            background: 'var(--border-dark)',
            border: '1px inset var(--border-dark)',
            position: 'relative'
          }}>
            <div style={{
              width: `${storageUsage.percentage}%`,
              height: '100%',
              background: storageUsage.percentage > 80 ? 'var(--state-warning)' : 'var(--state-success)',
              transition: 'width 0.3s ease'
            }} />
          </div>
          {storageUsage.percentage > 80 && (
            <div style={{ color: 'var(--state-error)', marginTop: '4px', fontWeight: 'bold' }}>
              ⚠️ Storage usage is high!
            </div>
          )}
        </div>

        {/* Grid of deleted images */}
        {recycleBin.length === 0 ? (
          <div className="empty-state-text" style={{
            padding: '40px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontFamily: 'MS Sans Serif, sans-serif'
          }}>
            Recycle Bin is empty
          </div>
        ) : (
          <div 
            className="recycle-bin-grid-scrollable"
            style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: '12px',
            padding: '8px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {recycleBin.map((item) => (
              <div
                key={item.id}
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
                  src={item.image || item.imageDataUrl}
                  alt={item.name || item.filename}
                  style={{
                    width: '64px',
                    height: '64px',
                    objectFit: 'contain',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-dark)',
                    padding: '2px'
                  }}
                />
                <div className="item-label" style={{
                  fontFamily: 'MS Sans Serif, sans-serif',
                  textAlign: 'center',
                  wordBreak: 'break-word',
                  maxWidth: '100%',
                  color: '#000'
                }}>
                  {item.name || item.filename || 'Unknown'}
                </div>
                <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
                  <Button
                    onClick={() => {
                      // Party mode only - restore sound
                      playSound('windowRestoreUp')
                      onRestore(item.id)
                    }}
                    style={{
                      padding: '2px 6px',
                      flex: 1
                    }}
                  >
                    Restore
                  </Button>
                  <Button
                    onClick={() => onDeleteForever(item.id)}
                    style={{
                      padding: '2px 6px',
                      flex: 1
                    }}
                  >
                    Delete
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

