/**
 * Countdown Timer Component
 * 
 * Shows time remaining until leaderboard reset.
 * Updates every second for accurate countdown.
 */

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import './CountdownTimer.css';

interface CountdownTimerProps {
  timeframe: 'weekly' | 'all-time';
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function calculateTimeRemaining(resetTime: string): TimeRemaining {
  const now = new Date().getTime();
  const target = new Date(resetTime).getTime();
  const total = Math.max(0, target - now);

  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return { days, hours, minutes, seconds, total };
}

function formatTimeRemaining(time: TimeRemaining): string {
  const parts: string[] = [];

  if (time.days > 0) {
    parts.push(`${time.days}d`);
  }
  if (time.hours > 0 || time.days > 0) {
    parts.push(`${time.hours}h`);
  }
  if (time.minutes > 0 || time.hours > 0 || time.days > 0) {
    parts.push(`${time.minutes}m`);
  }
  
  // Only show seconds if less than 1 hour remaining
  if (time.days === 0 && time.hours === 0) {
    parts.push(`${time.seconds}s`);
  }

  return parts.join(' ');
}

// Calculate reset time based on timeframe (always calculate locally for consistency)
function getResetTime(timeframe: 'weekly' | 'all-time'): string | null {
  if (timeframe === 'all-time') return null;

  // Weekly: Next Monday midnight UTC
  const now = new Date();
  const currentDay = now.getUTCDay();
  const daysUntilMonday = currentDay === 0 ? 1 : (8 - currentDay);

  const nextMonday = new Date(now);
  nextMonday.setUTCDate(nextMonday.getUTCDate() + daysUntilMonday);
  nextMonday.setUTCHours(0, 0, 0, 0);
  return nextMonday.toISOString();
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  timeframe,
}) => {
  // Always calculate locally based on timeframe for consistent behavior
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);

  useEffect(() => {
    const resetTime = getResetTime(timeframe);
    if (!resetTime) {
      queueMicrotask(() => setTimeRemaining(null));
      return;
    }

    // Update immediately
    queueMicrotask(() => setTimeRemaining(calculateTimeRemaining(resetTime)));

    // Update every second
    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining(resetTime);
      setTimeRemaining(remaining);

      // Stop when countdown reaches zero
      if (remaining.total <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timeframe]); // Recalculate when timeframe changes

  // Don't show for all-time or if no time remaining
  if (timeframe === 'all-time' || !timeRemaining) {
    return null;
  }

  const isUrgent = timeRemaining.total < 60 * 60 * 1000; // Less than 1 hour
  const isVeryUrgent = timeRemaining.total < 10 * 60 * 1000; // Less than 10 minutes

  return (
    <div className={`countdown-timer ${isUrgent ? 'urgent' : ''} ${isVeryUrgent ? 'very-urgent' : ''}`}>
      <Clock size={14} className="countdown-icon" />
      <span className="countdown-label">Resets in</span>
      <span className="countdown-time">{formatTimeRemaining(timeRemaining)}</span>
    </div>
  );
};

export default CountdownTimer;
