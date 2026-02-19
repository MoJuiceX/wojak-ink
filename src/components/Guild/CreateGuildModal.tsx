/**
 * Create Guild Modal
 *
 * Modal for creating a new guild with banner customization.
 */

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useGuild } from '../../contexts/GuildContext';
import { GuildBannerDisplay } from './GuildCard';
import type { GuildBanner, BannerPattern } from '../../types/guild';
import {
  GUILD_CONSTANTS,
  BANNER_COLORS,
  BANNER_PATTERNS,
  GUILD_EMBLEMS,
} from '../../types/guild';
import './Guild.css';

interface CreateGuildModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateGuildModal({
  isOpen,
  onClose,
}: CreateGuildModalProps) {
  const { createGuild } = useGuild();

  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [banner, setBanner] = useState<GuildBanner>({
    backgroundColor: '#FF6B35',
    pattern: 'gradient',
    emblem: '🍊',
    accentColor: '#FFD93D',
  });

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'info' | 'banner'>('info');

  const resetForm = () => {
    setName('');
    setTag('');
    setDescription('');
    setIsPublic(true);
    setBanner({
      backgroundColor: '#FF6B35',
      pattern: 'gradient',
      emblem: '🍊',
      accentColor: '#FFD93D',
    });
    setStep('info');
    setError(null);
  };

  const validateInput = (): boolean => {
    if (name.length < GUILD_CONSTANTS.MIN_NAME_LENGTH) {
      setError(`Guild name must be at least ${GUILD_CONSTANTS.MIN_NAME_LENGTH} characters`);
      return false;
    }
    if (name.length > GUILD_CONSTANTS.MAX_NAME_LENGTH) {
      setError(`Guild name must be ${GUILD_CONSTANTS.MAX_NAME_LENGTH} characters or less`);
      return false;
    }
    if (tag.length < GUILD_CONSTANTS.MIN_TAG_LENGTH || tag.length > GUILD_CONSTANTS.MAX_TAG_LENGTH) {
      setError(`Tag must be ${GUILD_CONSTANTS.MIN_TAG_LENGTH}-${GUILD_CONSTANTS.MAX_TAG_LENGTH} characters`);
      return false;
    }
    if (!/^[A-Z0-9]+$/.test(tag.toUpperCase())) {
      setError('Tag must contain only letters and numbers');
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    setError(null);

    if (!validateInput()) return;

    setIsCreating(true);
    try {
      await createGuild({
        name,
        tag: tag.toUpperCase(),
        description,
        banner,
        isPublic,
      });
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create guild');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="create-guild-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h2>{step === 'info' ? 'Create Your Guild' : 'Customize Banner'}</h2>
            <button type="button" className="close-button" onClick={handleClose} aria-label="Close">✕</button>
          </div>

          {step === 'info' ? (
            <>
              {/* Preview */}
              <div className="guild-preview">
                <GuildBannerDisplay banner={banner} size="large" />
                <div className="preview-info">
                  <span className="preview-tag">[{tag || '???'}]</span>
                  <span className="preview-name">{name || 'Your Guild'}</span>
                </div>
              </div>

              {/* Form */}
              <div className="form-group">
                <label>Guild Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter guild name..."
                  maxLength={GUILD_CONSTANTS.MAX_NAME_LENGTH}
                  className="form-input"
                />
                <span className="char-count">{name.length}/{GUILD_CONSTANTS.MAX_NAME_LENGTH}</span>
              </div>

              <div className="form-group">
                <label>Guild Tag (2-4 characters)</label>
                <input
                  type="text"
                  value={tag}
                  onChange={(e) => setTag(e.target.value.toUpperCase())}
                  placeholder="e.g., OA, WJK"
                  maxLength={GUILD_CONSTANTS.MAX_TAG_LENGTH}
                  style={{ textTransform: 'uppercase' }}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell others about your guild..."
                  maxLength={GUILD_CONSTANTS.MAX_DESCRIPTION_LENGTH}
                  rows={3}
                  className="form-textarea"
                />
              </div>

              <div className="form-group toggle-group">
                <label>
                  <span>Public Guild</span>
                  <span className="toggle-description">Anyone can request to join</span>
                </label>
                <div
                  role="switch"
                  aria-checked={isPublic}
                  aria-label="Toggle public guild"
                  onClick={() => setIsPublic(!isPublic)}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    width: '52px',
                    height: '24px',
                    borderRadius: '9999px',
                    background: isPublic ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                    flexShrink: 0,
                    cursor: 'pointer',
                    transition: 'background 0.2s ease',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      fontSize: '9px',
                      fontWeight: 600,
                      lineHeight: 1,
                      color: isPublic ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
                      left: isPublic ? '6px' : undefined,
                      right: isPublic ? undefined : '6px',
                      userSelect: 'none',
                      pointerEvents: 'none',
                    }}
                    aria-hidden="true"
                  >
                    {isPublic ? 'ON' : 'OFF'}
                  </span>
                  <div
                    style={{
                      position: 'absolute',
                      width: '18px',
                      height: '18px',
                      top: '3px',
                      borderRadius: '9999px',
                      background: 'white',
                      left: isPublic ? '31px' : '3px',
                      transition: 'left 0.2s ease',
                    }}
                  />
                </div>
              </div>

              {error && <p className="error-message">{error}</p>}

              <div className="modal-actions">
                <button className="modal-btn outline" onClick={() => setStep('banner')}>
                  Customize Banner
                </button>
                <button className="modal-btn primary" onClick={handleCreate} disabled={isCreating || !name || !tag}>
                  {isCreating ? <Loader2 className="animate-spin" size={16} /> : 'Create Guild'}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Banner Customizer */}
              <div className="banner-preview-large">
                <GuildBannerDisplay banner={banner} size="large" />
              </div>

              <div className="banner-section">
                <label>Emblem</label>
                <div className="emblem-grid">
                  {GUILD_EMBLEMS.map((emblem) => (
                    <button
                      key={emblem}
                      className={`emblem-option ${banner.emblem === emblem ? 'selected' : ''}`}
                      onClick={() => setBanner({ ...banner, emblem })}
                      type="button"
                    >
                      {emblem}
                    </button>
                  ))}
                </div>
              </div>

              <div className="banner-section">
                <label>Background Color</label>
                <div className="color-grid">
                  {BANNER_COLORS.map((color) => (
                    <button
                      key={`bg-${color}`}
                      className={`color-option ${banner.backgroundColor === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setBanner({ ...banner, backgroundColor: color })}
                      type="button"
                    />
                  ))}
                </div>
              </div>

              <div className="banner-section">
                <label>Accent Color</label>
                <div className="color-grid">
                  {BANNER_COLORS.map((color) => (
                    <button
                      key={`accent-${color}`}
                      className={`color-option ${banner.accentColor === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setBanner({ ...banner, accentColor: color })}
                      type="button"
                    />
                  ))}
                </div>
              </div>

              <div className="banner-section">
                <label>Pattern</label>
                <div className="pattern-grid">
                  {BANNER_PATTERNS.map((pattern) => (
                    <button
                      key={pattern}
                      className={`pattern-option ${banner.pattern === pattern ? 'selected' : ''}`}
                      onClick={() => setBanner({ ...banner, pattern: pattern as BannerPattern })}
                      type="button"
                    >
                      {pattern}
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button className="modal-btn outline" onClick={() => setStep('info')}>
                  Back
                </button>
                <button className="modal-btn primary" onClick={() => setStep('info')}>
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CreateGuildModal;
