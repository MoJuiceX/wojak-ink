/**
 * Memory Match - Migrated to Shared Systems
 *
 * Uses shared effects system and game UI components.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameSounds } from '@/hooks/useGameSounds';
import { useLeaderboard } from '@/hooks/data/useLeaderboard';
import { useAudio } from '@/contexts/AudioContext';
import { GameShell } from '@/systems/game-ui';
import { useEffects, EffectsLayer } from '@/systems/effects';
import {
  MEMORY_MATCH_CONFIG,
  SAD_IMAGES,
  GRID_MAP,
  getRoundConfig,
} from './config';
import { getNftImageUrl } from '@/services/constants';
import { loadWfpMetadataLite } from '@/services/wfpCollectionData';
import './MemoryMatch.game.css';

interface NFTMetadata {
  name: string;
  image: string;
  edition: number;
  attributes?: { trait_type: string; value: string }[];
}

interface Card {
  id: number;
  nftId: number;
  name: string;
  image: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface LocalLeaderboardEntry {
  name: string;
  score: number;
  date: string;
}

const MemoryMatchGame: React.FC = () => {
  const { playCardFlip, playMatchFound, playWinSound, playGameOver } = useGameSounds();
  const effects = useEffects();

  const {
    leaderboard: globalLeaderboard,
    submitScore,
    isSignedIn,
    userDisplayName,
    isSubmitting,
  } = useLeaderboard(MEMORY_MATCH_CONFIG.leaderboardId || 'memory-match');

  const { isBackgroundMusicPlaying, playBackgroundMusic, pauseBackgroundMusic } = useAudio();

  const [gameState, setGameState] = useState<'idle' | 'loading' | 'playing' | 'roundComplete' | 'gameover'>('idle');
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [timeLeft, setTimeLeft] = useState(40);
  const [isChecking, setIsChecking] = useState(false);
  const [metadata, setMetadata] = useState<NFTMetadata[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [sadImage, setSadImage] = useState('');

  const [round, setRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);

  const [streak, setStreak] = useState(0);
  const [lastMatchTime, setLastMatchTime] = useState<number | null>(null);
  const [showScreenShake, setShowScreenShake] = useState(false);

  const [devMode, setDevMode] = useState(false);

  const [localLeaderboard, setLocalLeaderboard] = useState<LocalLeaderboardEntry[]>(() => {
    const saved = localStorage.getItem('memoryMatchLeaderboard');
    return saved ? JSON.parse(saved) : [];
  });
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('memoryMatchHighScore') || '0', 10);
  });
  const [isNewPersonalBest, setIsNewPersonalBest] = useState(false);
  const [showLeaderboardPanel, setShowLeaderboardPanel] = useState(false);

  const preloadedCardsRef = useRef<Card[] | null>(null);
  const isPreloadingRef = useRef(false);
  const flippedCardsRef = useRef<number[]>([]);
  const startGameRef = useRef<(() => void) | null>(null);

  // Load metadata on mount
  useEffect(() => {
    loadWfpMetadataLite()
      .then((data) => setMetadata(data.map((nft) => ({
        ...nft,
        image: getNftImageUrl(nft.edition),
      }))))
      .catch(err => console.error('Failed to load metadata:', err));
  }, []);

  const shuffleCards = useCallback((pairsCount: number, baseFilter?: string, excludeNftIds: number[] = []) => {
    if (metadata.length === 0) return [];

    let availableMetadata = metadata.filter(nft => !excludeNftIds.includes(nft.edition));

    if (baseFilter) {
      availableMetadata = availableMetadata.filter(nft => {
        const baseAttr = nft.attributes?.find(attr => attr.trait_type === 'Base');
        return baseAttr?.value === baseFilter;
      });
    }

    if (availableMetadata.length < pairsCount) {
      availableMetadata = metadata.filter(nft => !excludeNftIds.includes(nft.edition));
    }

    const shuffledMetadata = [...availableMetadata].sort(() => Math.random() - 0.5);
    const selectedNFTs = shuffledMetadata.slice(0, pairsCount);

    const cardPairs: Card[] = [];

    selectedNFTs.forEach((nft, index) => {
      cardPairs.push({
        id: index * 2,
        nftId: nft.edition,
        name: nft.name,
        image: nft.image,
        isFlipped: false,
        isMatched: false,
      });
      cardPairs.push({
        id: index * 2 + 1,
        nftId: nft.edition,
        name: nft.name,
        image: nft.image,
        isFlipped: false,
        isMatched: false,
      });
    });

    for (let i = cardPairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardPairs[i], cardPairs[j]] = [cardPairs[j], cardPairs[i]];
    }

    return cardPairs;
  }, [metadata]);

  const preloadImages = (cards: Card[]): Promise<void[]> => {
    const uniqueImages = [...new Set(cards.map(c => c.image))];

    return Promise.all(
      uniqueImages.map(src => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = src;
        });
      })
    );
  };

  const preloadNextRound = useCallback(async (nextRound: number, currentNftIds: number[] = []) => {
    if (isPreloadingRef.current || metadata.length === 0) return;

    isPreloadingRef.current = true;

    const config = getRoundConfig(nextRound);
    const nextCards = shuffleCards(config.pairs, config.baseFilter, currentNftIds);

    if (nextCards.length > 0) {
      await preloadImages(nextCards);
      preloadedCardsRef.current = nextCards;
    }

    isPreloadingRef.current = false;
  }, [metadata, shuffleCards]);

  useEffect(() => {
    if (metadata.length > 0 && gameState === 'idle' && !preloadedCardsRef.current) {
      preloadNextRound(1);
    }
  }, [metadata, gameState, preloadNextRound]);

  useEffect(() => {
    if (metadata.length > 0 && gameState === 'idle') {
      queueMicrotask(() => startGameRef.current?.());
    }
  }, [metadata, gameState]);

  const startRound = async (roundNum: number, isNewGame: boolean = false) => {
    setGameState('loading');

    const config = getRoundConfig(roundNum);
    let newCards: Card[];

    if (preloadedCardsRef.current && preloadedCardsRef.current.length === config.pairs * 2) {
      newCards = preloadedCardsRef.current;
      preloadedCardsRef.current = null;
    } else {
      newCards = shuffleCards(config.pairs, config.baseFilter);
      await preloadImages(newCards);
    }

    setCards(newCards);
    setFlippedCards([]);
    flippedCardsRef.current = [];
    setMoves(0);
    setMatches(0);
    setTimeLeft(config.time);
    setIsChecking(false);
    setStreak(0);
    setLastMatchTime(null);
    if (isNewGame) {
      setPlayerName('');
    }
    setGameState('playing');

    const currentNftIds = [...new Set(newCards.map(c => c.nftId))];
    preloadNextRound(roundNum + 1, currentNftIds);
  };

  const startGame = async () => {
    if (metadata.length === 0) {
      setGameState('loading');
      return;
    }

    setDevMode(false);
    setRound(1);
    setTotalScore(0);
    setScoreSubmitted(false);
    setIsNewPersonalBest(false);
    await startRound(1, true);
  };

  // Keep ref in sync
  useEffect(() => {
    startGameRef.current = startGame;
  });

  const nextRound = async () => {
    const newRound = round + 1;
    setRound(newRound);
    await startRound(newRound);
  };

  const goToMenu = () => {
    setGameState('idle');
    setPlayerName('');
    setRound(1);
    setTotalScore(0);
  };

  const calculateRoundScore = () => {
    const matchPoints = matches * 10;
    const timeBonus = timeLeft * 5;
    const roundBonus = round * 100;
    return matchPoints + timeBonus + roundBonus;
  };

  const completeRound = () => {
    playWinSound();
    effects.trigger({ type: 'confetti', intensity: 'strong', duration: 3000 });
    const roundScore = calculateRoundScore();
    setTotalScore(prev => prev + roundScore);
    setGameState('roundComplete');
  };

  const saveScoreLocal = () => {
    if (!playerName.trim()) return;

    const newEntry: LocalLeaderboardEntry = {
      name: playerName.trim(),
      score: totalScore,
      date: new Date().toISOString().split('T')[0],
    };

    const updatedLeaderboard = [...localLeaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    setLocalLeaderboard(updatedLeaderboard);
    localStorage.setItem('memoryMatchLeaderboard', JSON.stringify(updatedLeaderboard));
    setPlayerName('');
    goToMenu();
  };

  const submitScoreGlobal = useCallback(async (finalScore: number, finalRound: number) => {
    if (!isSignedIn || scoreSubmitted || finalScore === 0) return;

    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('memoryMatchHighScore', String(finalScore));
    }

    setScoreSubmitted(true);
    const result = await submitScore(finalScore, finalRound, {
      roundsCompleted: finalRound - 1,
    });

    if (result.success && result.isNewHighScore) {
      setIsNewPersonalBest(true);
    }
  }, [isSignedIn, scoreSubmitted, submitScore, highScore]);

  const skipSaveScore = () => {
    setPlayerName('');
    goToMenu();
  };

  const displayLeaderboard = globalLeaderboard.length > 0
    ? globalLeaderboard.map(entry => ({
        name: entry.displayName,
        score: entry.score,
        date: entry.date,
      }))
    : localLeaderboard;

  // Intentionally avoid `startGame` dependency to prevent replaying auto-start when callback identity changes.
  useEffect(() => {
    if (gameState === 'loading' && metadata.length > 0 && !devMode && cards.length === 0) {
      queueMicrotask(() => startGame());
    }
  }, [metadata, gameState, devMode, cards.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Intentionally avoid `completeRound` dependency so round completion only reacts to round state changes.
  useEffect(() => {
    flippedCardsRef.current = flippedCards;
  }, [flippedCards]);

  const handleCardClick = (cardId: number) => {
    if (gameState !== 'playing' || isChecking) return;

    const currentFlipped = flippedCardsRef.current;

    if (currentFlipped.includes(cardId)) return;
    if (currentFlipped.length >= 2) return;

    const card = cards.find(c => c.id === cardId);
    if (!card || card.isMatched) return;

    if (card.isFlipped && !currentFlipped.includes(cardId)) return;

    playCardFlip();

    const newFlipped = [...currentFlipped, cardId];
    flippedCardsRef.current = newFlipped;

    setCards(prev =>
      prev.map(c => (c.id === cardId ? { ...c, isFlipped: true } : c))
    );
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1);
      setIsChecking(true);

      const [firstId, secondId] = newFlipped;
      const firstCard = cards.find(c => c.id === firstId);
      const secondCard = cards.find(c => c.id === secondId);

      if (!firstCard || !secondCard || firstId === secondId) {
        setTimeout(() => {
          setCards(prev =>
            prev.map(c =>
              c.id === firstId || c.id === secondId
                ? { ...c, isFlipped: false }
                : c
            )
          );
          flippedCardsRef.current = [];
          setFlippedCards([]);
          setIsChecking(false);
        }, 500);
        return;
      }

      if (firstCard.nftId === secondCard.nftId) {
        setTimeout(() => {
          playMatchFound();
          setCards(prev =>
            prev.map(c =>
              c.id === firstId || c.id === secondId
                ? { ...c, isMatched: true }
                : c
            )
          );

          const newStreak = streak + 1;
          setStreak(newStreak);

          const now = Date.now();
          const timeSinceLastMatch = lastMatchTime ? now - lastMatchTime : 999999;
          const isFastMatch = timeSinceLastMatch < 2500;
          setLastMatchTime(now);

          // Use shared effects
          effects.trigger({
            type: 'shockwave',
            intensity: newStreak >= 4 ? 'strong' : 'medium',
          });

          if (newStreak >= 2) {
            effects.trigger({
              type: 'sparks',
              intensity: newStreak >= 5 ? 'strong' : 'normal',
            });
          }

          if (newStreak >= 4) {
            setShowScreenShake(true);
            setTimeout(() => setShowScreenShake(false), 300);
          }

          if (newStreak >= 3) {
            effects.trigger({
              type: 'floatingEmoji',
              data: { emoji: '🔥' },
            });
          }

          effects.trigger({
            type: 'scorePopup',
            data: { score: 10 + (newStreak * 5), prefix: isFastMatch ? 'FAST' : '' },
          });

          setMatches(prev => prev + 1);

          flippedCardsRef.current = [];
          setFlippedCards([]);
          setIsChecking(false);
        }, 800);
      } else {
        setTimeout(() => {
          setCards(prev =>
            prev.map(c =>
              c.id === firstId || c.id === secondId
                ? { ...c, isFlipped: false }
                : c
            )
          );
          setStreak(0);
          flippedCardsRef.current = [];
          setFlippedCards([]);
          setIsChecking(false);
        }, 1200);
      }
    }
  };

  useEffect(() => {
    if (devMode) return;
    const config = getRoundConfig(round);
    if (matches === config.pairs && gameState === 'playing') {
      queueMicrotask(() => completeRound());
    }
  }, [matches, gameState, round, devMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (gameState !== 'playing' || devMode) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          playGameOver();
          setSadImage(SAD_IMAGES[Math.floor(Math.random() * SAD_IMAGES.length)]);
          setGameState('gameover');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, devMode, playGameOver]);

  useEffect(() => {
    if (gameState === 'gameover' && isSignedIn && totalScore > 0 && !scoreSubmitted) {
      queueMicrotask(() => submitScoreGlobal(totalScore, round));
    }
  }, [gameState, isSignedIn, totalScore, round, scoreSubmitted, submitScoreGlobal]);

  const currentConfig = getRoundConfig(round);
  const requiredPairs = currentConfig.pairs;

  const devJumpToRound = async (targetRound: number) => {
    if (metadata.length === 0) {
      alert('Metadata not loaded yet');
      return;
    }

    preloadedCardsRef.current = null;

    const config = getRoundConfig(targetRound);
    const newCards = shuffleCards(config.pairs, config.baseFilter);

    if (newCards.length === 0) {
      alert(`No cards for round ${targetRound}`);
      return;
    }

    setDevMode(true);
    setGameState('loading');

    await preloadImages(newCards);

    setRound(targetRound);
    setTotalScore(0);
    setCards(newCards);
    setFlippedCards([]);
    setMoves(0);
    setMatches(0);
    setTimeLeft(999);
    setIsChecking(false);
    setGameState('playing');
  };

  return (
    <div className={`memory-container ${gameState === 'playing' ? 'playing-mode' : ''}`}>
      {/* Dev Panel */}
      <div className="dev-panel">
        <span className="dev-label">DEV</span>
        {Array.from({ length: 17 }, (_, i) => i + 1).map(num => (
          <button
            key={num}
            className={`dev-btn ${round === num && gameState === 'playing' ? 'active' : ''}`}
            onClick={() => devJumpToRound(num)}
            title={`Round ${num}`}
          >
            {num}
          </button>
        ))}
      </div>

      {/* Background elements */}
      {gameState !== 'playing' && gameState !== 'loading' && (
        <div className="memory-bg-elements">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className={`floating-brain fb-${i + 1}`}>🧠</div>
          ))}
        </div>
      )}

      <div className="memory-content">
        <div className="memory-area">
          {gameState === 'loading' && (
            <div className="game-menu">
              <div className="loading-spinner" />
              <p className="game-desc">Loading NFTs...</p>
            </div>
          )}

          {gameState === 'roundComplete' && (
            <div className="game-over-screen">
              <div className="game-over-left">
                <div className="game-over-emoji">🎉</div>
              </div>
              <div className="game-over-right">
                <div className="game-over-title">Round {round} Complete!</div>
                <div className="game-over-reason">+{calculateRoundScore()} points</div>
                <div className="game-over-score">
                  <span className="game-over-score-value">{totalScore + calculateRoundScore()}</span>
                  <span className="game-over-score-label">total score</span>
                </div>
                <div className="game-over-buttons-single">
                  <button onClick={nextRound} className="play-btn">Next Round →</button>
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
                  <div className="game-over-emoji">⏰</div>
                )}

                <div className={`leaderboard-slide-panel ${showLeaderboardPanel ? 'open' : ''}`}>
                  <div className="leaderboard-panel-header">
                    <h3>{globalLeaderboard.length > 0 ? 'Global Leaderboard' : 'Leaderboard'}</h3>
                    <button className="leaderboard-close-btn" onClick={() => setShowLeaderboardPanel(false)}>×</button>
                  </div>
                  <div className="leaderboard-panel-list">
                    {Array.from({ length: 10 }, (_, index) => {
                      const entry = displayLeaderboard[index];
                      const isCurrentUser = entry && totalScore === entry.score;
                      return (
                        <div key={index} className={`leaderboard-panel-entry ${isCurrentUser ? 'current-user' : ''}`}>
                          <span className="leaderboard-panel-rank">#{index + 1}</span>
                          <span className="leaderboard-panel-name">{entry?.name || '---'}</span>
                          <span className="leaderboard-panel-score">{entry?.score || '-'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="game-over-right">
                <div className="game-over-title">Time's Up!</div>
                <div className="game-over-reason">You reached Round {round}</div>
                <div className="game-over-score">
                  <span className="game-over-score-value">{totalScore}</span>
                  <span className="game-over-score-label">total points</span>
                </div>

                {(isNewPersonalBest || totalScore > highScore) && totalScore > 0 && (
                  <div className="game-over-record">🌟 New Personal Best! 🌟</div>
                )}

                {totalScore > 0 ? (
                  isSignedIn ? (
                    <div className="game-over-form">
                      <div className="game-over-submitted">
                        {isSubmitting ? (
                          <span>Saving score...</span>
                        ) : scoreSubmitted ? (
                          <span>Score saved as {userDisplayName || 'Anonymous'}!</span>
                        ) : null}
                      </div>
                      <div className="game-over-buttons">
                        <button onClick={startGame} className="play-btn">Play Again</button>
                        <button onClick={goToMenu} className="play-btn" style={{ background: 'var(--color-white-10)' }}>Menu</button>
                      </div>
                      <button className="leaderboard-toggle-btn" onClick={() => setShowLeaderboardPanel(!showLeaderboardPanel)}>
                        {showLeaderboardPanel ? 'Hide Leaderboard' : 'View Leaderboard'}
                      </button>
                    </div>
                  ) : (
                    <div className="game-over-form">
                      <input
                        type="text"
                        className="game-over-input"
                        placeholder="Enter your name"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        maxLength={15}
                        onKeyDown={(e) => e.key === 'Enter' && saveScoreLocal()}
                      />
                      <div className="game-over-buttons">
                        <button onClick={saveScoreLocal} className="game-over-save" disabled={!playerName.trim()}>Save Score</button>
                        <button onClick={skipSaveScore} className="game-over-skip">Skip</button>
                      </div>
                      <button className="leaderboard-toggle-btn" onClick={() => setShowLeaderboardPanel(!showLeaderboardPanel)}>
                        {showLeaderboardPanel ? 'Hide Leaderboard' : 'View Leaderboard'}
                      </button>
                    </div>
                  )
                ) : (
                  <div className="game-over-buttons-single">
                    <button onClick={startGame} className="play-btn">Try Again</button>
                    <button onClick={goToMenu} className="game-over-skip">Menu</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {gameState === 'playing' && (() => {
            const totalCards = cards.length;
            const grid = GRID_MAP[totalCards] || { cols: Math.ceil(totalCards / 6), rows: 6 };
            const { cols, rows } = grid;
            return (
              <div className="game-layout">
                <div className="stats-panel">
                  <div className="stat-item round-stat">
                    <span className="stat-label">Round</span>
                    <span className="stat-value">{round}</span>
                  </div>
                  <div className="stat-item score-stat">
                    <span className="stat-label">Score</span>
                    <span className="stat-value">{totalScore}</span>
                  </div>
                  <div className={`stat-item ${timeLeft <= 10 ? 'time-warning' : ''}`}>
                    <span className="stat-label">Time</span>
                    <span className="stat-value">{timeLeft}s</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Pairs</span>
                    <span className="stat-value">{matches}/{requiredPairs}</span>
                  </div>
                </div>

                <div className={`lightbox-wrapper ${showScreenShake ? 'screen-shake' : ''}`}>
                  <EffectsLayer />

                  <button
                    className="music-toggle-btn"
                    onClick={() => isBackgroundMusicPlaying ? pauseBackgroundMusic() : playBackgroundMusic()}
                  >
                    {isBackgroundMusicPlaying ? '🔊' : '🔇'}
                  </button>

                  <div
                    className="cards-grid"
                    style={{
                      '--cols': cols,
                      '--rows': rows,
                    } as React.CSSProperties}
                  >
                    {cards.map(card => (
                      <div
                        key={card.id}
                        className={`memory-card ${card.isFlipped ? 'flipped' : ''} ${card.isMatched ? 'matched' : ''}`}
                        onClick={() => handleCardClick(card.id)}
                      >
                        <div className="card-inner">
                          <div className="card-front">
                            <img
                              src="/assets/Games/games_media/Memory_card.webp"
                              alt=""
                              className="card-back-image"
                            />
                          </div>
                          <div className="card-back">
                            <img
                              src={card.image}
                              alt={card.name}
                              className="nft-image"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

const MemoryMatch: React.FC = () => (
  <GameShell gameId={MEMORY_MATCH_CONFIG.id}>
    <MemoryMatchGame />
  </GameShell>
);

export default MemoryMatch;
