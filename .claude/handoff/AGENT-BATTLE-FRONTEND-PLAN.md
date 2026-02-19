# Agent Battle Frontend — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the premium frontend UI for the agent battle system — agent creation modal, API key display, battle mode selector (manual/auto/agent), 30-second countdown timer, agent dashboard, and all the glue that connects the new backend endpoints to the existing CombatArena page.

**Architecture:** Extend existing CombatArena page and QueuePanel with agent awareness. New components: AgentSetupModal, AgentDashboard, BattleModeSelector. Uses existing UI patterns (GiftModal for modals, WalletAddressCard for copy-to-clipboard, ToastContext for notifications). All visual styling in `theme.css`, layout in Tailwind.

**Tech Stack:** React, TypeScript, Framer Motion, existing theme.css CSS variables, ToastContext, Clerk auth (useAuthenticatedFetch)

**Backend dependency:** `.claude/handoff/AGENT-BATTLE-API-PLAN.md` (Packages A-F must be built first)

**Design doc:** `.claude/handoff/AGENT-BATTLE-API.md`

---

## Existing Files You MUST Read First

Before starting any task, read these files to understand the patterns:

- `src/pages/CombatArena.tsx` — the page you're extending (115 lines, has TODO on line 31)
- `src/components/combat/QueuePanel.tsx` — fighter selector + battle mode (141 lines). **You will modify this.**
- `src/components/combat/FighterCard.tsx` — fighter display card (93 lines)
- `src/components/combat/MoveButtons.tsx` — move selector with 30s timer (94 lines). Already has timer logic.
- `src/components/combat/BattleView.tsx` — live battle UI
- `src/components/combat/HPBar.tsx` — health bar component
- `src/components/combat/TurnLog.tsx` — battle event log
- `src/components/combat/BattleHistory.tsx` — recent battles list
- `src/components/combat/CombatLeaderboard.tsx` — ELO/level/wins leaderboard (98 lines)
- `src/components/Account/GiftModal.tsx` — modal pattern to copy (overlay + backdrop blur + form)
- `src/components/Avatar/NFTSelectionModal.tsx` — modal with Framer Motion animations
- `src/components/treasury/WalletAddressCard.tsx` — copy-to-clipboard pattern
- `src/components/ui/Toast.tsx` + `src/contexts/ToastContext.tsx` — toast notifications (already integrated)
- `src/styles/theme.css` — ALL visual styling goes here

---

## Package G: Agent Frontend Components

### Task 1: Add agent-related CSS to theme.css

**Files:**
- Modify: `src/styles/theme.css`

**Step 1: Add the agent CSS classes to theme.css**

Add these styles to the end of `src/styles/theme.css` (before the closing comment, or at the very end):

