// Your stats panel — desktop right column.
// Voting-only Player Score + tier, using /api/fight-club/my-score.

import { Link } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';
import { useQuery } from '@tanstack/react-query';
import { OnboardingChecklist } from './OnboardingChecklist';

interface MyScoreData {
  success: boolean;
  registered: boolean;
  did: string | null;
  ranked: boolean;
  rank: number | null;
  playerScore: number;
  tier: string;
  eligibleWojakCount: number;
  totalWojakCount: number;
  bestWojakScore: number | null;
  pointsToNextRank: number | null;
  nextRank: number | null;
  meta: { mode: string; provisionalMinVotes: number; playerTopN: number };
}

function getTierColor(tier: string): string {
  switch (tier) {
    case 'Legend': return 'var(--color-primary)';
    case 'Elite': return 'var(--color-cyan, #06b6d4)';
    case 'Strong': return 'var(--color-success)';
    case 'Serious': return 'var(--color-text)';
    case 'Active': return 'var(--color-text-secondary)';
    default: return 'var(--color-text-muted)';
  }
}

export function VotingStatsPanel() {
  const { player } = useGame();

  // Fetch voting-only score from dedicated endpoint
  const { data: scoreData } = useQuery({
    queryKey: ['fight-club-my-score', player?.did],
    queryFn: async (): Promise<MyScoreData> => {
      const params = player?.did ? `?did=${encodeURIComponent(player.did)}` : '';
      const res = await fetch(`/api/fight-club/my-score${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    enabled: !!player,
    staleTime: 30000,
    retry: 2,
  });

  if (!player) return null;

  // Use voting-only score if available, fallback to legacy
  const playerScore = scoreData?.playerScore ?? 0;
  const tier = scoreData?.tier ?? 'Casual';
  const tierColor = getTierColor(tier);
  const ranked = scoreData?.ranked ?? false;
  const rank = scoreData?.rank ?? null;
  const eligibleCount = scoreData?.eligibleWojakCount ?? 0;

  return (
    <div className="card-static p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="text-xs text-muted" style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
        Your Game
      </div>

      {/* Player Score */}
      <div className="flex flex-col items-center gap-1">
        <span className="font-bold" style={{ fontSize: 24 }}>
          {playerScore.toLocaleString()}
        </span>
        <span style={{ fontSize: 14, color: tierColor }}>
          {tier}
        </span>
        <span className="text-secondary text-xs">Player Score</span>
      </div>

      {/* Rank info */}
      <div className="flex justify-between text-xs" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 8 }}>
        <span className="text-secondary">
          {ranked ? `Rank #${rank}` : 'Unranked'}
        </span>
        <span className="text-secondary">
          {eligibleCount} eligible Wojak{eligibleCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Helper text */}
      <span className="text-xs text-muted" style={{ lineHeight: 1.4 }}>
        Top 10 eligible Wojaks (5+ votes) in your DID
      </span>

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
