import { Checkbox } from '../ui'
import { LAYER_ORDER } from '../../lib/memeLayers'

export default function LayerPanel({ layerVisibility, onToggleVisibility, selectedLayers }) {
  return (
    <div style={{ 
      border: '1px inset #c0c0c0',
      padding: '8px',
      background: '#ffffff',
      minHeight: '200px'
    }}>
      <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '11px' }}>
        Layer Visibility:
      </p>
      {LAYER_ORDER.map(layer => {
        const layerName = layer.name
        const isVisible = layerVisibility[layerName] !== false
        const hasSelection = !!selectedLayers[layerName]

        return (
          <div key={layerName} style={{ marginBottom: '6px' }}>
            <Checkbox
              checked={isVisible}
              onChange={() => onToggleVisibility(layerName)}
              disabled={!hasSelection}
              label={`${layerName} ${hasSelection ? '✓' : ''}`}
            />
          </div>
        )
      })}
    </div>
  )
}

