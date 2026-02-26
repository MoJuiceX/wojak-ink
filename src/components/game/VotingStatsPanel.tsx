// Your stats panel — desktop right column.
// Voting-only Player Score + tier + rank + progress, using shared hook.

import { Link } from 'react-router-dom';
import { useFightClubMyScore } from '@/hooks/useFightClubMyScore';
import { useGame } from '@/contexts/GameContext';
import { OnboardingChecklist } from './OnboardingChecklist';
import { useState } from 'react';
import { RankingRulesModal } from '@/components/combat/RankingRulesModal';

export function VotingStatsPanel() {
  const { player } = useGame();
  const { data: scoreData } = useFightClubMyScore();
  const [showRules, setShowRules] = useState(false);

  if (!player) return null;

  const playerScore = scoreData?.playerScore ?? 0;
  const ranked = scoreData?.ranked ?? false;
  const rank = scoreData?.rank ?? null;
  const eligibleCount = scoreData?.eligibleWojakCount ?? 0;
  const totalCount = scoreData?.totalWojakCount ?? 0;
  const pointsToNext = scoreData?.pointsToNextRank ?? null;
  const nextRank = scoreData?.nextRank ?? null;

  return (
    <>
      <div className="stats-panel">
        {/* Header */}
        <div className="stats-panel-header">
          <span className="stats-panel-title">Your Game</span>
          <button
            type="button"
            className="stats-panel-help"
            onClick={() => setShowRules(true)}
            title="How scoring works"
          >
            ?
          </button>
        </div>

        {/* Player Score — hero */}
        <div className="stats-panel-score">
          <span className="stats-panel-score-value">{playerScore.toLocaleString()}</span>
          <span className="stats-panel-score-label">Player Score</span>
        </div>

        {/* Rank + Eligible */}
        <div className="stats-panel-details">
          <div className="stats-panel-detail">
            <span className="stats-panel-detail-value">
              {ranked ? `#${rank}` : '—'}
            </span>
            <span className="stats-panel-detail-label">
              {ranked ? 'Rank' : 'Unranked'}
            </span>
          </div>
          <div className="stats-panel-detail">
            <span className="stats-panel-detail-value">
              {eligibleCount}/{totalCount}
            </span>
            <span className="stats-panel-detail-label">Eligible</span>
          </div>
        </div>

        {/* Progress to next */}
        {ranked && pointsToNext !== null && nextRank !== null && (
          <div className="stats-panel-progress">
            <span className="text-xs text-secondary">
              {pointsToNext} pt{pointsToNext !== 1 ? 's' : ''} to rank #{nextRank}
            </span>
          </div>
        )}

        {/* Helper */}
        <span className="stats-panel-helper">
          Top 10 eligible Wojaks in your DID
        </span>

        {/* Onboarding */}
        {player.onboarding && (
          <OnboardingChecklist milestones={player.onboarding} />
        )}

        {/* Rankings link */}
        <div className="stats-panel-link">
          <Link
            to="/fight-club/rankings"
            className="stats-panel-cta"
          >
            View Rankings &rarr;
          </Link>
        </div>
      </div>

      {showRules && <RankingRulesModal onClose={() => setShowRules(false)} />}
    </>
  );
}
