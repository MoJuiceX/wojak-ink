import { useState, useContext } from 'react'
import Window from './Window'
import { MarketplaceContext } from '../../contexts/MarketplaceContext'
import Button from '../ui/Button'
import Input from '../ui/Input'

export default function MarketplaceNotActiveDialog({ isOpen, onClose }) {
  // Access context directly - if not available, it will be null/undefined
  const marketplaceContext = useContext(MarketplaceContext)
  
  const isAdmin = marketplaceContext?.isAdmin || false
  const marketplaceEnabled = marketplaceContext?.marketplaceEnabled || false
  const setMarketplaceEnabled = marketplaceContext?.setMarketplaceEnabled || (() => {})
  const loginAsAdmin = marketplaceContext?.loginAsAdmin || (() => false)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  if (!isOpen) return null

  const handleLogin = (e) => {
    e.preventDefault()
    setLoginError('')

    const success = loginAsAdmin(password)
    if (!success) {
      setLoginError('Invalid admin password.')
    } else {
      setPassword('')
    }
  }

  const handleToggleMarketplace = (enabled) => {
    setMarketplaceEnabled(enabled)
  }

  return (
    <Window
      id="marketplace-not-active-dialog"
      title="MARKETPLACE"
      style={{
        width: '360px',
        maxWidth: 'calc(100vw - 40px)',
        left: '20px',
        top: '20px',
      }}
      onClose={onClose}
      noStack
    >
      <div className="window-body" style={{ padding: '12px', fontSize: '11px' }}>
        <p style={{ marginTop: 0, marginBottom: '8px' }}>
          Marketplace not active yet.
        </p>
        <p style={{ marginTop: 0, marginBottom: '12px' }}>
          Please check back later. If you are an admin, you can enable it below.
        </p>

        {isAdmin ? (
          <div
            style={{
              borderTop: '1px solid #808080',
              paddingTop: '8px',
              marginTop: '4px',
            }}
          >
            <p style={{ fontWeight: 'bold', margin: 0, marginBottom: '6px' }}>
              Admin
            </p>
            <p style={{ margin: 0, marginBottom: '8px' }}>
              Marketplace status:{' '}
              <b>{marketplaceEnabled ? 'ENABLED' : 'DISABLED'}</b>
            </p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <Button
                onClick={() => handleToggleMarketplace(true)}
                style={{
                  flex: 1,
                  background: marketplaceEnabled ? '#000080' : undefined,
                  color: marketplaceEnabled ? '#ffffff' : undefined,
                }}
              >
                Enable
              </Button>
              <Button
                onClick={() => handleToggleMarketplace(false)}
                style={{
                  flex: 1,
                  background: !marketplaceEnabled ? '#000080' : undefined,
                  color: !marketplaceEnabled ? '#ffffff' : undefined,
                }}
              >
                Disable
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleLogin}
            style={{
              borderTop: '1px solid #808080',
              paddingTop: '8px',
              marginTop: '4px',
            }}
          >
            <p style={{ fontWeight: 'bold', margin: 0, marginBottom: '6px' }}>
              Admin login
            </p>
            <label
              style={{
                display: 'block',
                fontSize: '10px',
                marginBottom: '4px',
              }}
            >
              Password:
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', marginBottom: '4px' }}
            />
            {loginError && (
              <p
                style={{
                  color: '#cc0000',
                  fontSize: '10px',
                  margin: 0,
                  marginBottom: '4px',
                }}
              >
                {loginError}
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button type="submit">Login</Button>
            </div>
          </form>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
          <Button
            onClick={onClose}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            OK
          </Button>
        </div>
      </div>
    </Window>
  )
}


