import Window from './Window'
import { playSound } from '../../utils/soundManager'

const COMMUNITY_LINKS = [
  {
    name: 'Tang Gang Twitter',
    url: 'https://x.com/MoJuiceX',
    description: 'Follow @MoJuiceX for updates'
  },
  {
    name: 'Crate.ink Collection',
    url: 'https://crate.ink/#/collection-detail/WOJAKFARMERSPLOT',
    description: 'View the Wojak collection on Crate'
  },
  {
    name: 'Chia Network',
    url: 'https://www.chia.net/',
    description: 'Learn about Chia blockchain'
  },
  {
    name: 'MintGarden',
    url: 'https://mintgarden.io/',
    description: 'NFT marketplace for Chia'
  },
  {
    name: 'Dexie',
    url: 'https://dexie.space/',
    description: 'Decentralized exchange for Chia'
  },
]

export default function CommunityResourcesWindow({
  isOpen,
  onClose
}) {
  const handleLinkClick = (url) => {
    playSound('click')
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (!isOpen) return null

  return (
    <Window
      id="community-resources"
      title="COMMUNITY_RESOURCES.TXT"
      style={{
        width: 'clamp(400px, 90vw, 600px)',
        maxWidth: 'min(calc(100% - 16px), 600px)',
        left: '100px',
        top: '100px'
      }}
      onClose={onClose}
    >
      <div className="window-body" style={{
        padding: '16px',
        fontFamily: 'MS Sans Serif, sans-serif',
        fontSize: '12px',
        lineHeight: '1.5',
        color: '#000',
        overflowY: 'auto',
        maxHeight: '500px'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ 
            fontSize: '14px', 
            fontWeight: 'bold', 
            marginBottom: '8px',
            textTransform: 'uppercase'
          }}>
            Community Resources
          </h2>
          <p style={{ marginBottom: '16px', color: '#666' }}>
            Links to community resources, marketplaces, and related projects.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {COMMUNITY_LINKS.map((link, index) => (
            <div
              key={index}
              style={{
                padding: '8px',
                background: 'var(--surface-3)',
                border: '1px inset var(--border-dark)',
                cursor: 'pointer'
              }}
              onClick={() => handleLinkClick(link.url)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--surface-2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--surface-3)'
              }}
            >
              <div style={{ 
                fontWeight: 'bold', 
                marginBottom: '4px',
                color: '#000080',
                textDecoration: 'underline'
              }}>
                {link.name}
              </div>
              <div style={{ 
                fontSize: '11px', 
                color: '#666',
                marginBottom: '4px'
              }}>
                {link.description}
              </div>
              <div style={{ 
                fontSize: '10px', 
                color: '#999',
                fontFamily: 'monospace',
                wordBreak: 'break-all'
              }}>
                {link.url}
              </div>
            </div>
          ))}
        </div>

        <div style={{ 
          marginTop: '24px', 
          padding: '8px',
          background: 'var(--surface-1)',
          border: '1px inset var(--border-dark)',
          fontSize: '11px',
          color: '#666'
        }}>
          <strong>Note:</strong> Click on any resource above to open it in a new tab.
        </div>
      </div>
    </Window>
  )
}



