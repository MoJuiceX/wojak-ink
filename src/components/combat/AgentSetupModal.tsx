/**
 * AgentSetupModal — create a new AI agent tied to the user's DID.
 * Shows one-time API key on success (can't be shown again).
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, AlertTriangle, Bot, Zap } from 'lucide-react';
import { useAgent } from '@/contexts/AgentContext';

interface AgentSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AgentSetupModal({ isOpen, onClose }: AgentSetupModalProps) {
  const { createAgent, oneTimeApiKey, webhookSecret, clearOneTimeKey, isLoading } = useAgent();
  const [agentName, setAgentName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [nameError, setNameError] = useState('');
  const [keyCopied, setKeyCopied] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);

  const validateName = (name: string): boolean => {
    if (name.length < 3) {
      setNameError('Name must be at least 3 characters');
      return false;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      setNameError('Only letters, numbers, dashes, underscores');
      return false;
    }
    setNameError('');
    return true;
  };

  const handleCreate = useCallback(async () => {
    if (!validateName(agentName)) return;
    await createAgent(agentName, webhookUrl || undefined);
  }, [agentName, webhookUrl, createAgent]);

  const handleCopyKey = useCallback(async () => {
    if (!oneTimeApiKey) return;
    try {
      await navigator.clipboard.writeText(oneTimeApiKey);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  }, [oneTimeApiKey]);

  const handleCopySecret = useCallback(async () => {
    if (!webhookSecret) return;
    try {
      await navigator.clipboard.writeText(webhookSecret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  }, [webhookSecret]);

  const handleClose = useCallback(() => {
    clearOneTimeKey();
    setAgentName('');
    setWebhookUrl('');
    setNameError('');
    onClose();
  }, [clearOneTimeKey, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="agent-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="agent-modal"
            initial={{ scale: 0.92, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="agent-modal-header">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl"
                  style={{ background: 'rgba(255, 107, 0, 0.12)' }}>
                  <Bot size={18} style={{ color: 'var(--color-primary)' }} />
                </div>
                <h2>{oneTimeApiKey ? 'Agent Created' : 'Create AI Agent'}</h2>
              </div>
              <button type="button" className="agent-modal-close" onClick={handleClose}>
                <X size={16} />
              </button>
            </div>

            <div className="agent-modal-body">
              {!oneTimeApiKey ? (
                <>
                  {/* Agent Name */}
                  <div className="agent-field">
                    <label htmlFor="agent-name">Agent Name</label>
                    <input
                      id="agent-name"
                      className="input"
                      type="text"
                      placeholder="e.g. WojakSlayer-9000"
                      value={agentName}
                      onChange={(e) => {
                        setAgentName(e.target.value);
                        if (nameError) validateName(e.target.value);
                      }}
                      maxLength={50}
                      autoFocus
                    />
                    {nameError && (
                      <span className="agent-field-hint" style={{ color: 'var(--color-error)' }}>
                        {nameError}
                      </span>
                    )}
                    <span className="agent-field-hint">
                      3-50 characters. Letters, numbers, dashes, underscores.
                    </span>
                  </div>

                  {/* Webhook URL (optional) */}
                  <div className="agent-field">
                    <label htmlFor="webhook-url">Webhook URL <span className="text-muted">(optional)</span></label>
                    <input
                      id="webhook-url"
                      className="input"
                      type="url"
                      placeholder="https://your-server.com/webhook"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                    />
                    <span className="agent-field-hint">
                      Receive battle events (start, turn, end) via HTTP POST. Must be HTTPS. You can add this later.
                    </span>
                  </div>

                  {/* What you get */}
                  <div className="card-static p-3 flex flex-col gap-2">
                    <span className="text-xs text-secondary font-semibold uppercase tracking-wider">What you get</span>
                    <div className="flex items-center gap-2 text-sm">
                      <Zap size={14} style={{ color: 'var(--color-cyan)' }} />
                      <span className="text-secondary">API key to control your fighters programmatically</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Zap size={14} style={{ color: 'var(--color-cyan)' }} />
                      <span className="text-secondary">Webhook notifications for battle events</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Zap size={14} style={{ color: 'var(--color-cyan)' }} />
                      <span className="text-secondary">14-day trial: 1 battle per hour</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Success — API Key Reveal */}
                  <div className="api-key-card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-secondary font-semibold uppercase tracking-wider">
                        Your API Key
                      </span>
                      <motion.button
                        type="button"
                        className="btn btn-ghost min-h-11 min-w-11"
                        style={{ padding: '8px 12px', fontSize: '0.8125rem' }}
                        onClick={handleCopyKey}
                        whileTap={{ scale: 0.95 }}
                      >
                        {keyCopied ? <Check size={14} /> : <Copy size={14} />}
                        <span className="ml-1">{keyCopied ? 'Copied!' : 'Copy'}</span>
                      </motion.button>
                    </div>
                    <div className="api-key-value">{oneTimeApiKey}</div>
                    <div className="api-key-warning">
                      <AlertTriangle size={14} />
                      Save this key now. It will never be shown again.
                    </div>
                  </div>

                  {/* Webhook Secret */}
                  {webhookSecret && (
                    <div className="card-static p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-secondary font-semibold uppercase tracking-wider">
                          Webhook Secret
                        </span>
                        <motion.button
                          type="button"
                          className="btn btn-ghost min-h-11 min-w-11"
                          style={{ padding: '8px 12px', fontSize: '0.8125rem' }}
                          onClick={handleCopySecret}
                          whileTap={{ scale: 0.95 }}
                        >
                          {secretCopied ? <Check size={14} /> : <Copy size={14} />}
                          <span className="ml-1">{secretCopied ? 'Copied!' : 'Copy'}</span>
                        </motion.button>
                      </div>
                      <code className="text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-cyan)', wordBreak: 'break-all' }}>
                        {webhookSecret}
                      </code>
                    </div>
                  )}

                  {/* Quick start */}
                  <div className="card-static p-3 flex flex-col gap-2">
                    <span className="text-xs text-secondary font-semibold uppercase tracking-wider">Quick Start</span>
                    <p className="text-xs text-secondary">
                      Use this key in the <code style={{ color: 'var(--color-primary)' }}>Authorization: Bearer</code> header
                      when calling the agent API endpoints. Select "Agent" mode when queuing for battle.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="agent-modal-footer">
              {!oneTimeApiKey ? (
                <>
                  <button type="button" className="btn btn-secondary flex-1" onClick={handleClose}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary flex-1"
                    onClick={handleCreate}
                    disabled={isLoading || agentName.length < 3}
                  >
                    {isLoading ? 'Creating...' : 'Create Agent'}
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn-primary flex-1" onClick={handleClose}>
                  I've Saved My Key
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
