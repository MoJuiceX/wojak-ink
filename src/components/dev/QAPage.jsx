import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import './QAPage.css'

// QA Issue type
const ISSUE_STATUS = {
  MUST_FIX: 'must-fix',
  ACCEPTABLE: 'acceptable',
  FIXED: 'fixed'
}

export default function QAPage() {
  const location = useLocation()
  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  const [deviceCategory, setDeviceCategory] = useState('')
  const [safeAreaInsets, setSafeAreaInsets] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  })
  const [gridVisible, setGridVisible] = useState(false)
  const [gridSize, setGridSize] = useState(8) // Default 8px grid
  const [issues, setIssues] = useState([])
  const [newIssue, setNewIssue] = useState({ description: '', viewport: '', status: ISSUE_STATUS.MUST_FIX })

  // Update viewport on resize
  useEffect(() => {
    const updateViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    updateViewport()
    window.addEventListener('resize', updateViewport)
    window.addEventListener('orientationchange', updateViewport)

    return () => {
      window.removeEventListener('resize', updateViewport)
      window.removeEventListener('orientationchange', updateViewport)
    }
  }, [])

  // Detect device category
  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      
      if (width < 640) {
        setDeviceCategory('mobile')
      } else if (width < 1024) {
        setDeviceCategory('tablet')
      } else {
        setDeviceCategory('desktop')
      }
    }

    detectDevice()
    window.addEventListener('resize', detectDevice)
    return () => window.removeEventListener('resize', detectDevice)
  }, [])

  // Get safe-area insets (for notched devices)
  useEffect(() => {
    const updateSafeArea = () => {
      const computedStyle = getComputedStyle(document.documentElement)
      setSafeAreaInsets({
        top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0', 10),
        right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0', 10),
        bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10),
        left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0', 10),
      })
    }

    updateSafeArea()
    window.addEventListener('resize', updateSafeArea)
    return () => window.removeEventListener('resize', updateSafeArea)
  }, [])

  // Toggle grid overlay
  const toggleGrid = () => {
    setGridVisible(!gridVisible)
  }

  // Grid size options
  const gridSizes = [4, 8, 12, 16, 20, 24]

  // Load issues from localStorage on mount
  useEffect(() => {
    const savedIssues = localStorage.getItem('qa-issues')
    if (savedIssues) {
      try {
        setIssues(JSON.parse(savedIssues))
      } catch (e) {
        console.error('Failed to load QA issues:', e)
      }
    }
  }, [])

  // Save issues to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('qa-issues', JSON.stringify(issues))
  }, [issues])

  // Add new issue
  const addIssue = () => {
    if (!newIssue.description.trim()) return
    
    const issue = {
      id: Date.now(),
      description: newIssue.description,
      viewport: newIssue.viewport || `${viewport.width}x${viewport.height}`,
      status: newIssue.status,
      timestamp: new Date().toISOString(),
    }
    
    setIssues([...issues, issue])
    setNewIssue({ description: '', viewport: '', status: ISSUE_STATUS.MUST_FIX })
  }

  // Update issue status
  const updateIssueStatus = (id, status) => {
    setIssues(issues.map(issue => 
      issue.id === id ? { ...issue, status } : issue
    ))
  }

  // Delete issue
  const deleteIssue = (id) => {
    setIssues(issues.filter(issue => issue.id !== id))
  }

  // Clear all issues
  const clearAllIssues = () => {
    if (confirm('Clear all QA issues?')) {
      setIssues([])
    }
  }

  // QA Checklist items
  const checklistItems = [
    { id: 'iphone-se', label: 'iPhone SE (375x667)', viewport: '375x667' },
    { id: 'iphone-pro-max', label: 'iPhone Pro Max (428x926)', viewport: '428x926' },
    { id: 'android-chrome', label: 'Android Chrome (360x800)', viewport: '360x800' },
    { id: 'desktop-1440', label: 'Desktop 1440px (1440x900)', viewport: '1440x900' },
    { id: 'keyboard-nav', label: 'Keyboard-only navigation', viewport: 'all' },
  ]

  const mustFixCount = issues.filter(i => i.status === ISSUE_STATUS.MUST_FIX).length
  const acceptableCount = issues.filter(i => i.status === ISSUE_STATUS.ACCEPTABLE).length
  const fixedCount = issues.filter(i => i.status === ISSUE_STATUS.FIXED).length

  return (
    <div className="qa-page">
      {/* Grid Overlay */}
      {gridVisible && (
        <div 
          className="qa-grid-overlay"
          style={{
            '--grid-size': `${gridSize}px`,
          }}
        />
      )}

      <div className="qa-container">
        <header className="qa-header">
          <h1>Responsive QA Checklist</h1>
          <p className="qa-instructions">
            This page helps you test responsive design across different viewport sizes and devices.
            Use the grid overlay to check alignment and spacing. All values update in real-time as you resize the viewport.
          </p>
        </header>

        <div className="qa-content">
          {/* Viewport Size */}
          <section className="qa-section">
            <h2>Viewport Size</h2>
            <div className="qa-info-grid">
              <div className="qa-info-item">
                <span className="qa-label">Width:</span>
                <span className="qa-value">{viewport.width}px</span>
              </div>
              <div className="qa-info-item">
                <span className="qa-label">Height:</span>
                <span className="qa-value">{viewport.height}px</span>
              </div>
              <div className="qa-info-item">
                <span className="qa-label">Aspect Ratio:</span>
                <span className="qa-value">
                  {viewport.width && viewport.height
                    ? (viewport.width / viewport.height).toFixed(2)
                    : '—'}
                </span>
              </div>
            </div>
          </section>

          {/* Device Category */}
          <section className="qa-section">
            <h2>Device Category</h2>
            <div className="qa-device-badge" data-device={deviceCategory}>
              {deviceCategory || 'detecting...'}
            </div>
            <p className="qa-note">
              Based on viewport width: &lt;640px = mobile, 640-1024px = tablet, &gt;1024px = desktop
            </p>
          </section>

          {/* Safe Area Insets */}
          <section className="qa-section">
            <h2>Safe Area Insets</h2>
            <p className="qa-note">
              CSS environment variables for notched devices (iPhone X+, Android with display cutouts)
            </p>
            <div className="qa-info-grid">
              <div className="qa-info-item">
                <span className="qa-label">Top:</span>
                <span className="qa-value">{safeAreaInsets.top}px</span>
              </div>
              <div className="qa-info-item">
                <span className="qa-label">Right:</span>
                <span className="qa-value">{safeAreaInsets.right}px</span>
              </div>
              <div className="qa-info-item">
                <span className="qa-label">Bottom:</span>
                <span className="qa-value">{safeAreaInsets.bottom}px</span>
              </div>
              <div className="qa-info-item">
                <span className="qa-label">Left:</span>
                <span className="qa-value">{safeAreaInsets.left}px</span>
              </div>
            </div>
          </section>

          {/* Current Route */}
          <section className="qa-section">
            <h2>Current Route</h2>
            <div className="qa-route-display">
              <code>{location.pathname}</code>
            </div>
            {location.search && (
              <div className="qa-route-display">
                <span className="qa-label">Query:</span>
                <code>{location.search}</code>
              </div>
            )}
            {location.hash && (
              <div className="qa-route-display">
                <span className="qa-label">Hash:</span>
                <code>{location.hash}</code>
              </div>
            )}
          </section>

          {/* Grid Overlay Controls */}
          <section className="qa-section">
            <h2>Grid Overlay</h2>
            <div className="qa-grid-controls">
              <button
                className={`qa-button ${gridVisible ? 'qa-button-active' : ''}`}
                onClick={toggleGrid}
              >
                {gridVisible ? 'Hide Grid' : 'Show Grid'}
              </button>
              {gridVisible && (
                <div className="qa-grid-size-selector">
                  <label htmlFor="grid-size">Grid Size:</label>
                  <select
                    id="grid-size"
                    value={gridSize}
                    onChange={(e) => setGridSize(Number(e.target.value))}
                  >
                    {gridSizes.map((size) => (
                      <option key={size} value={size}>
                        {size}px
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <p className="qa-note">
              The grid overlay helps you verify alignment and spacing. Adjust the grid size to match your design system.
            </p>
          </section>

          {/* Additional Info */}
          <section className="qa-section">
            <h2>Additional Information</h2>
            <div className="qa-info-grid">
              <div className="qa-info-item">
                <span className="qa-label">User Agent:</span>
                <span className="qa-value-small">{navigator.userAgent}</span>
              </div>
              <div className="qa-info-item">
                <span className="qa-label">Touch Support:</span>
                <span className="qa-value">
                  {'ontouchstart' in window || navigator.maxTouchPoints > 0 ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="qa-info-item">
                <span className="qa-label">Pixel Ratio:</span>
                <span className="qa-value">{window.devicePixelRatio || 1}</span>
              </div>
              <div className="qa-info-item">
                <span className="qa-label">Orientation:</span>
                <span className="qa-value">
                  {viewport.width > viewport.height ? 'Landscape' : 'Portrait'}
                </span>
              </div>
            </div>
          </section>

          {/* QA Checklist */}
          <section className="qa-section">
            <h2>QA Checklist</h2>
            <p className="qa-note">
              Test these viewports and scenarios. Document any issues found below.
            </p>
            <div className="qa-checklist">
              {checklistItems.map(item => (
                <div key={item.id} className="qa-checklist-item">
                  <input
                    type="checkbox"
                    id={`checklist-${item.id}`}
                    className="qa-checkbox"
                  />
                  <label htmlFor={`checklist-${item.id}`}>
                    {item.label}
                  </label>
                </div>
              ))}
            </div>
          </section>

          {/* Issues Log */}
          <section className="qa-section">
            <div className="qa-issues-header">
              <h2>Issues Log</h2>
              <div className="qa-issues-stats">
                <span className={`qa-stat qa-stat-must-fix`}>
                  Must Fix: {mustFixCount}
                </span>
                <span className={`qa-stat qa-stat-acceptable`}>
                  Acceptable: {acceptableCount}
                </span>
                <span className={`qa-stat qa-stat-fixed`}>
                  Fixed: {fixedCount}
                </span>
                {issues.length > 0 && (
                  <button
                    className="qa-button qa-button-small"
                    onClick={clearAllIssues}
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Add New Issue */}
            <div className="qa-add-issue">
              <h3>Add New Issue</h3>
              <div className="qa-issue-form">
                <textarea
                  placeholder="Describe the issue..."
                  value={newIssue.description}
                  onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                  rows={3}
                  className="qa-textarea"
                />
                <div className="qa-issue-form-row">
                  <input
                    type="text"
                    placeholder="Viewport (e.g., 375x667)"
                    value={newIssue.viewport}
                    onChange={(e) => setNewIssue({ ...newIssue, viewport: e.target.value })}
                    className="qa-input"
                  />
                  <select
                    value={newIssue.status}
                    onChange={(e) => setNewIssue({ ...newIssue, status: e.target.value })}
                    className="qa-select"
                  >
                    <option value={ISSUE_STATUS.MUST_FIX}>Must Fix</option>
                    <option value={ISSUE_STATUS.ACCEPTABLE}>Acceptable</option>
                  </select>
                  <button
                    className="qa-button"
                    onClick={addIssue}
                    disabled={!newIssue.description.trim()}
                  >
                    Add Issue
                  </button>
                </div>
              </div>
            </div>

            {/* Issues List */}
            {issues.length === 0 ? (
              <p className="qa-note">No issues documented yet. Use the form above to add issues found during testing.</p>
            ) : (
              <div className="qa-issues-list">
                {issues.map(issue => (
                  <div key={issue.id} className={`qa-issue qa-issue-${issue.status}`}>
                    <div className="qa-issue-header">
                      <span className="qa-issue-viewport">{issue.viewport}</span>
                      <span className={`qa-issue-status qa-issue-status-${issue.status}`}>
                        {issue.status === ISSUE_STATUS.MUST_FIX && '⚠️ Must Fix'}
                        {issue.status === ISSUE_STATUS.ACCEPTABLE && '✓ Acceptable'}
                        {issue.status === ISSUE_STATUS.FIXED && '✅ Fixed'}
                      </span>
                    </div>
                    <p className="qa-issue-description">{issue.description}</p>
                    <div className="qa-issue-actions">
                      <select
                        value={issue.status}
                        onChange={(e) => updateIssueStatus(issue.id, e.target.value)}
                        className="qa-select-small"
                      >
                        <option value={ISSUE_STATUS.MUST_FIX}>Must Fix</option>
                        <option value={ISSUE_STATUS.ACCEPTABLE}>Acceptable</option>
                        <option value={ISSUE_STATUS.FIXED}>Fixed</option>
                      </select>
                      <button
                        className="qa-button-small qa-button-danger"
                        onClick={() => deleteIssue(issue.id)}
                      >
                        Delete
                      </button>
                    </div>
                    <div className="qa-issue-timestamp">
                      {new Date(issue.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

