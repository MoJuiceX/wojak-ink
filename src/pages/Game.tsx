import { useState, useEffect, useCallback, useRef } from 'react';
import { Info, X } from 'lucide-react';
import { useLeaderboard } from '@/hooks/data/useLeaderboard';
import { useAudio } from '@/contexts/AudioContext';
import { ArcadeGameOverScreen } from '@/components/media/games/ArcadeGameOverScreen';
import './Game.css';

type FruitType = 'orange' | 'camel' | 'golden';

interface Orange {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  velocityX: number; // For thrown effect
  type: FruitType;
}

interface SlicedHalf {
  id: number;
  x: number;
  y: number;
  size: number;
  velocityX: number;
  velocityY: number;
  rotation: number;
  rotationSpeed: number;
  isLeft: boolean;
  type: FruitType;
}

interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

interface LocalLeaderboardEntry {
  name: string;
  score: number;
  level: number;
  date: string;
}

const LEVEL_DURATION = 30;
const GRAVITY = 0.3;
const TRAIL_FADE_SPEED = 3;

// Level configurations
const LEVEL_CONFIG = {
  1: { spawnInterval: 900, camelChance: 0, goldenChance: 0 },
  2: { spawnInterval: 800, camelChance: 0.25, goldenChance: 0 },
  3: { spawnInterval: 600, camelChance: 0.2, goldenChance: 0.15 },
};