```css
/* ═══════════════════════════════════════════════════════════════════════════
   AGENT BATTLE SYSTEM — UI Components
   ═══════════════════════════════════════════════════════════════════════════ */

/* Agent Setup Modal */
.agent-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  z-index: var(--z-modal, 200);
  display: flex;
  align-items: center;
  justify-content: center;
}

.agent-modal {
  background: linear-gradient(145deg, var(--color-surface), var(--color-bg));
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  max-width: 480px;
  width: calc(100% - 32px);
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: var(--shadow-xl), 0 0 60px rgba(255, 107, 0, 0.08);
}

.agent-modal-header {
  padding: 24px 24px 16px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.agent-modal-header h2 {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.agent-modal-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.agent-modal-footer {
  padding: 16px 24px 24px;
  border-top: 1px solid var(--color-border);
  display: flex;
  gap: 12px;
}

.agent-modal-close {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.06);
  border: none;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: var(--transition-fast);
}

.agent-modal-close:hover {
  background: rgba(255, 255, 255, 0.12);
  color: var(--color-text);
}

/* Agent form fields */
.agent-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.agent-field label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.agent-field-hint {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* API Key Display — premium reveal card */
.api-key-card {
  background: linear-gradient(135deg, rgba(255, 107, 0, 0.08), rgba(0, 212, 255, 0.04));
  border: 1px solid rgba(255, 107, 0, 0.2);
  border-radius: var(--radius-lg);
  padding: 16px;
  position: relative;
  overflow: hidden;
}

.api-key-card::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at center, rgba(255, 107, 0, 0.04) 0%, transparent 70%);
  animation: apiKeyShimmer 4s ease-in-out infinite;
}

@keyframes apiKeyShimmer {
  0%, 100% { transform: translate(0, 0); opacity: 0.5; }
  50% { transform: translate(5%, 5%); opacity: 1; }
}

.api-key-value {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  color: var(--color-primary);
  word-break: break-all;
  line-height: 1.6;
  position: relative;
  z-index: 1;
}

.api-key-warning {
  font-size: 0.75rem;
  color: var(--color-warning);
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  position: relative;
  z-index: 1;
}

/* Battle Mode Selector — 3-option pills */
.battle-mode-selector {
  display: flex;
  gap: 4px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: var(--radius-lg);
  padding: 4px;
  border: 1px solid var(--color-border);
}

.battle-mode-option {
  flex: 1;
  padding: 10px 8px;
  border-radius: var(--radius-md);
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition-fast);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  position: relative;
}

.battle-mode-option:hover {
  color: var(--color-text);
  background: rgba(255, 255, 255, 0.04);
}

.battle-mode-option.active {
  background: var(--color-primary);
  color: white;
  box-shadow: 0 2px 8px rgba(255, 107, 0, 0.3);
}

.battle-mode-option.disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.battle-mode-label {
  font-size: 0.8125rem;
  font-weight: 600;
}

.battle-mode-desc {
  font-size: 0.625rem;
  font-weight: 400;
  opacity: 0.8;
}

/* Agent Dashboard Card */
.agent-dashboard {
  border: 1px solid rgba(255, 107, 0, 0.15);
  border-radius: var(--radius-lg);
  background: linear-gradient(145deg, var(--color-surface), rgba(255, 107, 0, 0.02));
  overflow: hidden;
}

.agent-dashboard-header {
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-border);
}

.agent-dashboard-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.agent-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-success);
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
  animation: agentPulse 2s ease-in-out infinite;
}

@keyframes agentPulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(34, 197, 94, 0.5); }
  50% { opacity: 0.6; box-shadow: 0 0 4px rgba(34, 197, 94, 0.3); }
}

.agent-status-dot.inactive {
  background: var(--color-text-muted);
  box-shadow: none;
  animation: none;
}

.agent-dashboard-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: var(--color-border);
}

.agent-stat {
  padding: 12px;
  background: var(--color-surface);
  text-align: center;
}

.agent-stat-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text);
}

.agent-stat-label {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 2px;
}

.agent-dashboard-footer {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Tier badges */
.agent-tier {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.agent-tier-trial {
  background: rgba(0, 212, 255, 0.12);
  color: var(--color-cyan);
  border: 1px solid rgba(0, 212, 255, 0.2);
}

.agent-tier-free {
  background: rgba(255, 255, 255, 0.06);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.agent-tier-premium {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(255, 107, 0, 0.1));
  color: var(--color-gold);
  border: 1px solid rgba(251, 191, 36, 0.3);
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.1);
}

/* Rate limit indicator */
.rate-limit-bar {
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.rate-limit-fill {
  height: 100%;
  border-radius: 2px;
  background: var(--color-primary);
  transition: width 0.3s ease;
}

.rate-limit-fill.near-limit {
  background: var(--color-warning);
}

.rate-limit-fill.at-limit {
  background: var(--color-error);
}

/* Turn countdown — circular timer */
.turn-timer {
  width: 48px;
  height: 48px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.turn-timer-ring {
  position: absolute;
  inset: 0;
}

.turn-timer-ring circle {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
}

.turn-timer-ring .track {
  stroke: rgba(255, 255, 255, 0.08);
}

.turn-timer-ring .progress {
  stroke: var(--color-primary);
  transition: stroke-dashoffset 1s linear;
}

.turn-timer-ring .progress.warning {
  stroke: var(--color-warning);
}

.turn-timer-ring .progress.critical {
  stroke: var(--color-error);
  animation: timerPulse 0.5s ease-in-out infinite;
}

@keyframes timerPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.turn-timer-text {
  font-size: 0.875rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* Webhook status indicator */
.webhook-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
}

.webhook-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.webhook-dot.connected {
  background: var(--color-success);
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.4);
}

.webhook-dot.disconnected {
  background: var(--color-text-muted);
}

/* Agent action row in queue panel */
.agent-action-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(255, 107, 0, 0.04);
  border: 1px dashed rgba(255, 107, 0, 0.2);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition-fast);
}

.agent-action-row:hover {
  background: rgba(255, 107, 0, 0.08);
  border-color: rgba(255, 107, 0, 0.3);
}

/* Mobile responsive for agent modal */
@media (max-width: 480px) {
  .agent-modal {
    max-height: 92vh;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    margin-top: auto;
    align-self: flex-end;
  }

  .agent-dashboard-stats {
    grid-template-columns: repeat(3, 1fr);
  }

  .battle-mode-option {
    padding: 8px 4px;
  }

  .battle-mode-desc {
    display: none;
  }
}
```

**Step 2: Verify no CSS syntax errors**

Run: `npm run build 2>&1 | head -20`

**Step 3: Commit**

```bash
git add src/styles/theme.css
git commit -m "style: add agent battle system CSS — modal, dashboard, timer, tier badges"
```

---

### Task 2: Create AgentContext for state management

**Files:**
- Create: `src/contexts/AgentContext.tsx`

**Step 1: Create the context**

Create `src/contexts/AgentContext.tsx`:

