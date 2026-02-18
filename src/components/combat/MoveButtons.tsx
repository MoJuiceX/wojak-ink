/**
 * MoveButtons — 4 move buttons for manual combat + 30s timer.
 * Selected move glows with its combat type color.
 */

import { useState, useEffect, useCallback } from 'react';

interface MoveInfo {
  id: string;
  name: string;
  power: number;
  accuracy: number;
  category: string;
  type?: string;
}

interface MoveButtonsProps {
  moves: MoveInfo[];
  onSubmit: (moveId: string) => void;
  disabled?: boolean;
  timerSeconds?: number;
  onTimeout?: () => void;
}

export function MoveButtons({ moves, onSubmit, disabled = false, timerSeconds = 30, onTimeout }: MoveButtonsProps) {
  const [selectedMove, setSelectedMove] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(timerSeconds);

  // Countdown timer
  useEffect(() => {
    if (disabled) return;
    setTimeLeft(timerSeconds);
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          onTimeout?.();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [disabled, timerSeconds, onTimeout]);

  const handleSelect = useCallback((moveId: string) => {
    setSelectedMove(moveId);
  }, []);

  const handleConfirm = useCallback(() => {
    if (selectedMove) {
      onSubmit(selectedMove);
      setSelectedMove(null);
    }
  }, [selectedMove, onSubmit]);

  const timerClass = timeLeft <= 5 ? 'combat-timer timer-critical' : timeLeft <= 10 ? 'combat-timer timer-warning' : 'combat-timer';

  // Get the type glow class for a move based on its type
  const getGlowClass = (move: MoveInfo, isSelected: boolean): string => {
    if (!isSelected || !move.type) return '';
    return `move-glow move-glow-${move.type.toLowerCase()}`;
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Timer */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-secondary">Choose your move</span>
        <span className={timerClass}>{timeLeft}s</span>
      </div>

      {/* Move grid */}
      <div className="grid grid-cols-2 gap-2">
        {moves.map((move) => {
          const isSelected = selectedMove === move.id;
          return (
            <button
              key={move.id}
              className={`move-btn ${isSelected ? 'selected' : ''} ${getGlowClass(move, isSelected)}`}
              onClick={() => handleSelect(move.id)}
              disabled={disabled}
            >
              <div className="font-medium text-sm">{move.name}</div>
              <div className="flex items-center gap-2 text-xs text-secondary mt-0.5">
                {move.power > 0 && <span>Pow {move.power}</span>}
                <span>Acc {move.accuracy}%</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Confirm button */}
      <button
        className="btn btn-primary w-full"
        onClick={handleConfirm}
        disabled={disabled || !selectedMove}
      >
        Confirm Move
      </button>
    </div>
  );
}
