/**
 * HPBar — animated health bar with color thresholds.
 */

interface HPBarProps {
  current: number;
  max: number;
  label?: string;
}

export function HPBar({ current, max, label }: HPBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const tier = pct > 50 ? 'hp-high' : pct > 20 ? 'hp-mid' : 'hp-low';

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-secondary">{label}</span>
          <span className="text-muted tabular-nums">{current}/{max}</span>
        </div>
      )}
      <div className={`hp-bar ${tier}`}>
        <div className="hp-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
