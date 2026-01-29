/* eslint-disable react-refresh/only-export-components */
/**
 * ScorePopup Component
 *
 * Flying score popup that animates upward and fades out.
 * Use for immediate feedback when player scores points.
 */

import React, { useEffect, useState } from 'react';
import './ScorePopup.css';

interface ScorePopupProps {
  /** Points scored (displayed as +{score}) */
  score: number;
  /** X position as percentage (0-100), default center */
  x?: number;
  /** Y position as percentage (0-100), default 40% from top */
  y?: number;
  /** Text color, default gold */
  color?: string;
  /** Optional prefix text (e.g., "PERFECT") */
  prefix?: string;
  /** Callback when animation completes */
  onComplete?: () => void;
}

export const ScorePopup: React.FC<ScorePopupProps> = ({
  score,
  x = 50,
  y = 40,
  color = '#ffd700',
  prefix,
  onComplete,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 1000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      className={`score-popup ${prefix ? 'score-popup-with-prefix' : ''}`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        color,
      }}
    >
      {prefix && <span className="score-popup-prefix">{prefix}</span>}
      <span className="score-popup-value">{prefix ? '' : '+'}{score}</span>
    </div>
  );
};

/**
 * ScorePopupManager Component
 *
 * Manages multiple score popups. Use this in your game to handle
 * multiple simultaneous score displays.
 */

interface PopupData {
  id: string;
  score: number;
  x: number;
  y: number;
  color?: string;
  prefix?: string;
}

interface ScorePopupManagerProps {
  popups: PopupData[];
  onPopupComplete: (id: string) => void;
}

export const ScorePopupManager: React.FC<ScorePopupManagerProps> = ({
  popups,
  onPopupComplete,
}) => {
  return (
    <>
      {popups.map((popup) => (
        <ScorePopup
          key={popup.id}
          score={popup.score}
          x={popup.x}
          y={popup.y}
          color={popup.color}
          prefix={popup.prefix}
          onComplete={() => onPopupComplete(popup.id)}
        />
      ))}
    </>
  );
};

/**
 * Hook for managing score popups
 */
export function useScorePopups() {
  const [popups, setPopups] = useState<PopupData[]>([]);

  const addPopup = (
    score: number,
    options?: {
      x?: number;
      y?: number;
      color?: string;
      prefix?: string;
    }
  ) => {
    const id = `popup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newPopup: PopupData = {
      id,
      score,
      x: options?.x ?? 50,
      y: options?.y ?? 40,
      color: options?.color,
      prefix: options?.prefix,
    };
    setPopups((prev) => [...prev, newPopup]);
  };

  const removePopup = (id: string) => {
    setPopups((prev) => prev.filter((p) => p.id !== id));
  };

  return {
    popups,
    addPopup,
    removePopup,
  };
}

export default ScorePopup;
