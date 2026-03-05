import React, { useEffect, useState } from 'react';
import { SignInButton } from '@/lib/clerkSafe';
import { useEffects, getGameOverPreset } from '../effects';
import { CurrencyEarnedDisplay } from './CurrencyEarnedDisplay';
import { useUserProfile } from '@/contexts/UserProfileContext';
import './game-ui.css';

interface GameOverScreenProps {
  isVisible: boolean;
  score: number;
  highScore: number;
  isNewHighScore: boolean;

  // Engagement data
  currencyEarned?: {
    oranges: number;
    gems: number;
    breakdown?: Record<string, number>;
  };
  leaderboardRank?: number;
  isNftHolder?: boolean; // Legacy prop - now using isSignedIn from context
  newAchievements?: Array<{ id: string; name: string; icon: string }>;

  // Callbacks
  onPlayAgain: () => void;
  onMainMenu: () => void;
  onViewLeaderboard?: () => void;
  onShare?: () => void;

  // Game info
  gameName: string;
  gameId: string;

  // Optional custom content
  customContent?: React.ReactNode;
  sadImage?: string;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  isVisible,
  score,
  highScore,
  isNewHighScore,
  currencyEarned,
  leaderboardRank,
  isNftHolder: _isNftHolder = false, // Legacy prop, now using isSignedIn
  newAchievements = [],
  onPlayAgain,
  onMainMenu,
  onViewLeaderboard,
  onShare,
  gameName,
  customContent,
  sadImage
}) => {
  const { triggerPreset } = useEffects();
  const { isSignedIn } = useUserProfile();
  const [showContent, setShowContent] = useState(false);

  // Use isSignedIn for leaderboard gating (NFT not required)
  const canCompeteOnLeaderboard = isSignedIn;

  useEffect(() => {
    if (isVisible) {
      // Trigger celebration effects
      triggerPreset(getGameOverPreset({
        isHighScore: isNewHighScore,
        isTopTen: !!leaderboardRank && leaderboardRank <= 10,
        score
      }));

      // Stagger content reveal
      setTimeout(() => setShowContent(true), 300);
    } else {
      queueMicrotask(() => setShowContent(false));
    }
  }, [isVisible, isNewHighScore, leaderboardRank, score, triggerPreset]);

  if (!isVisible) return null;

  return (
    <div className="game-over-overlay">
      <div className={`game-over-modal ${showContent ? 'show' : ''}`}>
        {/* Header */}
        <div className="game-over-header">
          <h2 className="game-over-title">
            {isNewHighScore ? '🏆 New High Score!' : 'Game Over'}
          </h2>
          {gameName && <p className="game-over-subtitle">{gameName}</p>}
        </div>

        {/* Optional sad image */}
        {sadImage && !isNewHighScore && (
          <div className="game-over-image">
            <img src={sadImage} alt="Game Over" className="sad-image" />
          </div>
        )}

        {/* Score Display */}
        <div className="game-over-score-section">
          <div className="score-main">
            <span className="score-label">Score</span>
            <span className="score-value">{score.toLocaleString()}</span>
          </div>
          <div className="score-best">
            <span className="score-label">Best</span>
            <span className="score-value">{highScore.toLocaleString()}</span>
          </div>
        </div>

        {/* Leaderboard Rank (if signed in and ranked) */}
        {canCompeteOnLeaderboard && leaderboardRank && (
          <div className="leaderboard-rank-display">
            <span className="rank-label">Leaderboard Rank</span>
            <span className="rank-value">#{leaderboardRank}</span>
          </div>
        )}

        {/* Sign-in prompt (if not authenticated) */}
        {!isSignedIn && (
          <div className="sign-in-prompt">
            <span className="gate-icon">🎮</span>
            <p className="prompt-text">Sign in to save your score and compete on leaderboards!</p>
            <SignInButton mode="modal">
              <button className="sign-in-button">
                <span>Sign In with Google</span>
              </button>
            </SignInButton>
          </div>
        )}

        {/* Currency Earned */}
        {currencyEarned && (currencyEarned.oranges > 0 || currencyEarned.gems > 0) && (
          <CurrencyEarnedDisplay
            oranges={currencyEarned.oranges}
            gems={currencyEarned.gems}
            breakdown={currencyEarned.breakdown}
          />
        )}

        {/* New Achievements */}
        {newAchievements.length > 0 && (
          <div className="new-achievements">
            <h3>Achievements Unlocked!</h3>
            {newAchievements.map((achievement) => (
              <div key={achievement.id} className="achievement-badge">
                <span className="achievement-icon">{achievement.icon}</span>
                <span className="achievement-name">{achievement.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Custom content slot */}
        {customContent}

        {/* Actions */}
        <div className="game-over-actions">
          <button
            onClick={onPlayAgain}
            className="play-again-button"
          >
            Play Again
          </button>

          <div className="secondary-actions">
            {onShare && (
              <button className="secondary-button" onClick={onShare}>
                Share
              </button>
            )}
            {onViewLeaderboard && (
              <button className="secondary-button" onClick={onViewLeaderboard}>
                Leaderboard
              </button>
            )}
            <button className="secondary-button menu-button" onClick={onMainMenu}>
              Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
