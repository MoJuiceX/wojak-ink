/**
 * HPBar — animated health bar with color thresholds and ghost damage trail.
 * The ghost bar (red) shows the previous HP value and shrinks after a CSS delay,
 * creating a "damage trail" effect common in fighting games.
 */

interface HPBarProps {
  current: number;
  max: number;
  label?: string;
  ghost?: number; // Previous HP value for ghost damage trail
}

export function HPBar({ current, max, label, ghost }: HPBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const ghostPct = ghost != null && max > 0 ? Math.max(0, Math.min(100, (ghost / max) * 100)) : pct;
  const tier = pct > 50 ? 'hp-high' : pct > 20 ? 'hp-mid' : 'hp-low';
  const isWarning = pct <= 25 && pct > 0;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-secondary">{label}</span>
          <span className="font-mono text-secondary" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {current}/{max}
          </span>
        </div>
      )}
      <div className={`hp-bar hp-bar-container ${isWarning ? 'hp-warning' : ''}`}>
        {ghostPct > pct && (
          <div className="hp-bar-ghost" style={{ width: `${ghostPct}%` }} />
        )}
        <div className={`hp-bar-fill ${tier}`} style={{ width: `${pct}%`, position: 'relative' }} />
      </div>
    </div>
  );
}
