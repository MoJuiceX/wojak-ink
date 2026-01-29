import React, { useState, useEffect } from 'react';
import './game-ui.css';

interface CountdownOverlayProps {
  isVisible: boolean;
  onComplete: () => void;
  startFrom?: number; // Default 3
  showGo?: boolean; // Show "GO!" after countdown
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({
  isVisible,
  onComplete,
  startFrom = 3,
  showGo = true
}) => {
  const [count, setCount] = useState<number | 'GO!' | null>(null);

  useEffect(() => {
    if (!isVisible) {
      queueMicrotask(() => setCount(null));
      return;
    }

    queueMicrotask(() => setCount(startFrom));

    const interval = setInterval(() => {
      setCount(prev => {
        if (prev === null) return null;
        if (prev === 'GO!') {
          clearInterval(interval);
          setTimeout(onComplete, 300);
          return null;
        }
        if (typeof prev === 'number' && prev > 1) {
          return prev - 1;
        }
        if (typeof prev === 'number' && prev === 1) {
          return showGo ? 'GO!' : null;
        }
        return null;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, startFrom, showGo, onComplete]);

  if (!isVisible || count === null) return null;

  return (
    <div className="countdown-overlay">
      <div className={`countdown-number ${count === 'GO!' ? 'go' : ''}`}>
        {count}
      </div>
    </div>
  );
};
