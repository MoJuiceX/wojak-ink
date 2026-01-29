/**
 * Orange Pong - Migrated to Shared Systems
 *
 * Wrapper that provides effects context to the game.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameSounds } from '@/hooks/useGameSounds';
import { useLeaderboard } from '@/hooks/data/useLeaderboard';
import { useAudio } from '@/contexts/AudioContext';
import { GameShell } from '@/systems/game-ui';
import { useEffects, EffectsLayer } from '@/systems/effects';
import {
  ORANGE_PONG_CONFIG,
  PADDLE_HEIGHT,
  PADDLE_WIDTH,
  BALL_SIZE,
  WIN_SCORE,
  AI_SPEED,
  AI_REACTION_ZONE,
  SAD_IMAGES,
} from './config';
import './OrangePong.game.css';

interface LocalLeaderboardEntry {
  name: string;
  score: number;
  date: string;
}

const OrangePongGame: React.FC = () => {
  const { playPaddleHit, playWallBounce, playScorePoint, playWinSound, playGameOver } = useGameSounds();
  const effects = useEffects();

  const {
    leaderboard: globalLeaderboard,
    submitScore,
    isSignedIn,
    userDisplayName,
    isSubmitting,
  } = useLeaderboard(ORANGE_PONG_CONFIG.leaderboardId || 'orange-pong');

  const { isBackgroundMusicPlaying: _isBackgroundMusicPlaying, playBackgroundMusic: _playBackgroundMusic, pauseBackgroundMusic: _pauseBackgroundMusic } = useAudio();

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [playTime, setPlayTime] = useState(0);
  const [playerY, setPlayerY] = useState(0);
  const [aiY, setAiY] = useState(0);
  const [ballX, setBallX] = useState(0);
  const [ballY, setBallY] = useState(0);
  const [ballVX, setBallVX] = useState(5);
  const [ballVY, setBallVY] = useState(3);
  const [playerName, setPlayerName] = useState('');
  const [sadImage, setSadImage] = useState('');
  const [localLeaderboard, setLocalLeaderboard] = useState<LocalLeaderboardEntry[]>(() => {
    const saved = localStorage.getItem('orangePongLeaderboard');
    return saved ? JSON.parse(saved) : [];
  });
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('orangePongHighScore') || '0', 10);
  });
  const [isNewPersonalBest, setIsNewPersonalBest] = useState(false);
  const [showLeaderboardPanel, setShowLeaderboardPanel] = useState(false);
  const [showScreenShake, _setShowScreenShake] = useState(false);

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const playerYRef = useRef(0);

  const [rally, setRally] = useState(0);
  const rallyRef = useRef(0);

  const playPaddleHitRef = useRef(playPaddleHit);
  const playWallBounceRef = useRef(playWallBounce);
  const playScorePointRef = useRef(playScorePoint);
  const playWinSoundRef = useRef(playWinSound);
  const playGameOverRef = useRef(playGameOver);

  useEffect(() => {
    playPaddleHitRef.current = playPaddleHit;
    playWallBounceRef.current = playWallBounce;
    playScorePointRef.current = playScorePoint;
    playWinSoundRef.current = playWinSound;
    playGameOverRef.current = playGameOver;
  }, [playPaddleHit, playWallBounce, playScorePoint, playWinSound, playGameOver]);

  const resetBall = useCallback((direction: number) => {
    const width = gameAreaRef.current?.offsetWidth || 300;
    const height = gameAreaRef.current?.offsetHeight || 500;

    setBallX(width / 2 - BALL_SIZE / 2);
    setBallY(height / 2 - BALL_SIZE / 2);
    setBallVX(5 * direction);
    setBallVY((Math.random() - 0.5) * 6);
  }, []);

  const startGame = () => {
    const height = gameAreaRef.current?.offsetHeight || 500;
    const centerY = (height - PADDLE_HEIGHT) / 2;

    setPlayerScore(0);
    setAiScore(0);
    setTotalPoints(0);
    setPlayTime(0);
    setPlayerY(centerY);
    setAiY(centerY);
    playerYRef.current = centerY;
    setPlayerName('');
    setScoreSubmitted(false);
    setIsNewPersonalBest(false);
    setRally(0);
    rallyRef.current = 0;
    resetBall(-1);
    setGameState('playing');
  };

  const goToMenu = () => {
    setGameState('idle');
    setPlayerName('');
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (gameState === 'idle') {
        startGame();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const saveScoreLocal = () => {
    if (!playerName.trim()) return;

    const newEntry: LocalLeaderboardEntry = {
      name: playerName.trim(),
      score: totalPoints,
      date: new Date().toISOString().split('T')[0],
    };

    const updatedLeaderboard = [...localLeaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    setLocalLeaderboard(updatedLeaderboard);
    localStorage.setItem('orangePongLeaderboard', JSON.stringify(updatedLeaderboard));
    setPlayerName('');
    goToMenu();
  };

  const submitScoreGlobal = useCallback(async (finalScore: number) => {
    if (!isSignedIn || scoreSubmitted || finalScore === 0) return;

    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('orangePongHighScore', String(finalScore));
    }

    setScoreSubmitted(true);
    const result = await submitScore(finalScore, 1, { playTime });

    if (result.success && result.isNewHighScore) {
      setIsNewPersonalBest(true);
    }
  }, [isSignedIn, scoreSubmitted, submitScore, highScore, playTime]);

  const displayLeaderboard = globalLeaderboard.length > 0
    ? globalLeaderboard.map(entry => ({
        name: entry.displayName,
        score: entry.score,
        date: entry.date,
      }))
    : localLeaderboard;

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const width = gameAreaRef.current?.offsetWidth || 300;
    const height = gameAreaRef.current?.offsetHeight || 500;

    let currentBallX = ballX;
    let currentBallY = ballY;
    let currentBallVX = ballVX;
    let currentBallVY = ballVY;
    let currentPlayerY = playerYRef.current;
    let currentAiY = aiY;
    let currentRally = rallyRef.current;

    const gameLoop = () => {
      // Update ball position
      currentBallX += currentBallVX;
      currentBallY += currentBallVY;

      // Wall bounce (top/bottom)
      if (currentBallY <= 0 || currentBallY >= height - BALL_SIZE) {
        currentBallVY = -currentBallVY;
        playWallBounceRef.current();
        currentBallY = Math.max(0, Math.min(currentBallY, height - BALL_SIZE));
      }

      // Player paddle collision (left side)
      if (
        currentBallX <= PADDLE_WIDTH + 20 &&
        currentBallY + BALL_SIZE >= currentPlayerY &&
        currentBallY <= currentPlayerY + PADDLE_HEIGHT
      ) {
        currentBallVX = Math.abs(currentBallVX) * 1.05;
        const hitPos = (currentBallY + BALL_SIZE / 2 - currentPlayerY) / PADDLE_HEIGHT;
        currentBallVY = (hitPos - 0.5) * 10;
        currentBallX = PADDLE_WIDTH + 20;
        currentRally++;
        rallyRef.current = currentRally;
        setRally(currentRally);
        playPaddleHitRef.current();

        effects.trigger({ type: 'shockwave', intensity: 'normal' });

        if (currentRally >= 5) {
          effects.trigger({ type: 'sparks', intensity: 'medium' });
        }
        if (currentRally >= 10) {
          effects.trigger({ type: 'comboText', data: { combo: currentRally } });
        }
      }

      // AI paddle collision (right side)
      if (
        currentBallX >= width - PADDLE_WIDTH - 20 - BALL_SIZE &&
        currentBallY + BALL_SIZE >= currentAiY &&
        currentBallY <= currentAiY + PADDLE_HEIGHT
      ) {
        currentBallVX = -Math.abs(currentBallVX) * 1.05;
        const hitPos = (currentBallY + BALL_SIZE / 2 - currentAiY) / PADDLE_HEIGHT;
        currentBallVY = (hitPos - 0.5) * 10;
        currentBallX = width - PADDLE_WIDTH - 20 - BALL_SIZE;
        currentRally++;
        rallyRef.current = currentRally;
        setRally(currentRally);
        playPaddleHitRef.current();
      }

      // Player scores (ball goes past AI)
      if (currentBallX >= width) {
        setPlayerScore(prev => {
          const newScore = prev + 1;
          if (newScore >= WIN_SCORE) {
            playWinSoundRef.current();
            setTotalPoints(tp => {
              const finalPoints = tp + 50;
              setSadImage('');
              setGameState('gameover');
              effects.trigger({ type: 'confetti', intensity: 'strong' });
              return finalPoints;
            });
          } else {
            playScorePointRef.current();
            setTotalPoints(tp => tp + 50);
            effects.trigger({ type: 'shockwave', intensity: 'strong' });
          }
          return newScore;
        });
        currentRally = 0;
        rallyRef.current = 0;
        setRally(0);
        currentBallX = width / 2 - BALL_SIZE / 2;
        currentBallY = height / 2 - BALL_SIZE / 2;
        currentBallVX = 5;
        currentBallVY = (Math.random() - 0.5) * 6;
      }

      // AI scores (ball goes past player)
      if (currentBallX <= -BALL_SIZE) {
        setAiScore(prev => {
          const newScore = prev + 1;
          if (newScore >= WIN_SCORE) {
            playGameOverRef.current();
            setSadImage(SAD_IMAGES[Math.floor(Math.random() * SAD_IMAGES.length)]);
            setGameState('gameover');
          }
          return newScore;
        });
        currentRally = 0;
        rallyRef.current = 0;
        setRally(0);
        currentBallX = width / 2 - BALL_SIZE / 2;
        currentBallY = height / 2 - BALL_SIZE / 2;
        currentBallVX = -5;
        currentBallVY = (Math.random() - 0.5) * 6;
      }

      // AI movement
      const aiTargetY = currentBallY - PADDLE_HEIGHT / 2;
      const aiDiff = aiTargetY - currentAiY;
      if (Math.abs(aiDiff) > AI_REACTION_ZONE) {
        currentAiY += Math.sign(aiDiff) * AI_SPEED;
      }
      currentAiY = Math.max(0, Math.min(currentAiY, height - PADDLE_HEIGHT));

      setBallX(currentBallX);
      setBallY(currentBallY);
      setBallVX(currentBallVX);
      setBallVY(currentBallVY);
      setAiY(currentAiY);

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, effects]);

  // Play time counter
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setPlayTime(prev => prev + 1);
      setTotalPoints(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  // Mouse/touch controls
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameArea = gameAreaRef.current;
    if (!gameArea) return;

    const handleMove = (clientY: number) => {
      const rect = gameArea.getBoundingClientRect();
      const y = clientY - rect.top - PADDLE_HEIGHT / 2;
      const clampedY = Math.max(0, Math.min(y, rect.height - PADDLE_HEIGHT));
      playerYRef.current = clampedY;
      setPlayerY(clampedY);
    };

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleMove(e.touches[0].clientY);
    };

    gameArea.addEventListener('mousemove', handleMouseMove);
    gameArea.addEventListener('touchmove', handleTouchMove, { passive: false });
    gameArea.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handleMove(e.touches[0].clientY);
    }, { passive: false });

    return () => {
      gameArea.removeEventListener('mousemove', handleMouseMove);
      gameArea.removeEventListener('touchmove', handleTouchMove);
    };
  }, [gameState]);

  // Auto-submit score
  useEffect(() => {
    if (gameState === 'gameover' && isSignedIn && totalPoints > 0 && !scoreSubmitted) {
      submitScoreGlobal(totalPoints);
    }
  }, [gameState, isSignedIn, totalPoints, scoreSubmitted, submitScoreGlobal]);

  return (
    <div className="pong-container" ref={containerRef}>
      {gameState === 'playing' && (
        <div className="pong-layout">
          <div className="stats-panel">
            <div className="stat-item">
              <span className="stat-label">You</span>
              <span className="stat-value">{playerScore}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">AI</span>
              <span className="stat-value">{aiScore}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Points</span>
              <span className="stat-value">{totalPoints}</span>
            </div>
            {rally >= 3 && (
              <div className="stat-item rally-stat">
                <span className="stat-label">Rally</span>
                <span className="stat-value">{rally}x</span>
              </div>
            )}
          </div>

          <div className={`lightbox-wrapper ${showScreenShake ? 'screen-shake' : ''}`}>
            <EffectsLayer />
            <div ref={gameAreaRef} className="pong-area">
              <div className="paddle player-paddle" style={{ top: playerY }} />
              <div className="paddle ai-paddle" style={{ top: aiY }} />
              <div className="ball" style={{ left: ballX, top: ballY }}>🍊</div>
              <div className="center-line" />
            </div>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="game-over-screen">
          <div className="game-over-left">
            {sadImage ? (
              <img src={sadImage} alt="Game Over" className="sad-image-large" />
            ) : (
              <div className="game-over-emoji">🏆</div>
            )}
          </div>
          <div className="game-over-right">
            <div className="game-over-title">
              {playerScore >= WIN_SCORE ? 'You Win!' : 'Game Over'}
            </div>
            <div className="game-over-score">
              <span className="game-over-score-value">{totalPoints}</span>
              <span className="game-over-score-label">points</span>
            </div>
            <div className="game-over-stats">
              <span>Final: {playerScore} - {aiScore}</span>
            </div>

            {(isNewPersonalBest || totalPoints > highScore) && totalPoints > 0 && (
              <div className="game-over-record">🌟 New Personal Best! 🌟</div>
            )}

            {totalPoints > 0 ? (
              isSignedIn ? (
                <div className="game-over-form">
                  <div className="game-over-submitted">
                    {isSubmitting ? 'Saving...' : scoreSubmitted ? `Saved as ${userDisplayName}!` : null}
                  </div>
                  <div className="game-over-buttons">
                    <button onClick={startGame} className="play-btn">Play Again</button>
                    <button onClick={() => setShowLeaderboardPanel(!showLeaderboardPanel)} className="play-btn">
                      Leaderboard
                    </button>
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
                    <button onClick={saveScoreLocal} className="game-over-save" disabled={!playerName.trim()}>
                      Save
                    </button>
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

          {showLeaderboardPanel && (
            <div className="leaderboard-slide-panel open">
              <div className="leaderboard-panel-header">
                <h3>Leaderboard</h3>
                <button onClick={() => setShowLeaderboardPanel(false)}>×</button>
              </div>
              <div className="leaderboard-panel-list">
                {displayLeaderboard.slice(0, 10).map((entry, i) => (
                  <div key={i} className="leaderboard-panel-entry">
                    <span>#{i + 1}</span>
                    <span>{entry.name}</span>
                    <span>{entry.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const OrangePong: React.FC = () => (
  <GameShell gameId={ORANGE_PONG_CONFIG.id}>
    <OrangePongGame />
  </GameShell>
);

export default OrangePong;
