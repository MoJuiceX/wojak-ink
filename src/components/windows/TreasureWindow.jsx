import Window from './Window'

export default function TreasureWindow({ isOpen = false, onClose, prizesClaimed = 0 }) {
  // Safe default for onClose
  const handleClose = onClose || (() => {})

  if (!isOpen) return null

  // Calculate centered position
  const getCenteredPosition = () => {
    const windowWidth = 500
    const windowHeight = 500
    const left = Math.max(20, (window.innerWidth - windowWidth) / 2)
    const top = Math.max(20, (window.innerHeight - windowHeight) / 2)
    return { left: Math.round(left), top: Math.round(top) }
  }

  const centeredPos = getCenteredPosition()

  return (
    <Window
      id="treasure-window"
      title="TREASURE"
      style={{
        width: '500px',
        maxWidth: 'calc(100vw - 40px)',
        ...centeredPos
      }}
      onClose={handleClose}
    >
      <div className="window-body" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '20px',
        textAlign: 'center',
        minHeight: '400px'
      }}>
        <img 
          src="/assets/treasure-prize.png" 
          alt="Better luck next time!"
          style={{
            maxWidth: '100%',
            height: 'auto',
            marginBottom: '20px',
            display: 'block'
          }}
        />
        <button
          className="button"
          onClick={handleClose}
          style={{
            marginTop: '10px',
            padding: '8px 16px',
            fontSize: '12px'
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          OK
        </button>
      </div>
    </Window>
  )
}

