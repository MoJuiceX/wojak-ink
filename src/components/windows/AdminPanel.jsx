import Window from './Window'
import { useState } from 'react'
import { useMarketplace } from '../../contexts/MarketplaceContext'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Checkbox from '../ui/Checkbox'

export default function AdminPanel() {
  const {
    isAdmin,
    loginAsAdmin,
    logoutAdmin,
    nfts,
    offerFiles,
    setOfferFile,
    removeOfferFile,
  } = useMarketplace()

  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [selectedNFT, setSelectedNFT] = useState(null)
  const [offerFileInput, setOfferFileInput] = useState('')
  const passwordInputId = 'admin-password-input'
  const passwordErrorId = 'admin-password-error'

  const handleLogin = () => {
    setLoginError('')
    if (loginAsAdmin(password)) {
      setPassword('')
    } else {
      setLoginError('Incorrect password')
    }
  }

  const handleSelectNFT = (nft) => {
    setSelectedNFT(nft)
    setOfferFileInput(offerFiles[nft.id] || '')
  }

  const handleSaveOfferFile = () => {
    if (selectedNFT && offerFileInput.trim()) {
      setOfferFile(selectedNFT.id, offerFileInput.trim())
      alert(`Offer file saved for ${selectedNFT.name}`)
    }
  }

  const handleRemoveOfferFile = () => {
    if (selectedNFT) {
      if (confirm(`Remove offer file for ${selectedNFT.name}?`)) {
        removeOfferFile(selectedNFT.id)
        setOfferFileInput('')
        alert('Offer file removed')
      }
    }
  }

  if (!isAdmin) {
    return (
      <Window
        title="ADMIN PANEL - /admin-enable"
        style={{ width: '400px', maxWidth: 'calc(100vw - 40px)', left: '20px', top: '20px' }}
      >
        <div style={{ padding: '8px' }}>
          <p style={{ marginBottom: '8px', fontSize: '11px', fontWeight: 'bold' }}>
            Admin Access Required
          </p>
          <p style={{ marginBottom: '12px', fontSize: '10px', color: 'var(--text-2)' }}>
            This panel is only accessible at <code style={{ background: 'var(--surface-3)', padding: '2px 4px', color: 'var(--text-1)' }}>/admin-enable</code>
          </p>
          <p style={{ marginBottom: '8px', fontSize: '11px' }}>Enter admin password:</p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Input
                id={passwordInputId}
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (loginError) setLoginError('') // Clear error when user types
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Password"
                invalid={!!loginError}
                errorMessageId={passwordErrorId}
                required={true}
                aria-label="Admin password"
                style={{ width: '100%' }}
              />
              {loginError && (
                <div
                  id={passwordErrorId}
                  role="alert"
                  aria-live="polite"
                  style={{ 
                    color: 'var(--state-error)', 
                    fontSize: '11px', 
                    marginTop: '4px' 
                  }}
                >
                  {loginError}
                </div>
              )}
            </div>
            <Button onClick={handleLogin}>Login</Button>
          </div>
        </div>
      </Window>
    )
  }

  return (
    <Window
      title="ADMIN PANEL"
      style={{ width: '600px', maxWidth: 'calc(100vw - 40px)', left: '20px', top: '20px' }}
    >
      <div style={{ padding: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '16px' }}>
          <Button onClick={logoutAdmin} style={{ fontSize: '10px' }}>
            Logout
          </Button>
        </div>

        <div style={{ marginBottom: '16px', padding: '8px', background: 'var(--surface-3)', border: '1px inset var(--border-dark)' }}>
          <p style={{ fontSize: '10px', color: 'var(--text-2)' }}>
            Total NFTs: {nfts.length} | NFTs with offers: {Object.keys(offerFiles).length} | 
            Coverage: {Math.round((Object.keys(offerFiles).length / nfts.length) * 100)}%
          </p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <p style={{ fontSize: '11px', fontWeight: 'bold' }}>
              Manage Offer Files ({Object.keys(offerFiles).length} saved)
            </p>
            <select
              value=""
              onChange={(e) => {
                const group = e.target.value
                if (group) {
                  const groupNFTs = nfts.filter((n) => n.tokenGroup === group)
                  if (groupNFTs.length > 0) {
                    handleSelectNFT(groupNFTs[0])
                  }
                }
                e.target.value = ''
              }}
              style={{
                padding: '2px 4px',
                fontSize: '10px',
                border: '1px inset #c0c0c0',
              }}
            >
              <option value="">Filter by group...</option>
              {['HOA', 'PP', 'LOVE', 'HONK', 'CASTER', 'CHIA'].map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
            {nfts.map((nft) => (
              <div
                key={nft.id}
                onClick={() => handleSelectNFT(nft)}
                style={{
                  padding: '4px 8px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  border: selectedNFT?.id === nft.id ? '2px solid #000080' : '1px solid #c0c0c0',
                  background: selectedNFT?.id === nft.id ? '#d4d0c8' : offerFiles[nft.id] ? '#e8f5e9' : '#ffffff',
                }}
              >
                {nft.name} {offerFiles[nft.id] ? '✓' : ''}
              </div>
            ))}
          </div>
        </div>

        {selectedNFT && (
          <div style={{ padding: '8px', background: 'var(--surface-3)', border: '1px inset var(--border-dark)' }}>
            <p style={{ fontSize: '11px', marginBottom: '8px', fontWeight: 'bold' }}>
              {selectedNFT.name}
            </p>
            <textarea
              value={offerFileInput}
              onChange={(e) => setOfferFileInput(e.target.value)}
              placeholder="Paste offer file here..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '4px',
                fontSize: '10px',
                fontFamily: 'monospace',
                border: '1px inset #c0c0c0',
                background: '#ffffff',
                resize: 'vertical',
                marginBottom: '8px',
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button onClick={handleSaveOfferFile} disabled={!offerFileInput.trim()}>
                Save Offer File
              </Button>
              {offerFiles[selectedNFT.id] && (
                <Button onClick={handleRemoveOfferFile}>Remove</Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Window>
  )
}

