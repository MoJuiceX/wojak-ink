import { useWindow } from '../contexts/WindowContext'
import { APPS, DESKTOP_MAIN_ORDER, DESKTOP_GAMES_ORDER, DESKTOP_LINKS_ORDER } from '../constants/apps'
import AppIcon from './ui/AppIcon'
import { playSound } from '../utils/soundManager'

export default function DesktopIcons({ onOpenApp }) {
  const { getAllWindows, isWindowMinimized, restoreWindow, bringToFront } = useWindow()

  const handleAppClick = (app) => {
    // Switch on app.open.type
    switch (app.open.type) {
      case 'external':
        window.open(app.open.href, '_blank', 'noopener,noreferrer')
        return

      case 'callback':
        // Desktop doesn't support callbacks (Paint, Wojak Generator)
        // These are handled via Start Menu only
        console.warn('Callback actions not supported on desktop:', app.open.name)
        return

      case 'scroll':
      case 'window': {
        // Map scroll targets to window IDs (scroll behavior opens windows)
        const scrollToWindowId = {
          'scroll-to-readme': 'window-readme-txt',
          'scroll-to-mint': 'window-mint-info-exe',
          'scroll-to-gallery': 'window-gallery',
          'scroll-to-faq': 'window-faq',
          'scroll-to-marketplace': 'window-marketplace',
        }
        
        const windowId = app.open.type === 'window' 
          ? app.open.windowId 
          : scrollToWindowId[app.open.target]

        if (!windowId || !onOpenApp) return

        // Check if window is already open
        const allWindows = getAllWindows()
        const windowExists = allWindows.some(w => w.id === windowId)

        if (windowExists) {
          // Window exists - restore or bring to front
          if (isWindowMinimized(windowId)) {
            restoreWindow(windowId)
          } else {
            bringToFront(windowId)
          }
        } else {
          // Window not open - open it
          onOpenApp(windowId)
        }
        break
      }

      default:
        console.warn('Unknown app.open.type:', app.open.type)
    }
  }

  // Build desktop icons from order arrays
  const mainIcons = DESKTOP_MAIN_ORDER.map(appId => APPS[appId]).filter(Boolean)
  const gamesIcons = DESKTOP_GAMES_ORDER.map(appId => APPS[appId]).filter(Boolean)
  const linksIcons = DESKTOP_LINKS_ORDER.map(appId => APPS[appId]).filter(Boolean)

  const renderIconButton = (app, isLink = false) => (
    <button
      key={app.id}
      onClick={() => playSound('click')}
      onDoubleClick={() => handleAppClick(app)}
      className={isLink ? 'desktop-icon-button desktop-icon-link' : 'desktop-icon-button'}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
        fontFamily: "'MS Sans Serif', sans-serif",
        color: '#fff',
        textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
        width: '96px',
        position: 'relative',
        boxSizing: 'border-box',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
      }}
      aria-label={`Open ${app.label}`}
    >
      <div style={{ 
        position: 'relative', 
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        minWidth: '32px',
        minHeight: '32px',
        flexShrink: 0,
      }}>
        <AppIcon
          icon={app.icon}
          size={32}
          style={{
            imageRendering: 'pixelated',
            display: 'block',
          }}
        />
        {isLink && app.id !== 'CRATE' && app.id !== 'FOLLOW_UPDATES' && (
          <span
            className="desktop-icon-shortcut-arrow"
            aria-hidden="true"
          >
            ▶
          </span>
        )}
      </div>
      <span
        style={{
          display: 'block',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '96px',
          lineHeight: '14px',
          height: '14px',
          textAlign: 'center',
        }}
      >
        {app.label}
      </span>
    </button>
  )

  const sectionHeaderStyle = {
    padding: '4px 8px',
    fontWeight: 'bold',
    color: '#000',
    background: '#c0c0c0',
    textTransform: 'uppercase',
    marginTop: '20px',
    marginBottom: '8px',
    width: '96px',
    textAlign: 'center',
    border: '1px inset var(--border-dark)',
  }

  return (
    <div
      className="desktop-icons"
      style={{
        position: 'absolute',
        left: '20px',
        top: '20px',
        bottom: '46px',          // Anchor above taskbar
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1,
        pointerEvents: 'auto',
      }}
    >
      {/* TOP: Main icons (includes TangGang) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {mainIcons.map((app) => renderIconButton(app, false))}
      </div>

      {/* PUSHER: creates flexible space so SkiFree pins near bottom */}
      <div style={{ flex: 1 }} />

      {/* BOTTOM: games pinned (SkiFree then Pinball) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {gamesIcons.map((app) => renderIconButton(app, false))}
      </div>

      {/* Bottom: Crate icon only, no header/divider */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
        {linksIcons.map((app) => renderIconButton(app, true))}
      </div>
    </div>
  )
}

