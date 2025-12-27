import { useState } from 'react'
import Window from './Window'
import './PropertiesWindow.css'

export default function PropertiesWindow({ isOpen, onClose, icon }) {
  const [activeTab, setActiveTab] = useState('general')

  if (!isOpen || !icon) return null

  // Calculate approximate file size from base64
  const getFileSize = (base64) => {
    if (!base64) return 'Unknown'
    const bytes = Math.round((base64.length * 3) / 4)
    if (bytes < 1024) return `${bytes} bytes`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown'
    try {
      return new Date(dateString).toLocaleString()
    } catch (e) {
      return 'Unknown'
    }
  }

  return (
    <Window
      id="properties-window"
      title={`${icon.filename || icon.name || 'Icon'} Properties`}
      onClose={onClose}
      style={{ width: 'clamp(280px, 92vw, 380px)', height: 'auto' }}
      className="properties-window"
    >
      <div className="properties-content">
        {/* Tabs */}
        <div className="properties-tabs">
          <button
            className={`properties-tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
          <button
            className={`properties-tab ${activeTab === 'traits' ? 'active' : ''}`}
            onClick={() => setActiveTab('traits')}
            disabled={!icon.traits}
          >
            Traits
          </button>
        </div>

        {/* Tab Content */}
        <div className="properties-tab-content">
          {activeTab === 'general' && (
            <div className="properties-general">
              {/* Icon and Name */}
              <div className="properties-header">
                <div className="properties-icon-preview">
                  <img src={icon.imageDataUrl || icon.image} alt={icon.filename || icon.name} />
                </div>
                <div className="properties-name">{icon.filename || icon.name || 'Untitled'}</div>
              </div>

              <div className="properties-separator" />

              {/* File Info */}
              <div className="properties-info-grid">
                <span className="properties-label">Type:</span>
                <span className="properties-value">
                  {icon.type === 'cybertang' ? 'CyberTang Image' : 'Wojak Image'}
                </span>

                <span className="properties-label">Size:</span>
                <span className="properties-value">
                  {getFileSize(icon.imageDataUrl || icon.image)}
                </span>

                <span className="properties-label">Created:</span>
                <span className="properties-value">
                  {formatDate(icon.timestamp || icon.createdAt)}
                </span>

                {icon.id && (
                  <>
                    <span className="properties-label">ID:</span>
                    <span className="properties-value">{icon.id.slice(-12)}</span>
                  </>
                )}
              </div>

              <div className="properties-separator" />

              {/* Attributes */}
              <div className="properties-attributes">
                <span className="properties-label">Attributes:</span>
                <label>
                  <input type="checkbox" checked disabled /> Saved to Desktop
                </label>
              </div>
            </div>
          )}

          {activeTab === 'traits' && icon.traits && (
            <div className="properties-traits">
              <div className="properties-traits-preview">
                <img src={icon.imageDataUrl || icon.image} alt={icon.filename || icon.name} />
              </div>

              <div className="properties-traits-list">
                {Object.entries(icon.traits).map(([key, value]) => {
                  if (!value || value.toLowerCase().includes('none')) return null
                  const traitName = value
                    .split('/')
                    .pop()
                    .replace(/\.[^.]+$/, '')
                    .replace(/[-_]/g, ' ')
                  return (
                    <div key={key} className="properties-trait-row">
                      <span className="properties-trait-label">{key}:</span>
                      <span className="properties-trait-value">{traitName}</span>
                    </div>
                  )
                })}
                {Object.entries(icon.traits).filter(([_, value]) => 
                  value && !value.toLowerCase().includes('none')
                ).length === 0 && (
                  <div className="properties-trait-row">
                    <span className="properties-trait-value">No traits available</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="properties-buttons">
          <button onClick={onClose}>OK</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </Window>
  )
}









