import { useState, useEffect } from 'react'
import Window from './Window'
import './DisplayPropertiesWindow.css'
import { setSoundTheme, getSoundTheme, getMuteState, setMuteState, toggleMute, playSound, getSoundMode, setSoundMode } from '../../utils/soundManager'

const WALLPAPERS = [
  { id: 'jungle', name: 'Jungle', url: '/wallpapers/jungle.png', color: null },
  { id: 'chia', name: 'Chia', url: '/wallpapers/chia.png', color: null },
  { id: 'orange-waves', name: 'Orange Waves', url: '/wallpapers/orange-waves.png', color: null },
  { id: 'orange-grove', name: 'Orange Grove', url: '/wallpapers/orangeGrove.png', color: null },
  { id: 'tanggang-life', name: 'Tang Gang Life', url: '/wallpapers/tanggang.life.png', color: null },
  { id: 'windows-98', name: 'Windows 98', url: '/wallpapers/windows-98.png', color: null },
  { id: 'windows-98bg', name: 'Windows 98 Background', url: '/wallpapers/windows-98bg.jpg', color: null },
  { id: 'windows-orange', name: 'Windows Orange', url: '/wallpapers/windows-orange.png', color: null },
  { id: 'solid-teal', name: 'Teal (Classic)', url: null, color: '#008080' },
  { id: 'solid-orange', name: 'Orange', url: null, color: '#ff6600' },
  { id: 'solid-black', name: 'Black', url: null, color: '#000000' },
  { id: 'solid-navy', name: 'Navy', url: null, color: '#000080' },
]

const SOUND_THEMES = [
  { id: 'Jungle', name: 'Jungle (Classic)' },
  { id: 'Musica', name: 'Musica' },
  { id: 'Robotz', name: 'Robotz' },
  { id: 'Utopia', name: 'Utopia' },
]

const SCREENSAVER_TIMEOUTS = [
  { value: 60000, label: '1 minute' },
  { value: 120000, label: '2 minutes' },
  { value: 300000, label: '5 minutes' },
  { value: 600000, label: '10 minutes' },
  { value: 0, label: 'Never' },
]

const THEMES = [
  { id: 'classic', name: 'Classic' },
  { id: 'light', name: 'Light Mode' },
  { id: 'dark', name: 'Dark Mode' },
  { id: 'green', name: 'Seedling Mode' },
]

const ACCENTS = [
  { id: 'default', name: 'Default' },
  { id: 'neon', name: 'Neon Green' },
]

// Helper functions for screensaver settings
const getScreensaverTimeout = () => {
  try {
    const stored = localStorage.getItem('screensaverTimeout')
    return stored ? parseInt(stored, 10) : 120000 // Default 2 minutes
  } catch (e) {
    return 120000
  }
}

const setScreensaverTimeout = (timeout) => {
  try {
    localStorage.setItem('screensaverTimeout', String(timeout))
    // Dispatch event to notify Screensaver component
    window.dispatchEvent(new CustomEvent('screensaverSettingsChanged'))
  } catch (e) {
    console.error('Failed to save screensaver timeout:', e)
  }
}

const getScreensaverDisabled = () => {
  try {
    return localStorage.getItem('screensaverDisabled') === 'true'
  } catch (e) {
    return false
  }
}

const setScreensaverDisabled = (disabled) => {
  try {
    localStorage.setItem('screensaverDisabled', String(disabled))
    // Dispatch event to notify Screensaver component
    window.dispatchEvent(new CustomEvent('screensaverSettingsChanged'))
  } catch (e) {
    console.error('Failed to save screensaver disabled state:', e)
  }
}

// Helper functions for theme and accent
const getTheme = () => {
  try {
    const stored = localStorage.getItem('theme')
    return stored || 'classic'
  } catch (e) {
    return 'classic'
  }
}

