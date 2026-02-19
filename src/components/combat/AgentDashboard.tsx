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
