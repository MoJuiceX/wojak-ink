import { useWindow } from '../contexts/WindowContext'
import { getWindowIcon } from '../utils/windowIcons'

export default function DesktopIcons({ onOpenApp }) {
  const { getAllWindows, isWindowMinimized, restoreWindow, bringToFront } = useWindow()

  const handleIconClick = (windowId) => {
    if (!onOpenApp) return

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
  }

  const desktopIcons = [
    {
      id: 'pinball-window',
      label: '3D Pinball',
      icon: getWindowIcon('pinball-window', '3D Pinball for Windows - Space Cadet'),
    },
  ]

  return (
    <div
      className="desktop-icons"
      style={{
        position: 'absolute',
        left: '20px',
        top: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '40px',
        zIndex: 1,
      }}
    >
      {desktopIcons.map((icon) => (
        <button
          key={icon.id}
          onDoubleClick={() => handleIconClick(icon.id)}
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
            fontSize: '11px',
            color: '#fff',
            textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
            width: '80px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
          aria-label={`Open ${icon.label}`}
        >
          <img
            src={icon.icon}
            alt=""
            style={{
              width: '32px',
              height: '32px',
              imageRendering: 'pixelated',
            }}
            onError={(e) => {
              e.target.style.display = 'none'
            }}
          />
          <span
            style={{
              textAlign: 'center',
              wordBreak: 'break-word',
              lineHeight: '1.2',
            }}
          >
            {icon.label}
          </span>
        </button>
      ))}
    </div>
  )
}

