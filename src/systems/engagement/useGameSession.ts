import { useCallback, useRef, useState, useEffect } from 'react';
import { useEffects, getGameOverPreset, getComboPreset } from '../effects';

// Game ID type - can be extended as new games are added
export type GameId =
  | 'orange-stack'
  | 'memory-match'
  | 'orange-pong'
  | 'wojak-runner'
  | 'orange-juggle'
  | 'knife-game'
  | 'color-reaction'
  | 'merge-2048'
  | 'orange-wordle'
  | string;

interface GameSessionOptions {
  gameId: GameId;
  onHighScore?: (score: number) => void;
  onAchievement?: (achievement: unknown) => void;
  comboTimeoutMs?: number; // Default 2000ms
}

interface GameSessionState {
  isPlaying: boolean;
  score: number;
  highScore: number;
  combo: number;
  comboTimer: number; // 0-100 percentage
}

interface GameEndResult {
  score: number;
  isNewHighScore: boolean;
  leaderboardRank?: number;
  currencyEarned: {
    oranges: number;
    gems: number;
    breakdown: Record<string, number>;
  };
  newAchievements: unknown[];
}

// Local storage key for high scores
const getHighScoreKey = (gameId: string) => `wojak_highscore_${gameId}`;

export const useGameSession = (options: GameSessionOptions) => {
  const { gameId, onHighScore, comboTimeoutMs = 2000 } = options;

  let effectsContext: ReturnType<typeof useEffects> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- useEffects may not have a provider; catching gracefully
    effectsContext = useEffects();
  } catch {
    // Effects context not available, effects will be disabled
  }

  const [state, setState] = useState<GameSessionState>({
    isPlaying: false,
    score: 0,
    highScore: 0,
    combo: 0,
    comboTimer: 100
  });

  const comboTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comboDecayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStartRef = useRef<number>(0);

  // Load high score from localStorage on mount
  useEffect(() => {
    const savedHighScore = localStorage.getItem(getHighScoreKey(gameId));
    if (savedHighScore) {
      setState(prev => ({
        ...prev,
        highScore: parseInt(savedHighScore, 10) || 0
      }));
    }
  }, [gameId]);

  // Initialize session (can be called to refresh stats)
  const initSession = useCallback(async () => {
    const savedHighScore = localStorage.getItem(getHighScoreKey(gameId));
    setState(prev => ({
      ...prev,
      highScore: savedHighScore ? parseInt(savedHighScore, 10) : 0
    }));
  }, [gameId]);

  // Start game
  const startGame = useCallback(() => {
    sessionStartRef.current = Date.now();
    setState(prev => ({
      ...prev,
      isPlaying: true,
      score: 0,
      combo: 0,
      comboTimer: 100
    }));
  }, []);

  // Add score with optional position for effects
  const addScore = useCallback((points: number, position?: { x: number; y: number }) => {
    setState(prev => {
      const multiplier = prev.combo > 1 ? 1 + (prev.combo * 0.1) : 1;
      const finalPoints = Math.round(points * multiplier);
      const newScore = prev.score + finalPoints;

      // Show score popup effect
      if (effectsContext && position) {
        effectsContext.triggerEffect('score-popup', {
          position,
          data: {
            score: finalPoints,
            label: prev.combo > 1 ? `${prev.combo}x` : undefined
          }
        });
      }

      return { ...prev, score: newScore };
    });
  }, [effectsContext]);

  // Start combo timer decay
  const startComboDecay = useCallback(() => {
    // Clear existing decay interval
    if (comboDecayRef.current) {
      clearInterval(comboDecayRef.current);
    }

    // Decay the combo timer over time
    const decayInterval = 50; // Update every 50ms
    const decayRate = (100 / comboTimeoutMs) * decayInterval;

    comboDecayRef.current = setInterval(() => {
      setState(prev => {
        const newTimer = Math.max(0, prev.comboTimer - decayRate);
        if (newTimer <= 0) {
          // Combo expired
          if (comboDecayRef.current) {
            clearInterval(comboDecayRef.current);
          }
          return { ...prev, combo: 0, comboTimer: 0 };
        }
        return { ...prev, comboTimer: newTimer };
      });
    }, decayInterval);
  }, [comboTimeoutMs]);

  // Increment combo
  const incrementCombo = useCallback((position?: { x: number; y: number }) => {
    // Clear existing timeout
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }

    setState(prev => {
      const newCombo = prev.combo + 1;

      // Trigger combo effects
      if (effectsContext && newCombo > 1 && position) {
        const preset = getComboPreset(newCombo, position);
        effectsContext.triggerPreset(preset);
      }

      return {
        ...prev,
        combo: newCombo,
        comboTimer: 100
      };
    });

    // Start combo decay
    startComboDecay();

    // Set timeout to reset combo
    comboTimeoutRef.current = setTimeout(() => {
      setState(prev => ({ ...prev, combo: 0, comboTimer: 0 }));
    }, comboTimeoutMs);
  }, [effectsContext, comboTimeoutMs, startComboDecay]);

  // Reset combo
  const resetCombo = useCallback(() => {
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }
    if (comboDecayRef.current) {
      clearInterval(comboDecayRef.current);
    }
    setState(prev => ({ ...prev, combo: 0, comboTimer: 0 }));
  }, []);

  // End game and process results
  const endGame = useCallback(async (): Promise<GameEndResult> => {
    // Clean up timers
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }
    if (comboDecayRef.current) {
      clearInterval(comboDecayRef.current);
    }

    const currentScore = state.score;
    const isNewHighScore = currentScore > state.highScore;

    // Update high score locally
    if (isNewHighScore && currentScore > 0) {
      localStorage.setItem(getHighScoreKey(gameId), String(currentScore));
      setState(prev => ({ ...prev, highScore: currentScore, isPlaying: false }));
      onHighScore?.(currentScore);
    } else {
      setState(prev => ({ ...prev, isPlaying: false }));
    }

    // Calculate session duration (reserved for analytics)
    // const sessionDuration = Math.floor((Date.now() - sessionStartRef.current) / 1000);

    // Calculate currency earned (basic formula - can be enhanced with CurrencyContext later)
    const baseOranges = Math.floor(currentScore / 10);
    const highScoreBonus = isNewHighScore ? 50 : 0;
    const orangesEarned = baseOranges + highScoreBonus;

    // Trigger game over effects
    if (effectsContext) {
      effectsContext.triggerPreset(getGameOverPreset({
        isHighScore: isNewHighScore,
        isTopTen: false, // Would be determined by leaderboard context
        score: currentScore
      }));
    }

    return {
      score: currentScore,
      isNewHighScore,
      leaderboardRank: undefined, // Would come from leaderboard context
      currencyEarned: {
        oranges: orangesEarned,
        gems: 0,
        breakdown: {
          'Base Score': baseOranges,
          ...(highScoreBonus > 0 ? { 'High Score Bonus': highScoreBonus } : {})
        }
      },
      newAchievements: []
    };
  }, [state.score, state.highScore, gameId, onHighScore, effectsContext]);

  // Pause/Resume (for games that support it)
  const pauseGame = useCallback(() => {
    if (comboDecayRef.current) {
      clearInterval(comboDecayRef.current);
    }
  }, []);

  const resumeGame = useCallback(() => {
    if (state.combo > 0) {
      startComboDecay();
    }
  }, [state.combo, startComboDecay]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
      }
      if (comboDecayRef.current) {
        clearInterval(comboDecayRef.current);
      }
    };
  }, []);

  return {
    // State
    ...state,
    isNftHolder: false, // Would come from auth context

    // Actions
    initSession,
    startGame,
    addScore,
    incrementCombo,
    resetCombo,
    endGame,
    pauseGame,
    resumeGame,

    // Effects (exposed for custom use)
    triggerEffect: effectsContext?.triggerEffect ?? (() => {}),
    triggerPreset: effectsContext?.triggerPreset ?? (() => {})
  };
};
