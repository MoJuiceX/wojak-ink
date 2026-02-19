/**
 * TurnTimer — circular SVG countdown.
 * Changes color: default (orange) -> warning (yellow at 10s) -> critical (red at 5s, pulsing).
 */

import { useEffect, useState, useCallback } from 'react';

interface TurnTimerProps {
  totalSeconds: number;
  onTimeout?: () => void;
  isPaused?: boolean;
}

const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function TurnTimer({ totalSeconds, onTimeout, isPaused = false }: TurnTimerProps) {
  const [timeLeft, setTimeLeft] = useState(totalSeconds);

  useEffect(() => {
    setTimeLeft(totalSeconds);
  }, [totalSeconds]);

  const stableOnTimeout = useCallback(() => {
    onTimeout?.();
  }, [onTimeout]);

  useEffect(() => {
    if (isPaused || timeLeft <= 0) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          stableOnTimeout();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isPaused, stableOnTimeout, timeLeft]);

  const progress = timeLeft / totalSeconds;
  const dashoffset = CIRCUMFERENCE * (1 - progress);
  const colorClass = timeLeft <= 5 ? 'critical' : timeLeft <= 10 ? 'warning' : '';

  return (
    <div className="turn-timer">
      <svg className="turn-timer-ring" viewBox="0 0 48 48">
        <circle className="track" cx="24" cy="24" r={RADIUS} />
        <circle
          className={`progress ${colorClass}`}
          cx="24"
          cy="24"
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashoffset}
          transform="rotate(-90 24 24)"
        />
      </svg>
      <span className="turn-timer-text" style={{
        color: timeLeft <= 5 ? 'var(--color-error)' : timeLeft <= 10 ? 'var(--color-warning)' : 'var(--color-text)',
      }}>
        {timeLeft}
      </span>
    </div>
  );
}
