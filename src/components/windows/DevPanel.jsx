import Window from './Window'
import { useState } from 'react'
import Button from '../ui/Button'

export default function DevPanel({ onResetStartup, onClose }) {
  const [resetStatus, setResetStatus] = useState('')

  const handleResetStartup = () => {
    try {
      // Clear sessionStorage flags
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem('hasSeenStartup')
        window.sessionStorage.removeItem('hasSeenBoot')
      }
      
      // Clear localStorage flag if it exists
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('wojak_start_hint_dismissed')
      }
      
      setResetStatus('✓ Startup sequence reset! Refresh the page to see it again (including boot sequence).')
      
      // Call the parent callback to reset the startup state
      if (onResetStartup) {
        onResetStartup()
      }
    } catch (error) {
      setResetStatus('✗ Error resetting startup sequence: ' + error.message)
    }
  }

  const handleRefresh = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  return (
    <Window
      id="dev-panel"
      title="DEV PANEL"
      style={{ 
        width: '500px', 
        maxWidth: 'calc(100vw - 40px)', 
        left: '40px', 
        top: '40px' 
      }}
      onClose={onClose}
    >
      <div className="window-body" style={{ padding: '16px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h3 className="panel-header" style={{ marginBottom: '12px', fontWeight: 'bold' }}>
            Testing Tools
          </h3>
          <p className="helper-text" style={{ marginBottom: '16px', color: 'var(--text-2)' }}>
            Use these tools to test various features during development.
          </p>
        </div>

        <div style={{ marginBottom: '24px', padding: '12px', background: 'var(--surface-3)', border: '1px inset var(--border-dark)' }}>
          <h4 className="panel-header" style={{ marginBottom: '8px', fontWeight: 'bold' }}>
            Startup Sequence
          </h4>
          <p className="helper-text" style={{ marginBottom: '12px', color: 'var(--text-2)' }}>
            Reset the startup sequence to test it again. This clears the session storage flag and allows you to see the loading sequence on the next page load.
          </p>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
            <Button onClick={handleResetStartup}>
              Reset Startup Sequence
            </Button>
            <Button onClick={handleRefresh}>
              Refresh Page
            </Button>
          </div>
          
          {resetStatus && (
            <div 
              style={{ 
                marginTop: '8px',
                padding: '8px',
                background: resetStatus.startsWith('✓') ? '#e8f5e9' : '#ffebee',
                border: `1px solid ${resetStatus.startsWith('✓') ? '#4caf50' : '#f44336'}`,
                color: resetStatus.startsWith('✓') ? '#2e7d32' : '#c62828',
                fontSize: '12px'
              }}
            >
              {resetStatus}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--surface-3)', border: '1px inset var(--border-dark)' }}>
          <h4 className="panel-header" style={{ marginBottom: '8px', fontWeight: 'bold' }}>
            Storage Info
          </h4>
          <div className="helper-text" style={{ fontSize: '11px', color: 'var(--text-2)', fontFamily: 'monospace' }}>
            <div>hasSeenStartup: {typeof window !== 'undefined' && window.sessionStorage ? (window.sessionStorage.getItem('hasSeenStartup') || 'null') : 'N/A'}</div>
            <div>hasSeenBoot: {typeof window !== 'undefined' && window.sessionStorage ? (window.sessionStorage.getItem('hasSeenBoot') || 'null') : 'N/A'}</div>
            <div>wojak_start_hint_dismissed: {typeof window !== 'undefined' && window.localStorage ? (window.localStorage.getItem('wojak_start_hint_dismissed') || 'null') : 'N/A'}</div>
          </div>
        </div>
      </div>
    </Window>
  )
}

