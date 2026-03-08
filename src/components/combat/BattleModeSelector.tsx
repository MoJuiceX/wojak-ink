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
              type="button"
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
