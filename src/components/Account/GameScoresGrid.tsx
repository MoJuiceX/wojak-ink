/**
 * GameScoresGrid Component
 *
 * Shows personal best score + rank for each active game.
 */

import { useEffect, useState } from 'react';
import { Trophy, Hash } from 'lucide-react';
import { MINI_GAMES } from '@/config/games';
import './Account.css';

interface GameScore {
  gameId: string;
  highScore: number;
  rank: number | null;
  lastPlayed: string | null;
}

interface GameScoresGridProps {
  userId: string;
  scores?: GameScore[]; // Pre-fetched scores, or fetch on mount
}

export function GameScoresGrid({ userId, scores: initialScores }: GameScoresGridProps) {
  const [scores, setScores] = useState<GameScore[]>(initialScores || []);
  const [isLoading, setIsLoading] = useState(!initialScores);

  // Get only active games (not disabled or coming soon)
  const activeGames = MINI_GAMES.filter(
    game => game.status === 'available' && !game.disabled
  );

  useEffect(() => {
    if (initialScores) return;

    // Don't fetch if no userId
    if (!userId) {
      setIsLoading(false);
      return;
    }

    async function fetchScores() {
      try {
        const response = await fetch(`/api/scores/${userId}`);
        if (response.ok) {
          const data = await response.json();
          setScores(data.scores || []);
        } else {
          console.error('[GameScoresGrid] API error:', response.status, await response.text());
        }
      } catch (error) {
        console.error('[GameScoresGrid] Failed to fetch scores:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchScores();
  }, [userId, initialScores]);

  // Create a map for quick lookup
  const scoreMap = new Map(scores.map(s => [s.gameId, s]));

  return (
    <div className="game-scores-section">
      <h2 className="section-title">Game Scores</h2>

      <div className="games-grid">
        {activeGames.map((game) => {
          const score = scoreMap.get(game.id);

          return (
            <div
              key={game.id}
              className="game-score-card"
            >
              <span className="game-emoji">{game.emoji}</span>
              <div className="game-info">
                <span className="game-name">{game.name}</span>
                {isLoading ? (
                  <span className="game-not-played">Loading...</span>
                ) : score ? (
                  <div className="game-stats">
                    <span className="game-high-score">
                      <Trophy size={12} />
                      {score.highScore.toLocaleString()}
                    </span>
                    {score.rank && (
                      <span className="game-rank">
                        <Hash size={12} />
                        #{score.rank}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="game-not-played">Not played yet</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
