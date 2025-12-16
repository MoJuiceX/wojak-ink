import Window from './Window'
import { useMemeGenerator } from '../../hooks/useMemeGenerator'
import { LAYER_ORDER } from '../../lib/memeLayers'
import MemeCanvas from '../meme/MemeCanvas'
import LayerSelector from '../meme/LayerSelector'
import LayerPanel from '../meme/LayerPanel'
import ExportControls from '../meme/ExportControls'

export default function WojakCreator() {
  const {
    selectedLayers,
    layerVisibility,
    selectLayer,
    toggleLayerVisibility,
    canvasRef
  } = useMemeGenerator()

  return (
    <Window
      id="wojak-creator"
      title="WOJAK_CREATOR.EXE"
      noStack={true}
      style={{ 
        width: '1000px',
        height: 'auto',
        maxWidth: 'calc(100vw - 40px)',
        maxHeight: 'calc(100vh - 70px)',
        left: '20px', 
        top: '460px'
      }}
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
            <ExportControls canvasRef={canvasRef} />
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
            {LAYER_ORDER.map(layer => (
              <LayerSelector
                key={layer.name}
                layerName={layer.name}
                onSelect={selectLayer}
                selectedValue={selectedLayers[layer.name]}
              />
            ))}

            <div style={{ marginTop: '16px' }}>
              <LayerPanel
                layerVisibility={layerVisibility}
                onToggleVisibility={toggleLayerVisibility}
                selectedLayers={selectedLayers}
              />
            </div>
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

