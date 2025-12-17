import Window from './Window'
import { useMemeGenerator } from '../../hooks/useMemeGenerator'
import { UI_LAYER_ORDER } from '../../lib/memeLayers'
import MemeCanvas from '../meme/MemeCanvas'
import LayerSelector from '../meme/LayerSelector'
import ExportControls from '../meme/ExportControls'
import { useEffect } from 'react'

export default function WojakCreator({ onClose }) {
  const {
    selectedLayers,
    selectLayer,
    canvasRef,
    disabledLayers
  } = useMemeGenerator()

  // Calculate centered position for initial render
  const getCenteredPosition = () => {
    const windowWidth = Math.min(1000, window.innerWidth - 40)
    const windowHeight = Math.min(800, window.innerHeight - 100)
    const left = Math.max(20, (window.innerWidth - windowWidth) / 2)
    const top = Math.max(20, (window.innerHeight - windowHeight) / 2)
    return { left: Math.round(left), top: Math.round(top) }
  }

  const centeredPos = getCenteredPosition()

  // Center window after mount (fallback in case initial style doesn't apply)
  useEffect(() => {
    const win = document.getElementById('wojak-creator')
    if (!win) return

    const rect = win.getBoundingClientRect()
    const currentLeft = rect.left
    const currentTop = rect.top
    
    // Only center if window is at default position (top-left corner)
    if (currentLeft <= 40 && currentTop <= 40) {
      const windowWidth = rect.width || Math.min(1000, window.innerWidth - 40)
      const windowHeight = rect.height || Math.min(800, window.innerHeight - 100)
      const left = Math.max(20, (window.innerWidth - windowWidth) / 2)
      const top = Math.max(20, (window.innerHeight - windowHeight) / 2)
      
      win.style.left = `${Math.round(left)}px`
      win.style.top = `${Math.round(top)}px`
    }
  }, [])

  return (
    <Window
      id="wojak-creator"
      title="WOJAK_CREATOR.EXE"
      noStack={true}
      onClose={onClose}
      style={{ 
        width: '1000px',
        height: 'auto',
        maxWidth: 'calc(100vw - 40px)',
        maxHeight: '90vh',
        left: `${centeredPos.left}px`,
        top: `${centeredPos.top}px`,
        position: 'absolute',
      }}
      className="wojak-creator-window"
    >
      <div className="meme-generator-container" style={{ 
        display: 'flex', 
        gap: '16px', 
        alignItems: 'flex-start',
        flexWrap: 'nowrap',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        padding: '8px',
        flexShrink: 1
      }}>
        {/* Left side: Meme Preview */}
        <div style={{ 
          flex: '0 0 450px',
          minWidth: '300px',
          maxWidth: '450px',
          flexShrink: 0
        }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: 'bold' }}>
            Meme Preview:
          </p>
          <MemeCanvas canvasRef={canvasRef} width={400} height={400} />
          <div style={{ marginTop: '12px' }}>
            <ExportControls canvasRef={canvasRef} selectedLayers={selectedLayers} />
          </div>
        </div>

        {/* Right side: Select Layers */}
        <div style={{ 
          flex: '1 1 auto',
          minWidth: '250px',
          maxWidth: '100%',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: 'bold', flexShrink: 0 }}>
            Select Layers:
          </p>
          <div style={{ 
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            minHeight: 0
          }}>
            {UI_LAYER_ORDER.map(layer => (
              <LayerSelector
                key={layer.name}
                layerName={layer.name}
                onSelect={selectLayer}
                selectedValue={selectedLayers[layer.name]}
                disabled={disabledLayers.includes(layer.name)}
                selectedLayers={selectedLayers}
              />
            ))}
          </div>
        </div>
      </div>

      <div style={{ 
        margin: '0',
        padding: '12px',
        backgroundColor: '#f0f0f0', 
        borderTop: '1px inset #c0c0c0',
        fontSize: '11px',
        lineHeight: '1.4',
        flexShrink: 0
      }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '12px' }}>
          Custom Wojak Minting Coming Soon
        </p>
        <p style={{ margin: '0', color: '#000000' }}>
          Create your custom Wojak meme by selecting layers. Export as PNG or copy to clipboard. 
          <strong> Custom Wojak NFT will be available after the initial collection mints out.</strong> Some proceeds from custom Wojak mints will be reinvested back into the collection to support the community.
        </p>
      </div>
    </Window>
  )
}

