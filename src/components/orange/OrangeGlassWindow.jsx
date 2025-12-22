import { useOrangeToy } from '../../contexts/OrangeToyContext'

/**
 * OrangeGlassWindow - Win98-style mini window displaying glass fill progress
 * Shows glass images (g1-g7) based on score progress
 * Fixed position in bottom-right corner, non-interactive (pointer-events: none)
 */
export default function OrangeGlassWindow({ glassSrc, variant = 'default' }) {
  // Read from context if prop not provided (for overlay mode)
  const { glassSrc: contextGlassSrc } = useOrangeToy()
  // Keep existing glassSrc logic unchanged - prop takes precedence, then context, then fallback
  const src = glassSrc || contextGlassSrc || "/assets/images/banners/g1.png";
  
  return (
    <div
      className="orange-glass-window"
      data-variant={variant !== 'default' ? variant : undefined}
    >
      <div className="orange-glass-window-inner">
        <img src={src} alt="Glass fill progress" draggable="false" />
      </div>
    </div>
  )
}

