// Your stats panel — desktop right column.
// Power level, onboarding checklist.

import { Link } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';
import { OnboardingChecklist } from './OnboardingChecklist';

function getTierLabel(level: number): { label: string; color: string } {
  if (level >= 9000) return { label: 'Legend', color: 'var(--color-primary)' };
  if (level >= 7000) return { label: 'Elite', color: 'var(--color-cyan)' };
  if (level >= 5000) return { label: 'Veteran', color: 'var(--color-success)' };
  if (level >= 3000) return { label: 'Serious', color: 'var(--color-text)' };
  if (level >= 1000) return { label: 'Active', color: 'var(--color-text-secondary)' };
  return { label: 'Casual', color: 'var(--color-text-muted)' };
}

export function VotingStatsPanel() {
  const { player } = useGame();

  if (!player) return null;

  const tier = getTierLabel(player.powerLevel);

  return (
    <div className="card-static p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="text-xs text-muted" style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
        Your Game
      </div>

      {/* Power Level */}
      <div className="flex flex-col items-center gap-1">
        <span className="font-bold" style={{ fontSize: 24 }}>
          {player.powerLevel.toLocaleString()}
        </span>
        <span style={{ fontSize: 14, color: tier.color }}>
          {tier.label}
        </span>
      </div>

      {/* Onboarding */}
      {player.onboarding && (
        <OnboardingChecklist milestones={player.onboarding} />
      )}

      {/* Rankings link */}
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 8 }}>
        <Link
          to="/fight-club/rankings"
          className="text-muted"
          style={{ fontSize: 12, transition: 'color 150ms' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = '')}
        >
          View Rankings &rarr;
        </Link>
      </div>
    </div>
  );
}