const setTheme = (theme) => {
  try {
    localStorage.setItem('theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }))
    window.dispatchEvent(new CustomEvent('appearanceChanged', { 
      detail: { 
        theme, 
        accent: getAccent() 
      } 
    }))
  } catch (e) {
    console.error('Failed to save theme:', e)
  }
}

const getAccent = () => {
  try {
    const stored = localStorage.getItem('accent')
    return stored || 'default'
  } catch (e) {
    return 'default'
  }
}

const setAccent = (accent) => {
  try {
    localStorage.setItem('accent', accent)
    document.documentElement.setAttribute('data-accent', accent)
    window.dispatchEvent(new CustomEvent('accentChanged', { detail: { accent } }))
    window.dispatchEvent(new CustomEvent('appearanceChanged', { 
      detail: { 
        theme: getTheme(), 
        accent 
      } 
    }))
  } catch (e) {
    console.error('Failed to save accent:', e)
  }
}

export default function DisplayPropertiesWindow({ isOpen, onClose, currentWallpaper, onChangeWallpaper }) {
  const [selectedWallpaper, setSelectedWallpaper] = useState(currentWallpaper || 'jungle')
  const [activeTab, setActiveTab] = useState('background')
  const [soundTheme, setSoundThemeState] = useState(() => getSoundTheme())
  const [soundMode, setSoundModeState] = useState(() => getSoundMode())
  const [isMuted, setIsMutedState] = useState(() => getMuteState())
  const [screensaverTimeout, setScreensaverTimeoutState] = useState(() => getScreensaverTimeout())
  const [screensaverDisabled, setScreensaverDisabledState] = useState(() => getScreensaverDisabled())
  const [theme, setThemeState] = useState(() => getTheme())
  const [accent, setAccentState] = useState(() => getAccent())

  useEffect(() => {
    if (currentWallpaper) {
      setSelectedWallpaper(currentWallpaper)
    }
  }, [currentWallpaper])

  // Sync mute state with external changes (e.g., from taskbar button)
  useEffect(() => {
    const handleMuteChange = () => {
      setIsMutedState(getMuteState())
    }

    // Listen for mute toggle events
    window.addEventListener('muteToggle', handleMuteChange)
    
    // Also check on storage changes
    const handleStorageChange = (e) => {
      if (e.key === 'sound_muted') {
        setIsMutedState(getMuteState())
      }
    }
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('muteToggle', handleMuteChange)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const handleApply = () => {
    if (onChangeWallpaper) {
      onChangeWallpaper(selectedWallpaper)
    }
  }

  const handleOk = () => {
    handleApply()
    if (onClose) {
      onClose()
    }
  }

  const handleSoundThemeChange = (theme) => {
    setSoundThemeState(theme)
    setSoundTheme(theme)
  }

  const handleSoundModeChange = (mode) => {
    setSoundModeState(mode)
    setSoundMode(mode)
  }

  const handleToggleMute = (e) => {
    e.preventDefault()
    const newMuteState = toggleMute()
    setIsMutedState(newMuteState)
    // Also dispatch event to ensure background music responds
    window.dispatchEvent(new CustomEvent('muteToggle', { detail: { muted: newMuteState } }))
  }

  const handleTestSound = () => {
    // Use a theme-specific sound that changes with themes
    // 'windowsStart' is very distinctive and different for each theme
    playSound('windowsStart')
  }

  if (!isOpen) return null

  const selected = WALLPAPERS.find(w => w.id === selectedWallpaper) || WALLPAPERS[0]

  return (
    <Window
      id="display-properties"
      title="Display Properties"
      onClose={onClose}
      style={{ 
        width: 'clamp(280px, 92vw, 420px)', 
        height: 'auto',
        left: '20px',
        top: '20px'
      }}
    >
      <div className="display-properties-content">
        {/* Tabs */}
        <div className="display-properties-tabs">
          <button
            className={`display-tab ${activeTab === 'background' ? 'active' : ''}`}
            onClick={() => setActiveTab('background')}
          >
            Background
          </button>
          <button
            className={`display-tab ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            Appearance
          </button>
          <button
            className={`display-tab ${activeTab === 'screensaver' ? 'active' : ''}`}
            onClick={() => setActiveTab('screensaver')}
          >
            Screen Saver
          </button>
          <button
            className={`display-tab ${activeTab === 'sounds' ? 'active' : ''}`}
            onClick={() => setActiveTab('sounds')}
          >
            Sounds
          </button>
        </div>

        <div className="display-properties-tab-content">
          {activeTab === 'background' && (
            <>
              {/* Preview Monitor */}
              <div className="display-preview-monitor">
                <div className="display-preview-screen">
                  {selected.url ? (
                    <img src={selected.url} alt={selected.name} onError={(e) => {
                      // Fallback to color if image fails to load
                      if (selected.color) {
                        e.target.style.display = 'none'
                        e.target.parentElement.style.background = selected.color
                      }
                    }} />
                  ) : (
                    <div style={{ background: selected.color, width: '100%', height: '100%' }} />
                  )}
                </div>
              </div>

              {/* Wallpaper List */}
              <div className="display-wallpaper-section">
                <label>Wallpaper:</label>
                <div className="display-wallpaper-list">
                  {WALLPAPERS.map(wallpaper => (
                    <div
                      key={wallpaper.id}
                      className={`display-wallpaper-item ${selectedWallpaper === wallpaper.id ? 'selected' : ''}`}
                      onClick={() => setSelectedWallpaper(wallpaper.id)}
                    >
                      {wallpaper.url ? (
                        <img src={wallpaper.url} alt={wallpaper.name} onError={(e) => {
                          // Fallback to placeholder - use safe DOM manipulation instead of innerHTML
                          e.target.style.display = 'none'
                          if (wallpaper.color) {
                            const parent = e.target.parentElement
                            // Clear existing content safely
                            while (parent.firstChild) {
                              parent.removeChild(parent.firstChild)
                            }
                            // Create elements safely
                            const swatch = document.createElement('div')
                            swatch.className = 'color-swatch'
                            swatch.style.background = wallpaper.color
                            const span = document.createElement('span')
                            span.textContent = wallpaper.name
                            parent.appendChild(swatch)
                            parent.appendChild(span)
                          }
                        }} />
                      ) : (
                        <div className="color-swatch" style={{ background: wallpaper.color }} />
                      )}
                      <span>{wallpaper.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'screensaver' && (
            <div className="screensaver-settings">
              <div className="settings-field-group">
                <label className="settings-label">
                  Wait:
                </label>
                <select
                  className="settings-select"
                  value={screensaverTimeout}
                  onChange={(e) => {
                    const timeout = parseInt(e.target.value, 10)
                    setScreensaverTimeoutState(timeout)
                    setScreensaverTimeout(timeout)
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {SCREENSAVER_TIMEOUTS.map(timeout => (
                    <option key={timeout.value} value={timeout.value}>
                      {timeout.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="settings-row">
                <input
                  type="checkbox"
                  className="settings-checkbox"
                  checked={!screensaverDisabled}
                  onChange={(e) => {
                    e.stopPropagation()
                    const disabled = !e.target.checked
                    setScreensaverDisabledState(disabled)
                    setScreensaverDisabled(disabled)
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                />
                <label 
                  className="settings-checkbox-label"
                  onClick={(e) => {
                    e.stopPropagation()
                    const disabled = !screensaverDisabled
                    setScreensaverDisabledState(disabled)
                    setScreensaverDisabled(disabled)
                  }}
                >
                  Enable Screen Saver
                </label>
              </div>

              <div className="settings-info-box">
                The screen saver will activate after the selected time of inactivity. Move the mouse or press any key to return.
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="appearance-settings">
              <div className="settings-field-group">
                <label className="settings-label">
                  Theme:
                </label>
                <select
                  className="settings-select"
                  value={theme}
                  onChange={(e) => {
                    const newTheme = e.target.value
                    setThemeState(newTheme)
                    setTheme(newTheme)
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {THEMES.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="settings-field-group">
                <label className="settings-label">
                  Accent:
                </label>
                <select
                  className="settings-select"
                  value={accent}
                  onChange={(e) => {
                    const newAccent = e.target.value
                    setAccentState(newAccent)
                    setAccent(newAccent)
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {ACCENTS.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="settings-info-box">
                Theme controls the base appearance of windows and surfaces. Accent controls selection highlights, focus rings, and active states.
              </div>
            </div>
          )}

          {activeTab === 'sounds' && (
            <div className="sound-settings">
              <div className="settings-field-group">
                <label className="settings-label">
                  Sound Theme:
                </label>
                <select
                  className="settings-select"
                  value={soundTheme}
                  onChange={(e) => handleSoundThemeChange(e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {SOUND_THEMES.map(theme => (
                    <option key={theme.id} value={theme.id}>
                      {theme.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="settings-field-group">
                <label className="settings-label">
                  Sound Mode:
                </label>
                <select
                  className="settings-select"
                  value={soundMode}
                  onChange={(e) => handleSoundModeChange(e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <option value="standard">Standard (Windows 98)</option>
                  <option value="party">Party Mode</option>
                </select>
              </div>

              <div className="settings-field-group">
                <button
                  className="settings-button"
                  onClick={handleTestSound}
                >
                  Test Sounds
                </button>
              </div>

              <div className="settings-row">
                <input
                  type="checkbox"
                  className="settings-checkbox"
                  checked={!isMuted}
                  onChange={(e) => {
                    e.stopPropagation()
                    handleToggleMute(e)
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                />
                <label 
                  className="settings-checkbox-label"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleToggleMute(e)
                  }}
                >
                  Enable Sounds
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="display-properties-buttons">
          <button onClick={handleOk}>OK</button>
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleApply}>Apply</button>
        </div>
      </div>
    </Window>
  )
}

