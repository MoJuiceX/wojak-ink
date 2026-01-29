/**
 * Wojak Runner - Migrated to Shared Systems
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameSounds } from '@/hooks/useGameSounds';
import { useLeaderboard } from '@/hooks/data/useLeaderboard';
import { useAudio } from '@/contexts/AudioContext';
import { GameShell } from '@/systems/game-ui';
import { useEffects, EffectsLayer } from '@/systems/effects';
import {
  WOJAK_RUNNER_CONFIG,
  LANE_WIDTH,
  PLAYER_SIZE,
  OBSTACLE_SIZE,
  COLLECTIBLE_SIZE,
  SAD_IMAGES,
} from './config';
import './WojakRunner.game.css';

interface Obstacle {
  id: number;
  lane: number;
  y: number;
  type: 'camel' | 'bear';
}

interface Collectible {
  id: number;
  lane: number;
  y: number;
}

interface LocalLeaderboardEntry {
  name: string;
  score: number;
  date: string;
}

const WojakRunnerGame: React.FC = () => {
  const { playCollect, playGameOver, startRunning, stopRunning } = useGameSounds();
  const effects = useEffects();

  const {
    leaderboard: _globalLeaderboard,
    submitScore,
    isSignedIn,
    userDisplayName,
    isSubmitting,
  } = useLeaderboard(WOJAK_RUNNER_CONFIG.leaderboardId || 'wojak-runner');

  const { isBackgroundMusicPlaying: _isBackgroundMusicPlaying, playBackgroundMusic: _playBackgroundMusic, pauseBackgroundMusic: _pauseBackgroundMusic } = useAudio();

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [playerLane, setPlayerLane] = useState(1);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(5);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('wojakRunnerHighScore') || '0', 10);
  });
  const [playerName, setPlayerName] = useState('');
  const [localLeaderboard, setLocalLeaderboard] = useState<LocalLeaderboardEntry[]>(() => {
    const saved = localStorage.getItem('wojakRunnerLeaderboard');
    return saved ? JSON.parse(saved) : [];
  });
  const [sadImage, setSadImage] = useState('');
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [isNewPersonalBest, setIsNewPersonalBest] = useState(false);
  const [_showLeaderboardPanel, _setShowLeaderboardPanel] = useState(false);
  const [showScreenShake, _setShowScreenShake] = useState(false);

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const obstacleIdRef = useRef(0);
  const collectibleIdRef = useRef(0);
  const touchStartXRef = useRef(0);
  const lastSpawnRef = useRef(0);

  const [collectStreak, setCollectStreak] = useState(0);
  const collectStreakRef = useRef(0);
  const lastDistanceMilestoneRef = useRef(0);

  const playCollectRef = useRef(playCollect);
  const playGameOverRef = useRef(playGameOver);
  const startRunningRef = useRef(startRunning);
  const stopRunningRef = useRef(stopRunning);

  useEffect(() => {
    playCollectRef.current = playCollect;
    playGameOverRef.current = playGameOver;
    startRunningRef.current = startRunning;
    stopRunningRef.current = stopRunning;
  }, [playCollect, playGameOver, startRunning, stopRunning]);

  useEffect(() => {
    if (gameState === 'playing') {
      startRunningRef.current(180);
    } else {
      stopRunningRef.current();
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'idle') {
      startGame();
    }
  }, []);

  const startGame = () => {
    setPlayerLane(1);
    setObstacles([]);
    setCollectibles([]);
    setScore(0);
    setDistance(0);
    setSpeed(5);
    obstacleIdRef.current = 0;
    collectibleIdRef.current = 0;
    lastSpawnRef.current = 0;
    lastDistanceMilestoneRef.current = 0;
    setPlayerName('');
    setScoreSubmitted(false);
    setIsNewPersonalBest(false);
    setCollectStreak(0);
    collectStreakRef.current = 0;
    setGameState('playing');
  };

  const goToMenu = () => {
    setGameState('idle');
    setPlayerName('');
  };

  const saveScoreLocal = () => {
    if (!playerName.trim()) return;

    const finalScore = score + Math.floor(distance / 10);
    const newEntry: LocalLeaderboardEntry = {
      name: playerName.trim(),
      score: finalScore,
      date: new Date().toISOString().split('T')[0],
    };

    const updatedLeaderboard = [...localLeaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    setLocalLeaderboard(updatedLeaderboard);
    localStorage.setItem('wojakRunnerLeaderboard', JSON.stringify(updatedLeaderboard));
    setPlayerName('');
    goToMenu();
  };

  const submitScoreGlobal = useCallback(async (finalScore: number) => {
    if (!isSignedIn || scoreSubmitted || finalScore === 0) return;

    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('wojakRunnerHighScore', String(finalScore));
    }

    setScoreSubmitted(true);
    const result = await submitScore(finalScore, 1, { distance });

    if (result.success && result.isNewHighScore) {
      setIsNewPersonalBest(true);
    }
  }, [isSignedIn, scoreSubmitted, submitScore, highScore, distance]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = () => {
      // Move obstacles down
      setObstacles(prev => {
        const updated = prev
          .map(o => ({ ...o, y: o.y + speed }))
          .filter(o => o.y < 600);

        // Check collision with player
        const playerX = 40 + playerLane * LANE_WIDTH + LANE_WIDTH / 2;
        const playerY = 500;

        for (const obs of updated) {
          const obsX = 40 + obs.lane * LANE_WIDTH + LANE_WIDTH / 2;
          const obsY = obs.y;

          if (
            Math.abs(obsX - playerX) < (PLAYER_SIZE + OBSTACLE_SIZE) / 2 - 10 &&
            Math.abs(obsY - playerY) < (PLAYER_SIZE + OBSTACLE_SIZE) / 2 - 10
          ) {
            playGameOverRef.current();
            setSadImage(SAD_IMAGES[Math.floor(Math.random() * SAD_IMAGES.length)]);
            setGameState('gameover');
            return [];
          }
        }

        return updated;
      });

      // Move collectibles down
      setCollectibles(prev => {
        const updated = prev
          .map(c => ({ ...c, y: c.y + speed }))
          .filter(c => c.y < 600);

        const playerX = 40 + playerLane * LANE_WIDTH + LANE_WIDTH / 2;
        const playerY = 500;
        const collected: number[] = [];

        for (const col of updated) {
          const colX = 40 + col.lane * LANE_WIDTH + LANE_WIDTH / 2;
          const colY = col.y;

          if (
            Math.abs(colX - playerX) < (PLAYER_SIZE + COLLECTIBLE_SIZE) / 2 &&
            Math.abs(colY - playerY) < (PLAYER_SIZE + COLLECTIBLE_SIZE) / 2
          ) {
            collected.push(col.id);
            playCollectRef.current();
            setScore(s => s + 10);

            collectStreakRef.current++;
            setCollectStreak(collectStreakRef.current);

            effects.trigger({ type: 'shockwave', intensity: 'normal' });
            effects.trigger({ type: 'scorePopup', data: { score: 10 } });

            if (collectStreakRef.current >= 5) {
              effects.trigger({ type: 'comboText', data: { combo: collectStreakRef.current } });
            }
          }
        }

        return updated.filter(c => !collected.includes(c.id));
      });

      // Update distance and speed
      setDistance(d => {
        const newDist = d + speed / 10;
        if (Math.floor(newDist / 100) > lastDistanceMilestoneRef.current) {
          lastDistanceMilestoneRef.current = Math.floor(newDist / 100);
          setSpeed(s => Math.min(s + 0.5, 15));
          effects.trigger({ type: 'confetti', intensity: 'normal' });
        }
        return newDist;
      });

      // Spawn obstacles and collectibles
      lastSpawnRef.current += speed;
      if (lastSpawnRef.current > 150) {
        lastSpawnRef.current = 0;

        if (Math.random() < 0.3) {
          const lane = Math.floor(Math.random() * 3);
          setObstacles(prev => [...prev, {
            id: obstacleIdRef.current++,
            lane,
            y: -OBSTACLE_SIZE,
            type: Math.random() < 0.5 ? 'camel' : 'bear',
          }]);
        }

        if (Math.random() < 0.4) {
          const lane = Math.floor(Math.random() * 3);
          setCollectibles(prev => [...prev, {
            id: collectibleIdRef.current++,
            lane,
            y: -COLLECTIBLE_SIZE,
          }]);
        }
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, playerLane, speed, effects]);

  // Controls
  useEffect(() => {
    if (gameState !== 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setPlayerLane(l => Math.max(0, l - 1));
      } else if (e.key === 'ArrowRight') {
        setPlayerLane(l => Math.min(2, l + 1));
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartXRef.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const diff = e.changedTouches[0].clientX - touchStartXRef.current;
      if (Math.abs(diff) > 50) {
        if (diff < 0) {
          setPlayerLane(l => Math.max(0, l - 1));
        } else {
          setPlayerLane(l => Math.min(2, l + 1));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [gameState]);

  // Auto-submit score
  useEffect(() => {
    if (gameState === 'gameover' && isSignedIn && (score + Math.floor(distance / 10)) > 0 && !scoreSubmitted) {
      submitScoreGlobal(score + Math.floor(distance / 10));
    }
  }, [gameState, isSignedIn, score, distance, scoreSubmitted, submitScoreGlobal]);

  const finalScore = score + Math.floor(distance / 10);

  return (
    <div className="runner-container">
      {gameState === 'playing' && (
        <div className="runner-layout">
          <div className="stats-panel">
            <div className="stat-item">
              <span className="stat-label">Score</span>
              <span className="stat-value">{score}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Distance</span>
              <span className="stat-value">{Math.floor(distance)}m</span>
            </div>
            {collectStreak >= 3 && (
              <div className="stat-item streak-stat">
                <span className="stat-label">Streak</span>
                <span className="stat-value">{collectStreak}x</span>
              </div>
            )}
          </div>

          <div className={`lightbox-wrapper ${showScreenShake ? 'screen-shake' : ''}`}>
            <EffectsLayer />
            <div ref={gameAreaRef} className="runner-area">
              <div className="lanes">
                {[0, 1, 2].map(lane => (
                  <div key={lane} className="lane" />
                ))}
              </div>

              <div
                className="player"
                style={{
                  left: 40 + playerLane * LANE_WIDTH + LANE_WIDTH / 2 - PLAYER_SIZE / 2,
                  top: 500 - PLAYER_SIZE / 2,
                }}
              >
                🏃
              </div>

              {obstacles.map(obs => (
                <div
                  key={obs.id}
                  className={`obstacle ${obs.type}`}
                  style={{
                    left: 40 + obs.lane * LANE_WIDTH + LANE_WIDTH / 2 - OBSTACLE_SIZE / 2,
                    top: obs.y,
                  }}
                >
                  {obs.type === 'camel' ? '🐫' : '🐻'}
                </div>
              ))}

              {collectibles.map(col => (
                <div
                  key={col.id}
                  className="collectible"
                  style={{
                    left: 40 + col.lane * LANE_WIDTH + LANE_WIDTH / 2 - COLLECTIBLE_SIZE / 2,
                    top: col.y,
                  }}
                >
                  🍊
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="game-over-screen">
          <div className="game-over-left">
            {sadImage && <img src={sadImage} alt="Game Over" className="sad-image-large" />}
          </div>
          <div className="game-over-right">
            <div className="game-over-title">Game Over</div>
            <div className="game-over-score">
              <span className="game-over-score-value">{finalScore}</span>
              <span className="game-over-score-label">points</span>
            </div>
            <div className="game-over-stats">
              <span>Distance: {Math.floor(distance)}m</span>
            </div>

            {(isNewPersonalBest || finalScore > highScore) && finalScore > 0 && (
              <div className="game-over-record">🌟 New Personal Best! 🌟</div>
            )}

            {finalScore > 0 ? (
              isSignedIn ? (
                <div className="game-over-form">
                  <div className="game-over-submitted">
                    {isSubmitting ? 'Saving...' : scoreSubmitted ? `Saved as ${userDisplayName}!` : null}
                  </div>
                  <div className="game-over-buttons">
                    <button onClick={startGame} className="play-btn">Play Again</button>
                  </div>
                </div>
              ) : (
                <div className="game-over-form">
                  <input
                    type="text"
                    className="game-over-input"
                    placeholder="Your name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={15}
                  />
                  <div className="game-over-buttons">
                    <button onClick={saveScoreLocal} className="game-over-save" disabled={!playerName.trim()}>Save</button>
                    <button onClick={startGame} className="game-over-skip">Play Again</button>
                  </div>
                </div>
              )
            ) : (
              <div className="game-over-buttons-single">
                <button onClick={startGame} className="play-btn">Play Again</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const WojakRunner: React.FC = () => (
  <GameShell gameId={WOJAK_RUNNER_CONFIG.id}>
    <WojakRunnerGame />
  </GameShell>
);

export default WojakRunner;
