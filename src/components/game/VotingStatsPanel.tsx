// Your stats panel — desktop right column.
// Power level, vote progress, onboarding checklist, dashboard link.

import { useEffect, useRef, useState } from 'react';
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
  const [bouncing, setBouncing] = useState(false);
  const prevVotesRemaining = useRef(player?.votesRemaining ?? 10);

  // Counter bounce on vote count change
  useEffect(() => {
    if (!player) return;
    if (player.votesRemaining !== prevVotesRemaining.current) {
      prevVotesRemaining.current = player.votesRemaining;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBouncing(true);
      const timer = setTimeout(() => setBouncing(false), 200);
      return () => clearTimeout(timer);
    }
  }, [player?.votesRemaining, player]);

  if (!player) return null;

  const tier = getTierLabel(player.powerLevel);
  const votesUsed = 10 - player.votesRemaining;
  const progressPct = (votesUsed / 10) * 100;

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

      {/* Votes Today */}
      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted">Votes Today</span>
        <div
          className="vote-progress-bar"
          role="progressbar"
          aria-valuenow={votesUsed}
          aria-valuemin={0}
          aria-valuemax={10}
          aria-label="Votes used today"
        >
          <div
            className="vote-progress-fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span
          className={`text-secondary ${bouncing ? 'counter-bounce' : ''}`}
          style={{ fontSize: 13 }}
        >
          {player.votesRemaining}/10 remaining
        </span>
      </div>

      {/* Onboarding */}
      {player.onboarding && (
        <OnboardingChecklist milestones={player.onboarding} />
      )}

      {/* Dashboard link */}
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 8 }}>
        <Link
          to="/swipe/dashboard"
          className="text-muted"
          style={{ fontSize: 12, transition: 'color 150ms' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = '')}
        >
          Dashboard &rarr;
        </Link>
      </div>
    </div>
  );
}
