/**
 * Display Name Editor — edit your Fight Club display name
 */

import { useState, useEffect, useCallback } from 'react';
import { User, RefreshCw, Check, X } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useOptionalGame } from '@/contexts/GameContext';
import { settingsSectionVariants } from '@/config/settingsAnimations';
import { validateDIDName } from '@/lib/nameGenerator';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { API_ENDPOINTS } from '@/services/constants';

const SOURCE_LABELS: Record<string, string> = {
  custom: 'Custom',
  chain: 'From your DID profile',
  random: 'Auto-generated',
};

export function DisplayNameEditor() {
  const prefersReducedMotion = useReducedMotion();
  const game = useOptionalGame();
  const { authenticatedFetch } = useAuthenticatedFetch();
  const player = game?.player;
  const isRegistered = game?.isRegistered ?? false;
  const did = player?.did;

  const [displayName, setDisplayName] = useState('');
  const [nameSource, setNameSource] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch current display name
  const fetchDisplayName = useCallback(async () => {
    if (!did) return;
    try {
      const res = await fetch(`${API_ENDPOINTS.profileDisplayName}?did=${encodeURIComponent(did)}`);
      if (res.ok) {
        const data = await res.json();
        setDisplayName(data.displayName || '');
        setNameSource(data.source);
        setInputValue(data.displayName || '');
      }
    } catch (err) {
      console.error('[DisplayNameEditor] Fetch error:', err);
    }
  }, [did]);

  useEffect(() => {
    fetchDisplayName();
  }, [fetchDisplayName]);

  // Handle save
  const handleSave = async () => {
    const validation = validateDIDName(inputValue);
    if (!validation.valid) {
      setError(validation.error || 'Invalid name');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await authenticatedFetch(API_ENDPOINTS.profileDisplayName, {
        method: 'PUT',
        body: JSON.stringify({
          did,
          name: inputValue.trim(),
          source: 'custom',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDisplayName(data.displayName);
        setNameSource('custom');
        setIsEditing(false);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save name');
      }
    } catch (err) {
      console.error('[DisplayNameEditor] Save error:', err);
      setError('Failed to save name');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle randomize
  const handleRandomize = async () => {
    setIsRandomizing(true);
    setError(null);
    try {
      const res = await fetch('/api/profile/random-name');
      if (res.ok) {
        const data = await res.json();
        setInputValue(data.name);
        setIsEditing(true);
      }
    } catch (err) {
      console.error('[DisplayNameEditor] Randomize error:', err);
    } finally {
      setIsRandomizing(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setInputValue(displayName);
    setIsEditing(false);
    setError(null);
  };

  if (!isRegistered || !did) {
    return null;
  }

  return (
    <motion.section
      variants={prefersReducedMotion ? undefined : settingsSectionVariants}
      initial="initial"
      animate="animate"
      className="space-y-4"
      aria-labelledby="display-name-heading"
    >
      <div className="flex items-center gap-2">
        <User size={20} className="text-accent" />
        <h2
          id="display-name-heading"
          className="text-lg font-bold text-primary"
        >
          Display Name
        </h2>
      </div>

      <div
        className="p-4 rounded-xl"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="flex flex-col gap-3">
          {/* Current name display or input */}
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input flex-1"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter display name..."
                  maxLength={20}
                  disabled={isSaving}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={isSaving || !inputValue.trim()}
                  style={{ minWidth: 70 }}
                >
                  {isSaving ? '...' : <><Check size={16} /> Save</>}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  <X size={16} />
                </button>
              </div>
              {error && (
                <p className="text-sm text-error">{error}</p>
              )}
              <p className="text-xs text-muted">
                2-20 characters, letters, numbers, and spaces only
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <p className="font-medium" style={{ fontSize: 15 }}>
                  {displayName || 'Not set'}
                  {success && <span className="text-success ml-2">Saved!</span>}
                </p>
                {nameSource && (
                  <p className="text-xs text-muted">
                    {SOURCE_LABELS[nameSource] || nameSource}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditing(true)}
                  style={{ fontSize: 13 }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleRandomize}
                  disabled={isRandomizing}
                  title="Generate random name"
                >
                  <RefreshCw size={16} className={isRandomizing ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