```typescript
/**
 * AgentContext — manages agent state for the current user.
 * Provides: agent info, hasAgent, createAgent, rotateKey, rate limit status.
 */

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { useToast } from './ToastContext';

interface AgentInfo {
  agent_id: string;
  name: string;
  status: 'active' | 'retired';
  tier: 'trial' | 'free' | 'premium';
  webhook_url: string | null;
  created_at: string;
  fighters: any[];
  battle_stats: {
    total: number;
    wins: number;
    losses: number;
  };
}

interface AgentContextValue {
  agent: AgentInfo | null;
  hasAgent: boolean;
  isLoading: boolean;
  oneTimeApiKey: string | null;
  webhookSecret: string | null;
  clearOneTimeKey: () => void;
  createAgent: (name: string, webhookUrl?: string) => Promise<boolean>;
  rotateKey: () => Promise<string | null>;
  refreshAgent: () => Promise<void>;
}

const AgentContext = createContext<AgentContextValue | null>(null);

export function AgentProvider({ children, ownerDid }: { children: ReactNode; ownerDid: string | null }) {
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [oneTimeApiKey, setOneTimeApiKey] = useState<string | null>(null);
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);
  const { authenticatedFetch } = useAuthenticatedFetch();
  const { success, error: showError } = useToast();

  const refreshAgent = useCallback(async () => {
    if (!ownerDid) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/combat/agent-profile?did=${encodeURIComponent(ownerDid)}`);
      if (res.ok) {
        const data = await res.json();
        setAgent(data);
      } else {
        setAgent(null);
      }
    } catch (err) {
      console.error('[AgentContext] Failed to fetch agent:', err);
    } finally {
      setIsLoading(false);
    }
  }, [ownerDid]);

  // Load agent on mount / DID change
  useEffect(() => {
    if (ownerDid) refreshAgent();
    else setAgent(null);
  }, [ownerDid, refreshAgent]);

  const createAgent = useCallback(async (name: string, webhookUrl?: string): Promise<boolean> => {
    if (!ownerDid) return false;
    setIsLoading(true);
    try {
      const res = await authenticatedFetch('/api/combat/agent-register', {
        method: 'POST',
        body: JSON.stringify({
          ownerDid,
          name,
          webhook_url: webhookUrl || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        showError(data.error || 'Failed to create agent');
        return false;
      }

      const data = await res.json();
      setOneTimeApiKey(data.api_key);
      setWebhookSecret(data.webhook_secret);
      success('Agent created! Save your API key now.');
      await refreshAgent();
      return true;
    } catch (err) {
      showError('Network error creating agent');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [ownerDid, authenticatedFetch, success, showError, refreshAgent]);

  const rotateKey = useCallback(async (): Promise<string | null> => {
    if (!oneTimeApiKey && !agent) return null;
    setIsLoading(true);
    try {
      // Note: rotate-key requires the current key in Authorization header.
      // This can only be called if the user still has their key available.
      // For now, this is a placeholder — the actual rotate flow requires
      // the user to input their current key.
      const res = await authenticatedFetch('/api/combat/agent-rotate-key', {
        method: 'POST',
      });

      if (!res.ok) {
        showError('Failed to rotate key');
        return null;
      }

      const data = await res.json();
      setOneTimeApiKey(data.api_key);
      success('New API key generated. Save it now!');
      return data.api_key;
    } catch (err) {
      showError('Network error rotating key');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [agent, oneTimeApiKey, authenticatedFetch, success, showError]);

  const clearOneTimeKey = useCallback(() => {
    setOneTimeApiKey(null);
    setWebhookSecret(null);
  }, []);

  return (
    <AgentContext.Provider
      value={{
        agent,
        hasAgent: !!agent,
        isLoading,
        oneTimeApiKey,
        webhookSecret,
        clearOneTimeKey,
        createAgent,
        rotateKey,
        refreshAgent,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error('useAgent must be used within AgentProvider');
  return ctx;
}
```

**Step 2: Verify no TS errors**

Run: `npx tsc --noEmit --pretty 2>&1 | grep AgentContext || echo "No errors"`

**Step 3: Commit**

```bash
git add src/contexts/AgentContext.tsx
git commit -m "feat: create AgentContext for agent state management"
```

---

### Task 3: Create AgentSetupModal component

**Files:**
- Create: `src/components/combat/AgentSetupModal.tsx`

**Context:** This modal appears when user clicks "Create Agent." It has: agent name input, optional webhook URL input, create button. On success, it shows the one-time API key + webhook secret in a premium reveal card with copy-to-clipboard.

**Step 1: Create the component**

Create `src/components/combat/AgentSetupModal.tsx`:

```typescript
/**
 * AgentSetupModal — create a new AI agent tied to the user's DID.
 * Shows one-time API key on success (can't be shown again).
 *
 * Uses: GiftModal overlay pattern, WalletAddressCard copy pattern.
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
    const ok = await createAgent(agentName, webhookUrl || undefined);
    if (ok) {
      // Stay open to show the key
    }
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
              <button className="agent-modal-close" onClick={handleClose}>
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
                        className="btn btn-ghost"
                        style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        onClick={handleCopyKey}
                        whileTap={{ scale: 0.95 }}
                      >
                        {keyCopied ? <Check size={12} /> : <Copy size={12} />}
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
                          className="btn btn-ghost"
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          onClick={handleCopySecret}
                          whileTap={{ scale: 0.95 }}
                        >
                          {secretCopied ? <Check size={12} /> : <Copy size={12} />}
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
                  <button className="btn btn-secondary flex-1" onClick={handleClose}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary flex-1"
                    onClick={handleCreate}
                    disabled={isLoading || agentName.length < 3}
                  >
                    {isLoading ? 'Creating...' : 'Create Agent'}
                  </button>
                </>
              ) : (
                <button className="btn btn-primary flex-1" onClick={handleClose}>
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
```

**Step 2: Verify no TS errors**

Run: `npx tsc --noEmit --pretty 2>&1 | grep AgentSetup || echo "No errors"`

**Step 3: Commit**

```bash
git add src/components/combat/AgentSetupModal.tsx
git commit -m "feat: create AgentSetupModal — premium agent creation with API key reveal"
```

---

### Task 4: Create AgentDashboard component

**Files:**
- Create: `src/components/combat/AgentDashboard.tsx`

**Context:** Shows when user has an active agent. Displays: agent name, tier badge, status, battle stats (wins/losses/total), rate limit usage, webhook status. Small card that sits in the CombatArena page above the queue.

**Step 1: Create the component**

Create `src/components/combat/AgentDashboard.tsx`:

```typescript
/**
 * AgentDashboard — compact card showing agent status, stats, and tier.
 * Visible on CombatArena when user has an active agent.
 */

import { motion } from 'framer-motion';
import { Bot, Settings, RefreshCw } from 'lucide-react';
import { useAgent } from '@/contexts/AgentContext';

interface AgentDashboardProps {
  onSettings?: () => void;
}

export function AgentDashboard({ onSettings }: AgentDashboardProps) {
  const { agent, isLoading, refreshAgent } = useAgent();

  if (!agent) return null;

  const tierClass = `agent-tier agent-tier-${agent.tier}`;
  const winRate = agent.battle_stats.total > 0
    ? Math.round((agent.battle_stats.wins / agent.battle_stats.total) * 100)
    : 0;

  return (
    <motion.div
      className="agent-dashboard w-full"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header row */}
      <div className="agent-dashboard-header">
        <div className="agent-dashboard-status">
          <div className={`agent-status-dot ${agent.status === 'active' ? '' : 'inactive'}`} />
          <div className="flex items-center gap-2">
            <Bot size={16} style={{ color: 'var(--color-primary)' }} />
            <span className="font-semibold text-sm">{agent.name}</span>
          </div>
          <span className={tierClass}>{agent.tier}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="btn btn-ghost"
            style={{ padding: 6 }}
            onClick={() => refreshAgent()}
            disabled={isLoading}
            aria-label="Refresh agent"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
          {onSettings && (
            <button
              className="btn btn-ghost"
              style={{ padding: 6 }}
              onClick={onSettings}
              aria-label="Agent settings"
            >
              <Settings size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="agent-dashboard-stats">
        <div className="agent-stat">
          <div className="agent-stat-value">{agent.battle_stats.total}</div>
          <div className="agent-stat-label">Battles</div>
        </div>
        <div className="agent-stat">
          <div className="agent-stat-value" style={{ color: 'var(--color-success)' }}>
            {agent.battle_stats.wins}
          </div>
          <div className="agent-stat-label">Wins</div>
        </div>
        <div className="agent-stat">
          <div className="agent-stat-value">
            {winRate}%
          </div>
          <div className="agent-stat-label">Win Rate</div>
        </div>
      </div>

      {/* Footer */}
      <div className="agent-dashboard-footer">
        <span className="text-xs text-muted">
          {agent.fighters.length} fighter{agent.fighters.length !== 1 ? 's' : ''} registered
        </span>
        <span className="webhook-status">
          <span className={`webhook-dot ${agent.webhook_url ? 'connected' : 'disconnected'}`} />
          <span className="text-muted">
            {agent.webhook_url ? 'Webhook active' : 'No webhook'}
          </span>
        </span>
      </div>
    </motion.div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/combat/AgentDashboard.tsx
git commit -m "feat: create AgentDashboard — compact agent status card with stats and tier"
```

---

### Task 5: Create BattleModeSelector component

**Files:**
- Create: `src/components/combat/BattleModeSelector.tsx`

**Context:** Replaces the 2-button mode selector in QueuePanel with a premium 3-option pill selector: Manual / Auto / Agent. The "Agent" option is only enabled when user has an active agent. Shows a subtle CTA to create agent when they don't have one.

**Step 1: Create the component**

Create `src/components/combat/BattleModeSelector.tsx`:

```typescript
/**
 * BattleModeSelector — 3-option pill: Manual | Auto | Agent
 * The "Agent" pill is disabled with a "Create Agent" hint when no agent exists.
 */

import { motion } from 'framer-motion';
import { User, Cpu, Bot } from 'lucide-react';

type BattleMode = 'manual' | 'auto' | 'agent';

interface BattleModeSelectorProps {
  value: BattleMode;
  onChange: (mode: BattleMode) => void;
  hasAgent: boolean;
  disabled?: boolean;
  onCreateAgent?: () => void;
}

const MODES: { id: BattleMode; label: string; desc: string; icon: typeof User }[] = [
  { id: 'manual', label: 'Manual', desc: 'Pick moves', icon: User },
  { id: 'auto', label: 'Auto', desc: 'AI plays', icon: Cpu },
  { id: 'agent', label: 'Agent', desc: 'Your AI', icon: Bot },
];

export function BattleModeSelector({ value, onChange, hasAgent, disabled, onCreateAgent }: BattleModeSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-secondary uppercase tracking-wider">Battle Mode</label>
      <div className="battle-mode-selector">
        {MODES.map((mode) => {
          const isAgent = mode.id === 'agent';
          const isDisabled = disabled || (isAgent && !hasAgent);
          const isActive = value === mode.id;
          const Icon = mode.icon;

          return (
            <motion.button
              key={mode.id}
              className={`battle-mode-option ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
              onClick={() => {
                if (isAgent && !hasAgent && onCreateAgent) {
                  onCreateAgent();
                  return;
                }
                if (!isDisabled) onChange(mode.id);
              }}
              whileTap={!isDisabled ? { scale: 0.97 } : undefined}
              layout
            >
              <Icon size={16} />
              <span className="battle-mode-label">{mode.label}</span>
              <span className="battle-mode-desc">
                {isAgent && !hasAgent ? 'Set up' : mode.desc}
              </span>
            </motion.button>
          );
        })}
      </div>
      <p className="text-xs text-muted">
        {value === 'manual' && 'Pick your moves each turn. 30-second timer.'}
        {value === 'auto' && 'Built-in AI picks optimal moves. Sit back and watch.'}
        {value === 'agent' && hasAgent && 'Your external AI agent submits moves via API.'}
        {value === 'agent' && !hasAgent && 'Create an agent to control your fighters with your own AI.'}
      </p>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/combat/BattleModeSelector.tsx
git commit -m "feat: create BattleModeSelector — 3-mode pill (Manual/Auto/Agent)"
```

---

### Task 6: Create TurnTimer component (circular countdown)

**Files:**
- Create: `src/components/combat/TurnTimer.tsx`

**Context:** A circular SVG countdown timer. Shows seconds remaining. Changes color at 10s (warning) and 5s (critical with pulse). Used in the battle view for all modes.

**Step 1: Create the component**

Create `src/components/combat/TurnTimer.tsx`:

```typescript
/**
 * TurnTimer — circular SVG countdown.
 * Changes color: default (orange) → warning (yellow at 10s) → critical (red at 5s, pulsing).
 */

import { useEffect, useState, useCallback } from 'react';

interface TurnTimerProps {
  totalSeconds: number;
  onTimeout?: () => void;
  isPaused?: boolean;
}

const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function TurnTimer({ totalSeconds, onTimeout, isPaused = false }: TurnTimerProps) {
  const [timeLeft, setTimeLeft] = useState(totalSeconds);

  useEffect(() => {
    setTimeLeft(totalSeconds);
  }, [totalSeconds]);

  useEffect(() => {
    if (isPaused || timeLeft <= 0) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          onTimeout?.();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isPaused, onTimeout, timeLeft]);

  const progress = timeLeft / totalSeconds;
  const dashoffset = CIRCUMFERENCE * (1 - progress);
  const colorClass = timeLeft <= 5 ? 'critical' : timeLeft <= 10 ? 'warning' : '';

  return (
    <div className="turn-timer">
      <svg className="turn-timer-ring" viewBox="0 0 48 48">
        <circle className="track" cx="24" cy="24" r={RADIUS} />
        <circle
          className={`progress ${colorClass}`}
          cx="24"
          cy="24"
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashoffset}
          transform="rotate(-90 24 24)"
        />
      </svg>
      <span className="turn-timer-text" style={{
        color: timeLeft <= 5 ? 'var(--color-error)' : timeLeft <= 10 ? 'var(--color-warning)' : 'var(--color-text)',
      }}>
        {timeLeft}
      </span>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/combat/TurnTimer.tsx
git commit -m "feat: create TurnTimer — circular SVG countdown with color transitions"
```

---

### Task 7: Update QueuePanel with agent mode support

**Files:**
- Modify: `src/components/combat/QueuePanel.tsx`

**Context:** Replace the existing 2-button battle mode with the new BattleModeSelector. Add "Create Agent" action row when no agent. Pass `battleMode: 'agent'` through when agent mode is selected.

**Step 1: Read the current QueuePanel**

Run: Read `src/components/combat/QueuePanel.tsx` (already read above — 141 lines)

**Step 2: Replace the full file**

Replace `src/components/combat/QueuePanel.tsx` with:

```typescript
/**
 * QueuePanel — select an NFT fighter, choose battle mode, and enter the combat queue.
 * Now supports 3 modes: manual, auto, agent.
 */

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Bot, Plus } from 'lucide-react';
import { BattleModeSelector } from './BattleModeSelector';
import { useAgent } from '@/contexts/AgentContext';
import type { CombatType } from '@/lib/combat/types';

interface FighterSummary {
  nft_id: string;
  edition: number;
  type: CombatType;
  nature: string;
  ability: string;
  level: number;
  elo: number;
  imageUrl?: string;
}

interface QueuePanelProps {
  fighters: FighterSummary[];
  onQueue: (nftId: string, battleMode: 'manual' | 'auto' | 'agent') => Promise<void>;
  onLeaveQueue: (nftId: string) => Promise<void>;
  queueStatus: { status: string; position?: number; battleId?: number; opponent?: { nftId: string; elo: number } } | null;
  isLoading: boolean;
  onCreateAgent?: () => void;
}

export function QueuePanel({ fighters, onQueue, onLeaveQueue, queueStatus, isLoading, onCreateAgent }: QueuePanelProps) {
  const [selectedFighter, setSelectedFighter] = useState<string>(fighters[0]?.nft_id ?? '');
  const [battleMode, setBattleMode] = useState<'manual' | 'auto' | 'agent'>('auto');
  const { hasAgent } = useAgent();

  const handleQueue = useCallback(async () => {
    if (!selectedFighter) return;
    await onQueue(selectedFighter, battleMode);
  }, [selectedFighter, battleMode, onQueue]);

  const handleLeave = useCallback(async () => {
    if (!selectedFighter) return;
    await onLeaveQueue(selectedFighter);
  }, [selectedFighter, onLeaveQueue]);

  const isQueued = queueStatus?.status === 'queued';
  const isMatched = queueStatus?.status === 'matched';

  if (fighters.length === 0) {
    return (
      <div className="card-static p-6 text-center">
        <p className="text-secondary text-sm">
          No combat-ready fighters found. Mint a new Wojak with combat moves to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-4 flex flex-col gap-4">
      <h3 className="font-semibold">Enter the Arena</h3>

      {/* Fighter selector */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-secondary uppercase tracking-wider">Select Fighter</label>
        <select
          className="input"
          value={selectedFighter}
          onChange={(e) => setSelectedFighter(e.target.value)}
          disabled={isQueued || isLoading}
        >
          {fighters.map((f) => (
            <option key={f.nft_id} value={f.nft_id}>
              #{f.edition} — {f.type} Lv.{f.level} (ELO {f.elo})
            </option>
          ))}
        </select>
      </div>

      {/* Battle mode — 3-option pills */}
      <BattleModeSelector
        value={battleMode}
        onChange={setBattleMode}
        hasAgent={hasAgent}
        disabled={isQueued || isLoading}
        onCreateAgent={onCreateAgent}
      />

      {/* Queue action */}
      {!isQueued && !isMatched && (
        <button
          className="btn btn-primary w-full"
          onClick={handleQueue}
          disabled={isLoading || !selectedFighter || (battleMode === 'agent' && !hasAgent)}
        >
          {isLoading ? 'Joining...' : 'Join Queue'}
        </button>
      )}

      {/* Queue status */}
      {isQueued && (
        <div className="flex flex-col gap-2">
          <div className="combat-preview-badge justify-center">
            <span className="text-secondary">
              In queue — position {queueStatus?.position ?? '?'}
            </span>
          </div>
          <button
            className="btn btn-secondary w-full"
            onClick={handleLeave}
            disabled={isLoading}
          >
            Leave Queue
          </button>
        </div>
      )}

      {/* Matched */}
      {isMatched && queueStatus?.battleId && (
        <div className="combat-preview-badge justify-center">
          <span className="text-accent font-semibold">
            Match found! Battle #{queueStatus.battleId}
          </span>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/combat/QueuePanel.tsx
git commit -m "feat: update QueuePanel with 3-mode BattleModeSelector (manual/auto/agent)"
```

---

### Task 8: Update CombatArena page to integrate agent system

**Files:**
- Modify: `src/pages/CombatArena.tsx`

**Context:** Wire in AgentProvider, show AgentDashboard when agent exists, show "Create Agent" CTA when it doesn't, open AgentSetupModal. Fix the existing TODO (line 31) by fetching fighters from the DID context.

**Step 1: Replace the full file**

Replace `src/pages/CombatArena.tsx` with:

```typescript
/**
 * Combat Arena Page — /games/combat
 *
 * Main entry point for the combat system.
 * Shows agent dashboard (if agent exists), queue panel, active battle, and recent history.
 */

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Plus, Trophy, Swords } from 'lucide-react';
import { PageSEO } from '@/components/seo';
import { PageTransition } from '@/components/layout/PageTransition';
import { QueuePanel } from '@/components/combat/QueuePanel';
import { AgentDashboard } from '@/components/combat/AgentDashboard';
import { AgentSetupModal } from '@/components/combat/AgentSetupModal';
import { BattleHistory } from '@/components/combat/BattleHistory';
import { AgentProvider, useAgent } from '@/contexts/AgentContext';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';

interface FighterSummary {
  nft_id: string;
  edition: number;
  type: string;
  nature: string;
  ability: string;
  level: number;
  elo: number;
}

function CombatArenaInner() {
  const [fighters, setFighters] = useState<FighterSummary[]>([]);
  const [queueStatus, setQueueStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeBattleId, setActiveBattleId] = useState<number | null>(null);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const { hasAgent } = useAgent();
  const { authenticatedFetch, isSignedIn } = useAuthenticatedFetch();

  // Load fighters owned by current user
  useEffect(() => {
    if (!isSignedIn) return;
    (async () => {
      try {
        const res = await authenticatedFetch('/api/combat/fighter?owned=true');
        if (res.ok) {
          const data = await res.json();
          setFighters(data.fighters ?? []);
        }
      } catch (err) {
        console.error('[CombatArena] Failed to load fighters:', err);
      }
    })();
  }, [isSignedIn, authenticatedFetch]);

  const handleQueue = useCallback(async (nftId: string, battleMode: 'manual' | 'auto' | 'agent') => {
    setIsLoading(true);
    try {
      const res = await authenticatedFetch('/api/combat/queue', {
        method: 'POST',
        body: JSON.stringify({ nftId, battleMode }),
      });
      const data = await res.json();
      setQueueStatus(data);
      if (data.battleId) {
        setActiveBattleId(data.battleId);
      }
    } catch (err) {
      console.error('[CombatArena] Queue error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedFetch]);

  const handleLeaveQueue = useCallback(async (nftId: string) => {
    setIsLoading(true);
    try {
      await authenticatedFetch(`/api/combat/queue?nftId=${nftId}`, { method: 'DELETE' });
      setQueueStatus(null);
    } catch (err) {
      console.error('[CombatArena] Leave queue error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedFetch]);

  return (
    <PageTransition>
      <PageSEO
        title="Combat Arena - Wojak Battles"
        description="Battle your Wojak NFTs in turn-based combat. 18 types, abilities, moves, ELO ranking."
        path="/games/combat"
        type="game"
      />
      <div className="flex flex-col items-center p-4 gap-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <Swords size={28} style={{ color: 'var(--color-primary)' }} />
            <h1 className="text-2xl font-bold">Combat Arena</h1>
          </div>
          <p className="text-secondary text-center text-sm">
            Send your Wojak into battle. Earn XP, climb the ELO ladder, and prove your fighter is the strongest.
          </p>
        </div>

        {/* Agent Dashboard (if agent exists) */}
        {hasAgent && (
          <AgentDashboard onSettings={() => setShowAgentModal(true)} />
        )}

        {/* Create Agent CTA (if no agent and signed in) */}
        {!hasAgent && isSignedIn && (
          <motion.button
            className="agent-action-row w-full"
            onClick={() => setShowAgentModal(true)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg"
              style={{ background: 'rgba(255, 107, 0, 0.1)' }}>
              <Bot size={16} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-sm font-medium">Create AI Agent</span>
              <span className="text-xs text-muted">Control your fighters with your own AI via API</span>
            </div>
            <Plus size={16} style={{ color: 'var(--color-text-muted)' }} />
          </motion.button>
        )}

        {/* Queue Panel */}
        <div className="w-full">
          <QueuePanel
            fighters={fighters as any}
            onQueue={handleQueue}
            onLeaveQueue={handleLeaveQueue}
            queueStatus={queueStatus}
            isLoading={isLoading}
            onCreateAgent={() => setShowAgentModal(true)}
          />
        </div>

        {/* Active battle link */}
        {activeBattleId && (
          <motion.div
            className="card p-4 w-full text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <p className="text-secondary text-sm mb-2">Active Battle</p>
            <a
              href={`/games/combat/battle/${activeBattleId}`}
              className="btn btn-primary"
            >
              <Swords size={16} />
              Go to Battle #{activeBattleId}
            </a>
          </motion.div>
        )}

        {/* Battle History */}
        <div className="w-full">
          <BattleHistory />
        </div>
      </div>

      {/* Agent Setup Modal */}
      <AgentSetupModal
        isOpen={showAgentModal}
        onClose={() => setShowAgentModal(false)}
      />
    </PageTransition>
  );
}

// Wrap with AgentProvider — needs ownerDid from auth
export default function CombatArena() {
  // TODO: Get ownerDid from the wallet/DID context once it's wired
  // For now, pass null and let AgentProvider handle the no-DID case
  const ownerDid = null; // Replace with: useDid()?.did or similar

  return (
    <AgentProvider ownerDid={ownerDid}>
      <CombatArenaInner />
    </AgentProvider>
  );
}
```

**Step 2: Verify no TS errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 3: Commit**

```bash
git add src/pages/CombatArena.tsx
git commit -m "feat: wire agent system into CombatArena — dashboard, setup modal, 3-mode queue"
```

---

### Task 9: Wire TurnTimer into BattleView

**Files:**
- Modify: `src/components/combat/BattleView.tsx`

**Context:** Read the existing BattleView.tsx first. Add the circular TurnTimer next to the existing move controls. It should show the 30-second countdown when it's the player's turn to submit. This replaces/supplements the linear timer already in MoveButtons.

**Step 1: Read BattleView.tsx**

Run: Read `src/components/combat/BattleView.tsx`

**Step 2: Add TurnTimer import and usage**

Add to imports:
```typescript
import { TurnTimer } from './TurnTimer';
```

Find where MoveButtons is rendered (it should be conditional on battle status being 'waiting_moves' and the current user's side hasn't submitted yet). Add the TurnTimer next to the move selection area:

```typescript
{/* Turn timer — shows for manual/agent mode when it's your turn */}
{isYourTurn && battleMode !== 'auto' && (
  <div className="flex items-center justify-center mb-3">
    <TurnTimer
      totalSeconds={30}
      onTimeout={handleTimeout}
      isPaused={!isYourTurn}
    />
  </div>
)}
```

**Important:** Read the full BattleView.tsx first to determine the exact location. The TurnTimer should be placed ABOVE the MoveButtons grid so the countdown is prominent.

**Step 3: Commit**

```bash
git add src/components/combat/BattleView.tsx
git commit -m "feat: add circular TurnTimer to BattleView for 30s countdown"
```

---

## Package H: Build Verification

### Task 10: Verify TypeScript compilation

**Step 1: Run TypeScript check**

Run: `npx tsc --noEmit --pretty`
Expected: No errors.

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds.

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build errors from agent frontend integration"
```

---

### Task 11: Final verification

**Step 1: Check all new files exist**

Run: `ls src/components/combat/AgentSetupModal.tsx src/components/combat/AgentDashboard.tsx src/components/combat/BattleModeSelector.tsx src/components/combat/TurnTimer.tsx src/contexts/AgentContext.tsx`

Expected: All 5 new files listed.

**Step 2: Verify QueuePanel and CombatArena were modified**

Run: `git diff --stat HEAD~11 -- src/components/combat/QueuePanel.tsx src/pages/CombatArena.tsx`

Expected: Both files show as modified.

**Step 3: Verify theme.css has agent styles**

Run: `grep -c 'agent-modal' src/styles/theme.css`

Expected: Multiple matches.

**Step 4: Final build check**

Run: `npm run build`

Expected: Clean build.

**Step 5: Commit if anything uncommitted**

```bash
git status
# If any changes:
git add -A
git commit -m "feat: complete agent battle frontend — modal, dashboard, mode selector, timer"
```

---

## Component Architecture Summary

```
CombatArena (page)
├── AgentProvider (context wrapper)
│   ├── AgentDashboard (shows when agent exists)
│   │   └── agent stats, tier badge, webhook status
│   ├── "Create Agent" CTA (shows when no agent)
│   ├── QueuePanel (modified)
│   │   ├── Fighter selector (existing)
│   │   ├── BattleModeSelector (NEW — 3 pills)
│   │   │   ├── Manual (User icon)
│   │   │   ├── Auto (Cpu icon)
│   │   │   └── Agent (Bot icon — disabled if no agent)
│   │   └── Queue button
│   ├── Active battle link
│   └── BattleHistory (existing)
├── AgentSetupModal (NEW — create agent + API key reveal)
│   ├── Form: name + webhook URL
│   ├── API key card with copy-to-clipboard
│   └── Webhook secret display
└── BattleView (when in battle)
    ├── FighterCard × 2
    ├── HPBar × 2
    ├── TurnTimer (NEW — circular 30s countdown)
    ├── MoveButtons (existing, for manual mode)
    └── TurnLog
```

## CSS Classes Reference

All new classes are in `src/styles/theme.css`:
- `.agent-modal-*` — modal overlay, container, header, body, footer, close
- `.agent-field` — form field wrapper with label
- `.api-key-card` — premium key display with shimmer animation
- `.api-key-value` — monospace key text
- `.api-key-warning` — yellow warning text with icon
- `.battle-mode-selector` — pill container
- `.battle-mode-option` — individual pill (+ `.active`, `.disabled`)
- `.agent-dashboard` — status card
- `.agent-dashboard-*` — header, stats, footer sub-sections
- `.agent-stat` — individual stat cell
- `.agent-status-dot` — pulsing green dot (+ `.inactive`)
- `.agent-tier-*` — trial (cyan), free (muted), premium (gold)
- `.rate-limit-bar/fill` — usage bar (+ `.near-limit`, `.at-limit`)
- `.turn-timer` — circular timer container
- `.turn-timer-ring` — SVG ring (+ `.track`, `.progress`, `.warning`, `.critical`)
- `.webhook-status/dot` — small webhook indicator
- `.agent-action-row` — dashed CTA row for "Create Agent"