const Game: React.FC = () => {
  // Global leaderboard hook
  const {
    leaderboard: globalLeaderboard,
    submitScore,
    isSignedIn,
    userDisplayName,
    isSubmitting,
  } = useLeaderboard('orange-slice');

  // Background music controls
  const { isBackgroundMusicPlaying, playBackgroundMusic, pauseBackgroundMusic } = useAudio();

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'levelComplete' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('orangeSliceHighScore') || '0', 10);
  });
  const localLeaderboard = (() => {
    try {
      return JSON.parse(localStorage.getItem('orangeSliceLeaderboard') || '[]') as LocalLeaderboardEntry[];
    } catch {
      return [] as LocalLeaderboardEntry[];
    }
  })();
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(LEVEL_DURATION);
  const [oranges, setOranges] = useState<Orange[]>([]);
  const [slicedHalves, setSlicedHalves] = useState<SlicedHalf[]>([]);
  const [combo, setCombo] = useState(0);
  const [lastSliceTime, setLastSliceTime] = useState(0);
  const [showPenalty, setShowPenalty] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [isNewPersonalBest, setIsNewPersonalBest] = useState(false);

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orangeIdRef = useRef(0);
  const sliceIdRef = useRef(0);
  const animationRef = useRef<number | undefined>(undefined);
  const trailRef = useRef<TrailPoint[]>([]);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const isTouchingRef = useRef(false);
  const [showInfo, setShowInfo] = useState(false);

  // Start game from level 1
  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setLevel(1);
    setTimeLeft(LEVEL_DURATION);
    setOranges([]);
    setSlicedHalves([]);
    setCombo(0);
    setShowPenalty(false);
    setScoreSubmitted(false);
    setIsNewPersonalBest(false);
    orangeIdRef.current = 0;
    sliceIdRef.current = 0;
    trailRef.current = [];
  };

  // Continue to next level
  const nextLevel = () => {
    const newLevel = Math.min(level + 1, 3) as 1 | 2 | 3;
    setLevel(newLevel);
    setTimeLeft(LEVEL_DURATION);
    setOranges([]);
    setSlicedHalves([]);
    setCombo(0);
    setShowPenalty(false);
    trailRef.current = [];
    setGameState('playing');
  };

  // Spawn new orange (thrown up from bottom)
  const spawnOrange = useCallback(() => {
    if (!gameAreaRef.current) return;

    const width = gameAreaRef.current.offsetWidth;
    const height = gameAreaRef.current.offsetHeight;
    const size = 55 + Math.random() * 25;

    // Spawn from bottom, throw upward
    const x = 50 + Math.random() * (width - 100);
    const velocityX = (Math.random() - 0.5) * 6;
    const speed = -(14 + Math.random() * 5); // Negative = upward

    // Determine fruit type based on level
    const config = LEVEL_CONFIG[level as 1 | 2 | 3];
    const rand = Math.random();
    let type: FruitType = 'orange';
    if (rand < config.goldenChance) {
      type = 'golden';
    } else if (rand < config.goldenChance + config.camelChance) {
      type = 'camel';
    }

    const newOrange: Orange = {
      id: orangeIdRef.current++,
      x,
      y: height + size,
      size,
      speed,
      velocityX,
      type,
    };

    setOranges(prev => [...prev, newOrange]);
  }, [level]);

  // Check if a line segment intersects a circle
  const lineIntersectsCircle = (
    x1: number, y1: number,
    x2: number, y2: number,
    cx: number, cy: number,
    r: number
  ): boolean => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const fx = x1 - cx;
    const fy = y1 - cy;

    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - r * r;

    let discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return false;

    discriminant = Math.sqrt(discriminant);
    const t1 = (-b - discriminant) / (2 * a);
    const t2 = (-b + discriminant) / (2 * a);

    return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
  };

  // Handle slice collision
  const checkSliceCollision = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    const slicedOranges: Orange[] = [];

    oranges.forEach(orange => {
      const centerX = orange.x + orange.size / 2;
      const centerY = orange.y + orange.size / 2;
      const radius = orange.size / 2 - 5;

      if (lineIntersectsCircle(x1, y1, x2, y2, centerX, centerY, radius)) {
        slicedOranges.push(orange);
      }
    });

    if (slicedOranges.length > 0) {
      const now = Date.now();
      const timeSinceLastSlice = now - lastSliceTime;

      // Combo system (only for non-camels)
      const goodSlices = slicedOranges.filter(o => o.type !== 'camel');
      let newCombo = combo;
      if (goodSlices.length > 0) {
        if (timeSinceLastSlice < 800) {
          newCombo = Math.min(combo + goodSlices.length, 10);
        } else {
          newCombo = goodSlices.length;
        }
        setCombo(newCombo);
        setLastSliceTime(now);
      }

      // Calculate slice angle
      const sliceAngle = Math.atan2(y2 - y1, x2 - x1);

      // Create sliced halves
      const newHalves: SlicedHalf[] = [];

      slicedOranges.forEach(orange => {
        const centerX = orange.x + orange.size / 2;
        const centerY = orange.y + orange.size / 2;

        // Create two halves that fly apart perpendicular to slice
        const perpAngle = sliceAngle + Math.PI / 2;
        const flySpeed = 4 + Math.random() * 2;

        // Left half
        newHalves.push({
          id: sliceIdRef.current++,
          x: centerX,
          y: centerY,
          size: orange.size,
          velocityX: Math.cos(perpAngle) * flySpeed + orange.velocityX,
          velocityY: Math.sin(perpAngle) * flySpeed + orange.speed,
          rotation: 0,
          rotationSpeed: -10 - Math.random() * 10,
          isLeft: true,
          type: orange.type,
        });

        // Right half
        newHalves.push({
          id: sliceIdRef.current++,
          x: centerX,
          y: centerY,
          size: orange.size,
          velocityX: -Math.cos(perpAngle) * flySpeed + orange.velocityX,
          velocityY: -Math.sin(perpAngle) * flySpeed + orange.speed,
          rotation: 0,
          rotationSpeed: 10 + Math.random() * 10,
          isLeft: false,
          type: orange.type,
        });
      });

      setSlicedHalves(prev => [...prev, ...newHalves]);
      setOranges(prev => prev.filter(o => !slicedOranges.map(s => s.id).includes(o.id)));

      // Calculate score based on fruit types
      let points = 0;
      slicedOranges.forEach(orange => {
        if (orange.type === 'orange') {
          points += 10 * newCombo;
        } else if (orange.type === 'golden') {
          points += 30 * newCombo; // 3x points for golden
        } else if (orange.type === 'camel') {
          points -= 50; // Penalty for camel
          setShowPenalty(true);
          setTimeout(() => setShowPenalty(false), 500);
        }
      });

      setScore(prev => Math.max(0, prev + points));
    }
  }, [oranges, combo, lastSliceTime]);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (gameState !== 'playing') return;
    e.preventDefault();

    const touch = e.touches[0];
    const rect = gameAreaRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    lastTouchRef.current = { x, y };
    isTouchingRef.current = true;
    trailRef.current = [{ x, y, age: 0 }];
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (gameState !== 'playing' || !isTouchingRef.current) return;
    e.preventDefault();

    const touch = e.touches[0];
    const rect = gameAreaRef.current?.getBoundingClientRect();
    if (!rect || !lastTouchRef.current) return;

    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    // Check for slice collision
    checkSliceCollision(lastTouchRef.current.x, lastTouchRef.current.y, x, y);

    // Add to trail
    trailRef.current.push({ x, y, age: 0 });
    if (trailRef.current.length > 20) {
      trailRef.current.shift();
    }

    lastTouchRef.current = { x, y };
  };

  const handleTouchEnd = () => {
    isTouchingRef.current = false;
    lastTouchRef.current = null;
  };

  // Mouse handlers for desktop testing
  const handleMouseDown = (e: React.MouseEvent) => {
    if (gameState !== 'playing') return;

    const rect = gameAreaRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    lastTouchRef.current = { x, y };
    isTouchingRef.current = true;
    trailRef.current = [{ x, y, age: 0 }];
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (gameState !== 'playing' || !isTouchingRef.current) return;

    const rect = gameAreaRef.current?.getBoundingClientRect();
    if (!rect || !lastTouchRef.current) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    checkSliceCollision(lastTouchRef.current.x, lastTouchRef.current.y, x, y);

    trailRef.current.push({ x, y, age: 0 });
    if (trailRef.current.length > 20) {
      trailRef.current.shift();
    }

    lastTouchRef.current = { x, y };
  };

  const handleMouseUp = () => {
    isTouchingRef.current = false;
    lastTouchRef.current = null;
  };

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = () => {
      const height = gameAreaRef.current?.offsetHeight || 600;
      const width = gameAreaRef.current?.offsetWidth || 400;

      // Update oranges (gravity physics with wall bouncing)
      setOranges(prev => {
        return prev
          .map(o => {
            let newX = o.x + o.velocityX;
            let newY = o.y + o.speed;
            let newVelocityX = o.velocityX;
            let newSpeed = o.speed + GRAVITY;

            // Bounce off left wall
            if (newX < 0) {
              newX = 0;
              newVelocityX = Math.abs(newVelocityX) * 0.8;
            }
            // Bounce off right wall
            if (newX + o.size > width) {
              newX = width - o.size;
              newVelocityX = -Math.abs(newVelocityX) * 0.8;
            }
            // Bounce off top
            if (newY < 0) {
              newY = 0;
              newSpeed = Math.abs(newSpeed) * 0.8;
            }

            return {
              ...o,
              x: newX,
              y: newY,
              velocityX: newVelocityX,
              speed: newSpeed,
            };
          })
          .filter(o => o.y < height + o.size);
      });

      // Update sliced halves
      setSlicedHalves(prev => {
        return prev
          .map(h => ({
            ...h,
            x: h.x + h.velocityX,
            y: h.y + h.velocityY,
            velocityY: h.velocityY + GRAVITY,
            rotation: h.rotation + h.rotationSpeed,
          }))
          .filter(h => h.y < height + 100);
      });

      // Age trail points
      trailRef.current = trailRef.current
        .map(p => ({ ...p, age: p.age + TRAIL_FADE_SPEED }))
        .filter(p => p.age < 100);

      // Draw trail on canvas
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        canvas.width = width;
        canvas.height = height;
        ctx.clearRect(0, 0, width, height);

        if (trailRef.current.length > 1) {
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          for (let i = 1; i < trailRef.current.length; i++) {
            const p1 = trailRef.current[i - 1];
            const p2 = trailRef.current[i];
            const alpha = Math.max(0, 1 - p2.age / 100);
            const lineWidth = Math.max(2, 8 * alpha);

            // Glow effect
            ctx.shadowColor = '#ff8c00';
            ctx.shadowBlur = 15 * alpha;

            // Main line
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = lineWidth;
            ctx.stroke();

            // Inner bright line
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(255, 200, 100, ${alpha * 0.8})`;
            ctx.lineWidth = lineWidth * 0.5;
            ctx.shadowBlur = 0;
            ctx.stroke();
          }
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
  }, [gameState]);

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (level < 3) {
            setGameState('levelComplete');
          } else {
            setGameState('gameover');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, level]);

  // Spawn oranges
  useEffect(() => {
    if (gameState !== 'playing') return;

    const config = LEVEL_CONFIG[level as 1 | 2 | 3];
    const spawner = setInterval(() => {
      spawnOrange();
    }, config.spawnInterval);

    // Spawn initial orange
    spawnOrange();

    return () => clearInterval(spawner);
  }, [gameState, level, spawnOrange]);

  // Update high score
  useEffect(() => {
    if ((gameState === 'gameover' || gameState === 'levelComplete') && score > highScore) {
      queueMicrotask(() => setHighScore(score));
      localStorage.setItem('orangeSliceHighScore', String(score));
    }
  }, [gameState, score, highScore]);

  // Submit score to global leaderboard (for signed-in users)
  const submitScoreGlobal = useCallback(
    async (finalScore: number, finalLevel: number) => {
      if (!isSignedIn || scoreSubmitted || finalScore === 0) return;
      setScoreSubmitted(true);
      const result = await submitScore(finalScore, finalLevel, {
        completed: finalLevel >= 3,
      });
      if (result.success) {
        if (result.isNewHighScore) {
          setIsNewPersonalBest(true);
        }
      }
    },
    [isSignedIn, scoreSubmitted, submitScore]
  );

  // Display leaderboard: prefer global, fallback to local
  const displayLeaderboard =
    globalLeaderboard.length > 0
      ? globalLeaderboard.map((entry) => ({
          name: entry.displayName,
          score: entry.score,
          level: entry.level,
          date: entry.createdAt,
        }))
      : localLeaderboard;

  // Auto-submit score for signed-in users when game ends
  useEffect(() => {
    if (gameState === 'gameover' && isSignedIn && score > 0 && !scoreSubmitted) {
      queueMicrotask(() => submitScoreGlobal(score, level));
    }
  }, [gameState, isSignedIn, score, level, scoreSubmitted, submitScoreGlobal]);

  return (
    <div className="game-page">
      <header className="game-header">
        <div className="game-toolbar">
          <button className="btn btn-ghost" onClick={() => setShowInfo(true)}>
            <Info size={20} />
          </button>
          <h1 className="game-header-title">Orange Slice</h1>
        </div>
      </header>
      <div className="game-content">
        {/* Score HUD */}
        {gameState === 'playing' && (
          <div className="game-hud">
            <div className="hud-item">
              <span className="hud-label">Level</span>
              <span className="hud-value">{level}</span>
            </div>
            <div className="hud-item">
              <span className="hud-label">Time</span>
              <span className="hud-value">{timeLeft}s</span>
            </div>
            <div className="hud-item combo">
              {combo > 1 && <span className="combo-text">x{combo}</span>}
              {showPenalty && <span className="penalty-text">-50!</span>}
            </div>
            <div className="hud-item">
              <span className="hud-label">Score</span>
              <span className="hud-value">{score}</span>
            </div>
            {/* Music toggle */}
            <button
              className="music-toggle-btn"
              onClick={() => isBackgroundMusicPlaying ? pauseBackgroundMusic() : playBackgroundMusic()}
            >
              {isBackgroundMusicPlaying ? '🔊' : '🔇'}
            </button>
          </div>
        )}

        {/* Game Area */}
        <div
          ref={gameAreaRef}
          className="game-area"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Slice trail canvas */}
          <canvas ref={canvasRef} className="slice-canvas" />

          {gameState === 'idle' && (
            <div className="game-menu game-menu-split">
              <div className="menu-left">
                <div className="game-title">Orange Slice</div>
                <div className="game-emoji">&#x1F34A;</div>
                <p className="game-desc">Swipe to slice oranges!</p>
                <p className="game-desc">Build combos for bonus!</p>
                {highScore > 0 && (
                  <p className="high-score">High Score: {highScore}</p>
                )}
                <button onClick={startGame} className="btn btn-primary play-btn">
                  Play
                </button>
              </div>
              <div className="menu-right">
                <div className="leaderboard">
                  <h3 className="leaderboard-title">
                    {globalLeaderboard.length > 0 ? 'Global Leaderboard' : 'Leaderboard'}
                  </h3>
                  <div className="leaderboard-list">
                    {Array.from({ length: 10 }, (_, index) => {
                      const entry = displayLeaderboard[index];
                      return (
                        <div key={index} className="leaderboard-entry">
                          <span className="leaderboard-rank">#{index + 1}</span>
                          <span className="leaderboard-name">{entry?.name || '---'}</span>
                          <span className="leaderboard-score">{entry?.score || '-'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {gameState === 'levelComplete' && (
            <div className="game-menu">
              <div className="game-title">Level {level} Complete!</div>
              <div className="final-score">
                <span className="score-label">Score</span>
                <span className="score-value">{score}</span>
              </div>
              <div className="level-preview">
                <span className="level-next">Level {level + 1}</span>
                {level === 1 && (
                  <p className="level-hint">Watch out for camels! &#x1F42B; (-50 pts)</p>
                )}
                {level === 2 && (
                  <p className="level-hint">Golden oranges! &#x1F31F; (3x points)</p>
                )}
              </div>
              <button onClick={nextLevel} className="btn btn-primary play-btn">
                Next Level
              </button>
            </div>
          )}

          {gameState === 'gameover' && (
            <ArcadeGameOverScreen
              score={score}
              highScore={highScore}
              scoreLabel="points"
              isNewPersonalBest={isNewPersonalBest || (score >= highScore && score > 0)}
              isSignedIn={isSignedIn}
              isSubmitting={isSubmitting}
              scoreSubmitted={scoreSubmitted}
              userDisplayName={userDisplayName ?? undefined}
              leaderboard={globalLeaderboard}
              onPlayAgain={startGame}
              title="Game Complete!"
              accentColor="#ff6b00"
            />
          )}

          {gameState === 'playing' && (
            <>
              {/* Whole fruits */}
              {oranges.map(orange => (
                <div
                  key={orange.id}
                  className={`orange ${orange.type}`}
                  style={{
                    left: orange.x,
                    top: orange.y,
                    width: orange.size,
                    height: orange.size,
                  }}
                >
                  {orange.type === 'orange' && <>&#x1F34A;</>}
                  {orange.type === 'camel' && <>&#x1F42B;</>}
                  {orange.type === 'golden' && <>&#x1F31F;</>}
                </div>
              ))}

              {/* Sliced halves */}
              {slicedHalves.map(half => (
                <div
                  key={half.id}
                  className={`orange-half ${half.isLeft ? 'left' : 'right'} ${half.type}`}
                  style={{
                    left: half.x - half.size / 2,
                    top: half.y - half.size / 2,
                    width: half.size,
                    height: half.size,
                    transform: `rotate(${half.rotation}deg)`,
                  }}
                >
                  {half.type === 'orange' && <>&#x1F34A;</>}
                  {half.type === 'camel' && <>&#x1F42B;</>}
                  {half.type === 'golden' && <>&#x1F31F;</>}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Info Modal */}
        {showInfo && (
          <div className="info-overlay" onClick={() => setShowInfo(false)}>
            <div className="info-modal" onClick={(e) => e.stopPropagation()}>
              <button className="info-close" onClick={() => setShowInfo(false)}>
                <X size={24} />
              </button>
              <h2>How to Play</h2>
              <div className="info-content">
                <p><strong>Goal:</strong> Swipe to slice fruits and score points!</p>
                <p><strong>Controls:</strong> Drag your finger across fruits to slice them.</p>
                <p><strong>Fruits:</strong></p>
                <ul>
                  <li>🍊 Orange: +10 points × combo</li>
                  <li>🌟 Golden: +30 points × combo</li>
                  <li>🐫 Camel: -50 points (avoid!)</li>
                </ul>
                <p><strong>Tips:</strong> Slice multiple fruits quickly for combo bonuses!</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Game;
