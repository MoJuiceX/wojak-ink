import Window from './Window'

export default function TryAgainWindow({ isOpen, claimsCount, onClose }) {
  if (!isOpen) return null

  return (
    <Window
      id="try-again-window"
      title="🎁"
      icon={null}
      noStack={true}
      contentAutoHeight={true}
      style={{
        width: '400px',
        maxWidth: '90vw',
        minWidth: '300px',
        height: 'auto',
      }}
      onClose={onClose}
    >
      <div style={{ padding: '8px 12px 10px 12px', textAlign: 'center' }}>
        <div style={{ fontWeight: 'bold', marginBottom: 10, paddingBottom: 1, fontSize: 32 }}>
          Try again!!!
        </div>

        <img
          src="/assets/images/banners/betterluck.png"
          alt="Better luck"
          style={{ maxWidth: 520, width: '100%', height: 'auto', display: 'block', margin: '0 auto' }}
        />

        <div style={{
          marginTop: 10,
          paddingTop: 10,
          textAlign: 'center',
          color: '#808080',
          fontSize: 12,
          fontFamily: "'MS Sans Serif', sans-serif"
        }}>
          Total claimed prizes: 13
        </div>
      </div>
    </Window>
  )
}
