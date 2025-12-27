import { useState } from 'react'
import Window from './Window'

export default function ThemeQAWindow({ isOpen, onClose }) {
  const [currentTheme, setCurrentTheme] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.getAttribute('data-theme') || 'classic'
    }
    return 'classic'
  })
  const [activeWindowDemo, setActiveWindowDemo] = useState(true)

  const setTheme = (theme) => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme)
      window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }))
      setCurrentTheme(theme)
    }
  }

  if (!isOpen) return null

  return (
    <Window
      id="theme-qa-window"
      title="THEME QA"
      style={{ 
        width: 'clamp(280px, 92vw, 900px)', 
        maxWidth: 'min(calc(100% - 16px), 900px)', 
        left: '50px', 
        top: '50px' 
      }}
      onClose={onClose}
      allowScroll={true}
    >
      <div className="window-body">
        <div style={{ padding: '16px' }}>
          {/* Theme Toggle */}
          <div style={{ marginBottom: '24px', padding: '12px', border: '1px inset var(--border-dark)', background: 'var(--panel-face)' }}>
            <h3 className="section-heading" style={{ margin: '0 0 12px 0', fontWeight: 'bold', color: 'var(--text-1)' }}>Theme Selector</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setTheme('classic')}
                style={{
                  padding: '6px 12px',
                  border: currentTheme === 'classic' ? '2px inset var(--border-dark)' : '2px outset var(--border-light)',
                  background: currentTheme === 'classic' ? 'var(--btn-active-face)' : 'var(--btn-face)',
                  color: currentTheme === 'classic' ? 'var(--btn-active-text)' : 'var(--btn-text)',
                  fontWeight: currentTheme === 'classic' ? 'bold' : 'normal',
                  cursor: 'pointer'
                }}
              >
                Classic
              </button>
              <button
                onClick={() => setTheme('dark')}
                style={{
                  padding: '6px 12px',
                  border: currentTheme === 'dark' ? '2px inset var(--border-dark)' : '2px outset var(--border-light)',
                  background: currentTheme === 'dark' ? 'var(--btn-active-face)' : 'var(--btn-face)',
                  color: currentTheme === 'dark' ? 'var(--btn-active-text)' : 'var(--btn-text)',
                  fontWeight: currentTheme === 'dark' ? 'bold' : 'normal',
                  cursor: 'pointer'
                }}
              >
                Dark
              </button>
              <button
                onClick={() => setTheme('light')}
                style={{
                  padding: '6px 12px',
                  border: currentTheme === 'light' ? '2px inset var(--border-dark)' : '2px outset var(--border-light)',
                  background: currentTheme === 'light' ? 'var(--btn-active-face)' : 'var(--btn-face)',
                  color: currentTheme === 'light' ? 'var(--btn-active-text)' : 'var(--btn-text)',
                  fontWeight: currentTheme === 'light' ? 'bold' : 'normal',
                  cursor: 'pointer'
                }}
              >
                Light
              </button>
            </div>
            <p className="helper-text" style={{ margin: '8px 0 0 0', color: 'var(--text-2)' }}>
              Current theme: <strong>{currentTheme}</strong>
            </p>
          </div>

          {/* Taskbar Preview */}
          <div style={{ marginBottom: '24px', padding: '12px', border: '1px inset var(--border-dark)', background: 'var(--panel-face)' }}>
            <h3 className="section-heading" style={{ margin: '0 0 12px 0', fontWeight: 'bold', color: 'var(--text-1)' }}>Taskbar Buttons</h3>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ 
                padding: '4px 12px', 
                border: '1px outset var(--border-light)', 
                background: 'var(--taskbar-btn-face)', 
                color: 'var(--taskbar-btn-text)',
                minWidth: '100px'
              }}>
                Normal
              </div>
              <div style={{ 
                padding: '4px 12px', 
                border: '1px outset var(--border-light)', 
                background: 'var(--taskbar-btn-hover-face)', 
                color: 'var(--taskbar-btn-hover-text)',
                minWidth: '100px'
              }}>
                Hover
              </div>
              <div style={{ 
                padding: '4px 12px', 
                border: '1px inset var(--border-dark)', 
                background: 'var(--taskbar-btn-active-face)', 
                color: 'var(--taskbar-btn-active-text)',
                fontWeight: 'bold',
                minWidth: '100px',
                boxShadow: 'inset 1px 1px 2px rgba(0, 0, 0, 0.2)'
              }}>
                Active
              </div>
              <div style={{ 
                padding: '4px 12px', 
                border: '1px outset var(--border-light)', 
                background: 'var(--btn-disabled-face)', 
                color: 'var(--btn-disabled-text)',
                opacity: 0.6,
                minWidth: '100px'
              }}>
                Disabled
              </div>
            </div>
            <p className="helper-text" style={{ margin: '8px 0 0 0', color: 'var(--text-2)' }}>
              All taskbar buttons must be readable in all themes. Check: README.TXT button text is white in dark mode.
            </p>
          </div>

          {/* Window Title Bars */}
          <div style={{ marginBottom: '24px', padding: '12px', border: '1px inset var(--border-dark)', background: 'var(--panel-face)' }}>
            <h3 className="section-heading" style={{ margin: '0 0 12px 0', fontWeight: 'bold', color: 'var(--text-1)' }}>Window Title Bars</h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1', minWidth: '200px' }}>
                <div className="panel-header" style={{ 
                  padding: '4px 8px', 
                  background: 'var(--title-active-bg)', 
                  color: 'var(--title-active-text)',
                  fontWeight: 'bold',
                  marginBottom: '4px'
                }}>
                  Active Window Title
                </div>
                <p className="helper-text" style={{ margin: '4px 0 0 0', color: 'var(--text-2)' }}>Active</p>
              </div>
              <div style={{ flex: '1', minWidth: '200px' }}>
                <div className="panel-header" style={{ 
                  padding: '4px 8px', 
                  background: 'var(--title-inactive-bg)', 
                  color: 'var(--title-inactive-text)',
                  marginBottom: '4px'
                }}>
                  Inactive Window Title
                </div>
                <p className="helper-text" style={{ margin: '4px 0 0 0', color: 'var(--text-2)' }}>Inactive</p>
              </div>
            </div>
          </div>

          {/* Buttons Matrix */}
          <div style={{ marginBottom: '24px', padding: '12px', border: '1px inset var(--border-dark)', background: 'var(--panel-face)' }}>
            <h3 className="section-heading" style={{ margin: '0 0 12px 0', fontWeight: 'bold', color: 'var(--text-1)' }}>Buttons - All States</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
              <div>
                <button style={{ width: '100%', marginBottom: '4px' }}>Default</button>
                <p className="helper-text" style={{ margin: '0', color: 'var(--text-2)' }}>Normal</p>
              </div>
              <div>
                <button 
                  style={{ width: '100%', marginBottom: '4px' }}
                  onMouseEnter={(e) => e.target.style.background = 'var(--btn-hover-face)'}
                  onMouseLeave={(e) => e.target.style.background = 'var(--btn-face)'}
                >
                  Hover
                </button>
                <p className="helper-text" style={{ margin: '0', color: 'var(--text-2)' }}>Hover</p>
              </div>
              <div>
                <button 
                  style={{ 
                    width: '100%', 
                    marginBottom: '4px',
                    border: '1px inset var(--border-dark)',
                    background: 'var(--btn-active-face)'
                  }}
                >
                  Pressed
                </button>
                <p className="helper-text" style={{ margin: '0', color: 'var(--text-2)' }}>Pressed</p>
              </div>
              <div>
                <button disabled style={{ width: '100%', marginBottom: '4px' }}>Disabled</button>
                <p className="helper-text" style={{ margin: '0', color: 'var(--text-2)' }}>Disabled</p>
              </div>
              <div>
                <button 
                  style={{ width: '100%', marginBottom: '4px' }}
                  onFocus={(e) => e.target.style.outline = '2px dotted var(--focus)'}
                  onBlur={(e) => e.target.style.outline = 'none'}
                  tabIndex={0}
                >
                  Focus
                </button>
                <p className="helper-text" style={{ margin: '0', color: 'var(--text-2)' }}>Focus</p>
              </div>
            </div>
          </div>

          {/* Inputs Matrix */}
          <div style={{ marginBottom: '24px', padding: '12px', border: '1px inset var(--border-dark)', background: 'var(--panel-face)' }}>
            <h3 className="section-heading" style={{ margin: '0 0 12px 0', fontWeight: 'bold', color: 'var(--text-1)' }}>Inputs - All States</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
              <div>
                <input type="text" defaultValue="Default" style={{ width: '100%', marginBottom: '4px' }} />
                <p className="helper-text" style={{ margin: '0', color: 'var(--text-2)' }}>Normal</p>
              </div>
              <div>
                <input 
                  type="text" 
                  defaultValue="Focus" 
                  style={{ width: '100%', marginBottom: '4px' }}
                  onFocus={(e) => e.target.style.outline = '2px dotted var(--focus)'}
                  onBlur={(e) => e.target.style.outline = 'none'}
                  tabIndex={0}
                />
                <p className="helper-text" style={{ margin: '0', color: 'var(--text-2)' }}>Focus</p>
              </div>
              <div>
                <input type="text" placeholder="Placeholder" disabled={false} style={{ width: '100%', marginBottom: '4px' }} />
                <p className="helper-text" style={{ margin: '0', color: 'var(--text-2)' }}>Placeholder</p>
              </div>
              <div>
                <input type="text" defaultValue="Disabled" disabled style={{ width: '100%', marginBottom: '4px' }} />
                <p className="helper-text" style={{ margin: '0', color: 'var(--text-2)' }}>Disabled</p>
              </div>
            </div>
          </div>

          {/* Lists and Selection */}
          <div style={{ marginBottom: '24px', padding: '12px', border: '1px inset var(--border-dark)', background: 'var(--panel-face)' }}>
            <h3 className="section-heading" style={{ margin: '0 0 12px 0', fontWeight: 'bold', color: 'var(--text-1)' }}>Lists and Selection</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
              <div>
                <div className="panel-header" style={{ 
                  padding: '4px 8px', 
                  background: 'var(--panel-face)', 
                  color: 'var(--text)',
                  marginBottom: '4px'
                }}>
                  Default Item
                </div>
                <p className="helper-text" style={{ margin: '0', color: 'var(--text-2)' }}>Default</p>
              </div>
              <div>
                <div className="panel-header" style={{ 
                  padding: '4px 8px', 
                  background: 'var(--menu-hover-bg)', 
                  color: 'var(--menu-hover-text)',
                  marginBottom: '4px'
                }}>
                  Hover Item
                </div>
                <p className="helper-text" style={{ margin: '0', color: 'var(--text-2)' }}>Hover</p>
              </div>
              <div>
                <div className="panel-header" style={{ 
                  padding: '4px 8px', 
                  background: 'var(--selection-bg)', 
                  color: 'var(--selection-text)',
                  marginBottom: '4px'
                }}>
                  Selected Item
                </div>
                <p className="helper-text" style={{ margin: '0', color: 'var(--text-2)' }}>Selected</p>
              </div>
              <div>
                <div className="panel-header" style={{ 
                  padding: '4px 8px', 
                  background: 'var(--panel-face)', 
                  color: 'var(--text-disabled)',
                  marginBottom: '4px'
                }}>
                  Disabled Item
                </div>
                <p className="helper-text" style={{ margin: '0', color: 'var(--text-2)' }}>Disabled</p>
              </div>
            </div>
            <div style={{ marginTop: '12px', padding: '8px', background: 'var(--input-face)', border: '1px inset var(--border-dark)' }}>
              <p className="status-text" style={{ margin: '0', color: 'var(--text-1)' }}>
                <span style={{ background: 'var(--selection-bg)', color: 'var(--selection-text)', padding: '2px 4px' }}>Selected text</span> in a paragraph
              </p>
            </div>
          </div>

          {/* Menu Preview */}
          <div style={{ marginBottom: '24px', padding: '12px', border: '1px inset var(--border-dark)', background: 'var(--panel-face)' }}>
            <h3 className="section-heading" style={{ margin: '0 0 12px 0', fontWeight: 'bold', color: 'var(--text-1)' }}>Menu Items</h3>
            <div style={{ 
              display: 'inline-block',
              border: '2px outset var(--border-light)',
              background: 'var(--menu-bg)',
              padding: '2px',
              minWidth: '200px'
            }}>
              <div className="start-menu-item" style={{ padding: '4px 8px', color: 'var(--menu-text)' }}>Default Item</div>
              <div className="start-menu-item" style={{ 
                padding: '4px 8px', 
                background: 'var(--menu-hover-bg)', 
                color: 'var(--menu-hover-text)'
              }}>
                Hover Item
              </div>
              <div className="start-menu-item" style={{ 
                padding: '4px 8px', 
                background: 'var(--selection-bg)', 
                color: 'var(--selection-text)'
              }}>
                Selected Item
              </div>
              <div style={{ 
                height: '1px', 
                background: 'var(--menu-separator)', 
                margin: '2px 0',
                borderBottom: '1px solid var(--border-light)'
              }}></div>
              <div className="start-menu-item" style={{ 
                padding: '4px 8px', 
                color: 'var(--text-disabled)'
              }}>
                Disabled Item
              </div>
            </div>
          </div>

          {/* Focus Indicators */}
          <div style={{ marginBottom: '24px', padding: '12px', border: '1px inset var(--border-dark)', background: 'var(--panel-face)' }}>
            <h3 className="section-heading" style={{ margin: '0 0 12px 0', fontWeight: 'bold', color: 'var(--text-1)' }}>Focus Indicators</h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button 
                tabIndex={0}
                style={{ 
                  padding: '6px 12px',
                  outline: '2px dotted var(--focus)',
                  outlineOffset: '2px'
                }}
              >
                Button Focus
              </button>
              <input 
                type="text" 
                defaultValue="Input Focus" 
                tabIndex={0}
                style={{ 
                  padding: '4px 8px',
                  outline: '2px dotted var(--focus)',
                  outlineOffset: '2px'
                }}
              />
              <select 
                tabIndex={0}
                style={{ 
                  padding: '4px 8px',
                  outline: '2px dotted var(--focus)',
                  outlineOffset: '2px'
                }}
              >
                <option>Select Focus</option>
              </select>
            </div>
            <p className="helper-text" style={{ margin: '8px 0 0 0', color: 'var(--text-2)' }}>
              Tab through elements to see focus indicators. All should be visible.
            </p>
          </div>

          {/* Verification Checklist */}
          <div style={{ padding: '12px', border: '1px inset var(--border-dark)', background: 'var(--panel-face)' }}>
            <h3 className="section-heading" style={{ margin: '0 0 12px 0', fontWeight: 'bold', color: 'var(--text-1)' }}>Verification Checklist</h3>
            <ul className="status-text" style={{ margin: '0', paddingLeft: '20px', color: 'var(--text-1)', lineHeight: '1.6' }}>
              <li>All taskbar buttons readable (especially README.TXT in dark mode)</li>
              <li>Start button readable in all themes</li>
              <li>Active/inactive title bars distinct and readable</li>
              <li>All button states (normal/hover/pressed/disabled/focus) visible</li>
              <li>Inputs use inset borders, focus visible</li>
              <li>Selection states high contrast</li>
              <li>Menu items readable in all states</li>
              <li>Focus indicators visible on all interactive elements</li>
              <li>No black-on-dark or white-on-light text</li>
              <li>3D bevel borders work correctly (outset for raised, inset for pressed)</li>
            </ul>
          </div>
        </div>
      </div>
    </Window>
  )
}

