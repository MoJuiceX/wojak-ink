/**
 * HPBar — animated health bar with ghost bar, shimmer on damage, and critical pulse.
 */

import { useState, useEffect, useRef } from 'react';

interface HPBarProps {
  current: number;
  max: number;
  label?: string;
  ghost?: number; // External ghost value (overrides internal tracking when provided)
}

export function HPBar({ current, max, label, ghost }: HPBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const tier = pct > 50 ? 'hp-high' : pct > 20 ? 'hp-mid' : 'hp-low';
  const isCritical = pct <= 20 && pct > 0;

  // Ghost bar tracks previous HP (trails behind actual HP)
  const [internalGhostPct, setInternalGhostPct] = useState(pct);
  const [isShimmering, setIsShimmering] = useState(false);
  const prevPctRef = useRef(pct);

  // Use external ghost if provided, otherwise use internal tracking
  const externalGhostPct = ghost != null && max > 0
    ? Math.max(0, Math.min(100, (ghost / max) * 100))
    : null;
  const ghostPct = externalGhostPct ?? internalGhostPct;

  useEffect(() => {
    if (pct < prevPctRef.current) {
      // Damage was taken: trigger shimmer and delay ghost bar
      setIsShimmering(true);
      const shimmerTimer = setTimeout(() => setIsShimmering(false), 800);

      const ghostTimer = setTimeout(() => {
        setInternalGhostPct(pct);
      }, 600);

      prevPctRef.current = pct;
      return () => {
        clearTimeout(shimmerTimer);
        clearTimeout(ghostTimer);
      };
    } else {
      // Healing: sync ghost immediately
      setInternalGhostPct(pct);
      prevPctRef.current = pct;
    }
  }, [pct]);

  const barClasses = [
    'hp-bar',
    tier,
    isShimmering ? 'hp-bar-shimmer' : '',
    isCritical ? 'hp-critical' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-secondary">{label}</span>
          <span className="text-muted tabular-nums">{current}/{max}</span>
        </div>
      )}
      <div className={barClasses}>
        {ghostPct > pct && (
          <div className="hp-bar-ghost" style={{ width: `${ghostPct}%` }} />
        )}
        <div className="hp-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
