/**
 * Orange Juggle - Migrated to Shared Systems
 *
 * For the initial migration, this file re-exports the original game
 * wrapped with GameShell for effects. Full migration can be done later.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAudio } from '@/contexts/AudioContext';
import { useLeaderboard } from '@/hooks/data/useLeaderboard';
import { GameShell } from '@/systems/game-ui';
import { useEffects, EffectsLayer } from '@/systems/effects';
import {
  ORANGE_JUGGLE_CONFIG,
  PADDLE_SIZE,
  PADDLE_COLLISION_RADIUS,
  ORANGE_SIZE,
  POWERUP_SIZE,
  HIT_VELOCITY,
  COMBO_DECAY_TIME,
  LEVEL_CONFIG,
  CAMEL_SPAWN_INTERVAL,
} from './config';
import './OrangeJuggle.game.css';

const JUGGLE_SPRITE = '/assets/Games/games_media/juggle.webp';
const SAD_IMAGES = [
  '/assets/Games/games_media/sad_1.webp',
  '/assets/Games/games_media/sad_2.webp',
  '/assets/Games/games_media/sad_3.webp',
  '/assets/Games/games_media/sad_4.webp',
  '/assets/Games/games_media/sad_5.webp',
];

// Sound effect for bouncing
interface WindowWithWebkit extends Window {
  webkitAudioContext?: typeof AudioContext;
}

const createBounceSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as WindowWithWebkit).webkitAudioContext!)();
    return () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    };
  } catch {
    return () => {};
  }
};

interface GameObject {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'orange' | 'golden' | 'banana' | 'rum' | 'camel';
  wasHit: boolean;
  bounceCount?: number;
  pattern?: string;
}

interface LocalLeaderboardEntry {
  name: string;
  score: number;
  level: number;
  date: string;
}

type GameState = 'menu' | 'playing' | 'levelComplete' | 'saveScore';

const OrangeJuggleGame: React.FC = () => {
  const effects = useEffects();
  const { isSoundEffectsEnabled } = useAudio();

  const {
    submitScore,
    isSignedIn,
    userDisplayName,
    isSubmitting,
  } = useLeaderboard(ORANGE_JUGGLE_CONFIG.leaderboardId || 'orange-juggle');

  const [gameState, setGameState] = useState<GameState>('menu');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [orangutanBounce, setOrangutanBounce] = useState(false);
  const [lostByCamel, setLostByCamel] = useState(false);
  const [sadImage, setSadImage] = useState('');

  const bounceSoundRef = useRef<(() => void) | null>(null);

  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('orangeJuggleHighScore') || '0', 10);
  });
  const [localLeaderboard, setLocalLeaderboard] = useState<LocalLeaderboardEntry[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('orangeJuggleLeaderboard') || '[]');
    } catch {
      return [];
    }
  });
  const [playerName, setPlayerName] = useState('');
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [isNewPersonalBest, setIsNewPersonalBest] = useState(false);

  const [objects, setObjects] = useState<GameObject[]>([]);
  const [paddleX, setPaddleX] = useState(0);
  const [paddleY, setPaddleY] = useState(0);

  const [speedModifier, setSpeedModifier] = useState(1);
  const [, setActivePowerup] = useState<'banana' | 'rum' | null>(null);
  const [isReversed, setIsReversed] = useState(false);
  const [, setRumCount] = useState(0);
  const [, setBananaCount] = useState(0);

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const objectIdRef = useRef(0);
  const lastHitTimeRef = useRef(0);
  const paddleRef = useRef({ x: 0, y: 0 });
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const objectsRef = useRef<GameObject[]>([]);
  const speedModifierRef = useRef(1);
  const rumCountRef = useRef(0);
  const bananaCountRef = useRef(0);
  const isReversedRef = useRef(false);
  const nextPowerupSpawnRef = useRef(0);
  const nextCamelSpawnRef = useRef(0);
  const startGameRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    bounceSoundRef.current = createBounceSound();
  }, []);

  useEffect(() => {
    if (gameState === 'menu') {
      queueMicrotask(() => startGameRef.current?.());
    }
  }, [gameState]);

  const startLevel = (lvl: number) => {
    const config = LEVEL_CONFIG[lvl as keyof typeof LEVEL_CONFIG] || LEVEL_CONFIG[5];

    setTimeLeft(config.time);
    setObjects([]);
    objectsRef.current = [];
    objectIdRef.current = 0;
    setCombo(0);
    comboRef.current = 0;
    lastHitTimeRef.current = Date.now();

    setSpeedModifier(1);
    speedModifierRef.current = 1;
    setRumCount(0);
    rumCountRef.current = 0;
    setBananaCount(0);
    bananaCountRef.current = 0;
    setIsReversed(false);
    isReversedRef.current = false;
    setActivePowerup(null);

    nextPowerupSpawnRef.current = Date.now() + 3000 + Math.random() * 2000;
    nextCamelSpawnRef.current = Date.now() + CAMEL_SPAWN_INTERVAL + Math.random() * 1000;

    const areaWidth = gameAreaRef.current?.clientWidth || 400;
    const areaHeight = gameAreaRef.current?.clientHeight || 600;

    const initialOranges: GameObject[] = [];
    for (let i = 0; i < config.oranges; i++) {
      initialOranges.push({
        id: objectIdRef.current++,
        x: areaWidth * 0.3 + i * (areaWidth * 0.4 / config.oranges),
        y: areaHeight * 0.3 - i * 50,
        vx: (Math.random() - 0.5) * 2,
        vy: 0,
        type: 'orange',
        wasHit: false,
      });
    }
    setObjects(initialOranges);
    objectsRef.current = initialOranges;

    setPaddleX(areaWidth / 2);
    setPaddleY(areaHeight - PADDLE_SIZE / 2 - 20);
    paddleRef.current = { x: areaWidth / 2, y: areaHeight - PADDLE_SIZE / 2 - 20 };

    setGameState('playing');
  };

  const startGame = () => {
    setLevel(1);
    setScore(0);
    scoreRef.current = 0;
    setCombo(0);
    comboRef.current = 0;
    setScoreSubmitted(false);
    setIsNewPersonalBest(false);
    setLostByCamel(false);
    startLevel(1);
  };

  // Keep ref in sync
  useEffect(() => {
    startGameRef.current = startGame;
  });

  const completeLevel = () => {
    setGameState('levelComplete');

    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('orangeJuggleHighScore', String(score));
    }
  };

  const nextLevel = () => {
    const newLevel = Math.min(level + 1, 5);
    setLevel(newLevel);
    startLevel(newLevel);
  };

  const gameOver = (byCamel: boolean = false) => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    setLostByCamel(byCamel);
    if (byCamel) {
      setSadImage(SAD_IMAGES[Math.floor(Math.random() * SAD_IMAGES.length)]);
    }
    setGameState('saveScore');

    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('orangeJuggleHighScore', String(score));
    }
  };

  const saveScore = () => {
    if (!playerName.trim()) return;

    const entry: LocalLeaderboardEntry = {
      name: playerName.trim(),
      score,
      level,
      date: new Date().toISOString().split('T')[0],
    };

    const updated = [...localLeaderboard, entry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    setLocalLeaderboard(updated);
    localStorage.setItem('orangeJuggleLeaderboard', JSON.stringify(updated));
    setPlayerName('');
    setGameState('menu');
  };

  const submitScoreGlobal = useCallback(async () => {
    if (!isSignedIn || scoreSubmitted || score === 0) return;

    setScoreSubmitted(true);
    const result = await submitScore(score, level, {});

    if (result.success && result.isNewHighScore) {
      setIsNewPersonalBest(true);
    }
  }, [isSignedIn, scoreSubmitted, score, level, submitScore]);

  // Auto-submit for signed-in users
  useEffect(() => {
    if (gameState === 'saveScore' && isSignedIn && score > 0 && !scoreSubmitted) {
      queueMicrotask(() => submitScoreGlobal());
    }
  }, [gameState, isSignedIn, score, scoreSubmitted, submitScoreGlobal]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const config = LEVEL_CONFIG[level as keyof typeof LEVEL_CONFIG] || LEVEL_CONFIG[5];
    const areaWidth = gameAreaRef.current?.clientWidth || 400;
    const areaHeight = gameAreaRef.current?.clientHeight || 600;

    const gameLoop = () => {
      const now = Date.now();
      const currentObjects = [...objectsRef.current];
      const paddle = paddleRef.current;
      let newScore = scoreRef.current;
      let newCombo = comboRef.current;

      // Update objects
      for (const obj of currentObjects) {
        if (obj.type === 'orange' || obj.type === 'golden') {
          obj.vy += config.gravity * speedModifierRef.current;
          obj.x += obj.vx * speedModifierRef.current;
          obj.y += obj.vy * speedModifierRef.current;

          // Wall bounce
          if (obj.x < ORANGE_SIZE / 2) {
            obj.x = ORANGE_SIZE / 2;
            obj.vx = Math.abs(obj.vx) * 0.8;
          }
          if (obj.x > areaWidth - ORANGE_SIZE / 2) {
            obj.x = areaWidth - ORANGE_SIZE / 2;
            obj.vx = -Math.abs(obj.vx) * 0.8;
          }

          // Paddle collision
          const dx = obj.x - paddle.x;
          const dy = obj.y - paddle.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < PADDLE_COLLISION_RADIUS + ORANGE_SIZE / 2 && obj.vy > 0) {
            obj.vy = HIT_VELOCITY;
            obj.vx += (dx / dist) * 2;
            obj.wasHit = true;
            lastHitTimeRef.current = now;

            // Score
            const comboBonus = Math.floor(newCombo * 0.5);
            const points = 10 + comboBonus;
            newScore += points;
            newCombo++;

            if (isSoundEffectsEnabled && bounceSoundRef.current) {
              bounceSoundRef.current();
            }

            setOrangutanBounce(true);
            setTimeout(() => setOrangutanBounce(false), 150);

            effects.trigger({ type: 'shockwave', intensity: 'normal' });
            effects.trigger({ type: 'scorePopup', data: { score: points } });

            if (newCombo >= 5 && newCombo % 5 === 0) {
              effects.trigger({ type: 'comboText', data: { combo: newCombo } });
            }
          }

          // Missed orange
          if (obj.y > areaHeight + ORANGE_SIZE && obj.wasHit) {
            gameOver(false);
            return;
          }
        }
      }

      // Combo decay
      if (now - lastHitTimeRef.current > COMBO_DECAY_TIME) {
        newCombo = Math.max(0, newCombo - 1);
      }

      scoreRef.current = newScore;
      comboRef.current = newCombo;
      setScore(newScore);
      setCombo(newCombo);
      objectsRef.current = currentObjects;
      setObjects([...currentObjects]);

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [gameState, level, isSoundEffectsEnabled, effects]);

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return;

    const config = LEVEL_CONFIG[level as keyof typeof LEVEL_CONFIG] || LEVEL_CONFIG[5];

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (score >= config.targetScore || level === 5) {
            completeLevel();
          } else {
            gameOver(false);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, level, score]);

  // Mouse/touch controls
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameArea = gameAreaRef.current;
    if (!gameArea) return;

    const handleMove = (clientX: number, clientY: number) => {
      const rect = gameArea.getBoundingClientRect();
      let x = clientX - rect.left;
      let y = clientY - rect.top;

      if (isReversedRef.current) {
        x = rect.width - x;
      }

      x = Math.max(PADDLE_SIZE / 2, Math.min(x, rect.width - PADDLE_SIZE / 2));
      y = Math.max(PADDLE_SIZE / 2, Math.min(y, rect.height - PADDLE_SIZE / 2));

      paddleRef.current = { x, y };
      setPaddleX(x);
      setPaddleY(y);
    };

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    gameArea.addEventListener('mousemove', handleMouseMove);
    gameArea.addEventListener('touchmove', handleTouchMove, { passive: false });
    gameArea.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });

    return () => {
      gameArea.removeEventListener('mousemove', handleMouseMove);
      gameArea.removeEventListener('touchmove', handleTouchMove);
    };
  }, [gameState]);

  return (
    <div className="juggle-container">
      <EffectsLayer />

      {gameState === 'playing' && (
        <>
          <div className="juggle-stats">
            <div className="stat-item">
              <span className="stat-label">Level</span>
              <span className="stat-value">{level}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Score</span>
              <span className="stat-value">{score}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Time</span>
              <span className="stat-value">{timeLeft}s</span>
            </div>
            {combo >= 3 && (
              <div className="stat-item combo-stat">
                <span className="stat-label">Combo</span>
                <span className="stat-value">{combo}x</span>
              </div>
            )}
          </div>

          <div ref={gameAreaRef} className="juggle-area">
            {/* Orangutan paddle */}
            <div
              className={`orangutan ${orangutanBounce ? 'bounce' : ''}`}
              style={{
                left: paddleX,
                top: paddleY,
                width: PADDLE_SIZE,
                height: PADDLE_SIZE,
              }}
            >
              <img src={JUGGLE_SPRITE} alt="Orangutan" />
            </div>

            {/* Game objects */}
            {objects.map(obj => (
              <div
                key={obj.id}
                className={`game-object ${obj.type}`}
                style={{
                  left: obj.x,
                  top: obj.y,
                  width: obj.type === 'orange' || obj.type === 'golden' ? ORANGE_SIZE : POWERUP_SIZE,
                  height: obj.type === 'orange' || obj.type === 'golden' ? ORANGE_SIZE : POWERUP_SIZE,
                }}
              >
                {obj.type === 'orange' && '🍊'}
                {obj.type === 'golden' && '✨'}
                {obj.type === 'banana' && '🍌'}
                {obj.type === 'rum' && '🍺'}
                {obj.type === 'camel' && '🐫'}
              </div>
            ))}

            {/* Power-up indicators */}
            {isReversed && <div className="powerup-indicator reversed">⚠️ REVERSED!</div>}
            {speedModifier > 1 && <div className="powerup-indicator fast">🍌 FAST!</div>}
          </div>
        </>
      )}

      {gameState === 'levelComplete' && (
        <div className="game-over-screen">
          <div className="game-over-content">
            <div className="game-over-title">Level {level} Complete!</div>
            <div className="game-over-score">
              <span className="game-over-score-value">{score}</span>
              <span className="game-over-score-label">points</span>
            </div>
            {level < 5 ? (
              <button onClick={nextLevel} className="play-btn">Next Level →</button>
            ) : (
              <>
                <div className="game-over-reason">You beat all levels!</div>
                <button onClick={() => setGameState('saveScore')} className="play-btn">Save Score</button>
              </>
            )}
          </div>
        </div>
      )}

      {gameState === 'saveScore' && (
        <div className="game-over-screen">
          <div className="game-over-left">
            {lostByCamel && sadImage && <img src={sadImage} alt="Game Over" className="sad-image-large" />}
          </div>
          <div className="game-over-right">
            <div className="game-over-title">{lostByCamel ? 'Hit by Camel!' : 'Game Over'}</div>
            <div className="game-over-score">
              <span className="game-over-score-value">{score}</span>
              <span className="game-over-score-label">points</span>
            </div>
            <div className="game-over-stats">Level {level}</div>

            {(isNewPersonalBest || score > highScore) && score > 0 && (
              <div className="game-over-record">🌟 New Personal Best! 🌟</div>
            )}

            {score > 0 ? (
              isSignedIn ? (
                <div className="game-over-form">
                  <div className="game-over-submitted">
                    {isSubmitting ? 'Saving...' : scoreSubmitted ? `Saved as ${userDisplayName}!` : null}
                  </div>
                  <div className="game-over-buttons">
                    <button onClick={() => startGame()} className="play-btn">Play Again</button>
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
                    <button onClick={saveScore} className="game-over-save" disabled={!playerName.trim()}>Save</button>
                    <button onClick={() => startGame()} className="game-over-skip">Play Again</button>
                  </div>
                </div>
              )
            ) : (
              <div className="game-over-buttons-single">
                <button onClick={() => startGame()} className="play-btn">Play Again</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const OrangeJuggle: React.FC = () => (
  <GameShell gameId={ORANGE_JUGGLE_CONFIG.id}>
    <OrangeJuggleGame />
  </GameShell>
);

export default OrangeJuggle;
