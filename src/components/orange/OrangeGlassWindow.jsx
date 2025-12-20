/**
 * OrangeGlassWindow - Win98-style mini window displaying glass fill progress
 * Shows glass images (g1-g7) based on score progress
 * Fixed position in bottom-right corner, non-interactive (pointer-events: none)
 */
export default function OrangeGlassWindow({ glassSrc }) {
  // Fallback to g1.png if glassSrc is falsy - guarantees it never disappears
  const src = glassSrc || "/assets/images/banners/g1.png";
  
  return (
    <div className="orange-glass-window">
      <div className="orange-glass-window-inner">
        <img src={src} alt="Glass fill progress" />
      </div>
    </div>
  )
}

