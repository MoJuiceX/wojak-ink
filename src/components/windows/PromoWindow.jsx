import Window from './Window'

/**
 * PromoWindow - Placeholder for future sponsored content
 * Uses theme tokens automatically, can be populated later without breaking theme system
 */
export default function PromoWindow({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <Window
      id="promo-window"
      title="PROMOTIONS"
      onClose={onClose}
      style={{ 
        width: '400px', 
        height: '300px',
        left: '20px',
        top: '20px'
      }}
    >
      <div className="window-body">
        <p>Promotional content will appear here.</p>
        <p style={{ fontSize: '10px', color: 'var(--text-2)' }}>
          This window uses theme tokens automatically.
        </p>
      </div>
    </Window>
  )
}
















