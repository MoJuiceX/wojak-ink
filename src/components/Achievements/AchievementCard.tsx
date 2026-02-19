/**
 * AchievementCard Component
 *
 * Displays single achievement with progress.
 */

import { Check, Lock } from 'lucide-react';
import type { Achievement, UserAchievementProgress } from '@/types/achievement';
import './Achievements.css';

interface AchievementCardProps {
  achievement: Achievement;
  progress: UserAchievementProgress | null;
  onClaim?: () => void;
}

export function AchievementCard({ achievement, progress, onClaim }: AchievementCardProps) {
  const isCompleted = progress?.completed || false;
  const isClaimed = progress?.claimed || false;
  const currentProgress = progress?.progress || 0;
  const target = achievement.requirement.target;

  // Calculate percentage (cap at 100%)
  const percentage = Math.min((currentProgress / target) * 100, 100);

  // For secret achievements that aren't unlocked
  if (achievement.isSecret && !isCompleted) {
    return (
      <div className="achievement-card secret">
        <div className="achievement-icon">
          <Lock size={24} />
        </div>
        <div className="achievement-info">
          <h3 className="achievement-name">???</h3>
          <p className="achievement-description">Secret achievement</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`achievement-card ${isCompleted ? 'completed' : ''} ${isClaimed ? 'claimed' : ''}`}>
      <div className="achievement-icon">
        {achievement.icon}
        {isCompleted && (
          <span className="completed-badge">
            <Check size={12} />
          </span>
        )}
      </div>

      <div className="achievement-info">
        <h3 className="achievement-name">{achievement.name}</h3>
        <p className="achievement-description">{achievement.description}</p>

        {!isCompleted && (
          <div className="achievement-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="progress-text">
              {currentProgress.toLocaleString()} / {target.toLocaleString()}
            </span>
          </div>
        )}

        {isCompleted && !isClaimed && (
          <div className="achievement-reward-preview">
            {achievement.reward.oranges > 0 && (
              <span className="reward-oranges">🍊 {achievement.reward.oranges}</span>
            )}
            {achievement.reward.gems > 0 && (
              <span className="reward-gems">💎 {achievement.reward.gems}</span>
            )}
          </div>
        )}
      </div>

      {isCompleted && !isClaimed && onClaim && (
        <button type="button" className="claim-button" onClick={onClaim}>
          Claim
        </button>
      )}

      {isClaimed && (
        <span className="claimed-label">Claimed</span>
      )}
    </div>
  );
}
