/**
 * TurnLog — horizontal scrolling battle chip ticker.
 * New events slide in from the right, older events pushed left.
 * Modelled after ClawCombat's battle history panel.
 *
 * Supports two modes:
 * - entries: flat list for per-event scroll (BattleView)
 * - turns: grouped by turn for static display (BattleReplay)
 */

import { useRef, useLayoutEffect, useEffect } from 'react';

interface TurnEvent {
  type: string;
  message?: string;
  damage?: number;
  effectiveness?: string;
  isCrit?: boolean;
}

interface TurnEntry {
  turn: number;
  events?: TurnEvent[];
  end_of_turn?: {
    fighter_a_hp: number;
    fighter_b_hp: number;
  };
}

/** Flat entry for per-event reveal (ClawCombat-style). */
export type FlatLogEntry =
  | { kind: 'turn_sep'; turn: number }
  | { kind: 'chip'; type: string; message?: string; damage?: number; effectiveness?: string; isCrit?: boolean };

interface TurnLogProps {
  /** Flat entries for per-event scroll (BattleView) */
  entries?: FlatLogEntry[];
  /** Grouped turns for static display (BattleReplay) */
  turns?: TurnEntry[];
  maxHeight?: string; // kept for API compatibility, unused in horizontal layout
}

/**
 * Determine chip style based on event type.
 * type containing 'a' or 'player' = player side (blue tint).
 * type containing 'b' or 'opponent' = opponent side (orange/red tint).
 */
function getChipStyle(event: TurnEvent | (FlatLogEntry & { kind: 'chip' })): React.CSSProperties {
  const t = (event.type ?? '').toLowerCase();
  const isOpponent = t.includes('_b') || t.includes('opponent');
  const isCrit = 'isCrit' in event ? event.isCrit : false;
  const isSuperEffective = ('effectiveness' in event ? event.effectiveness : '') === 'super_effective';

  if (isCrit) {
    return {
      background: 'rgba(251, 191, 36, 0.15)',
      borderLeft: '2px solid rgba(251, 191, 36, 0.7)',
      color: 'rgba(255, 255, 255, 0.9)',
    };
  }
  if (isSuperEffective) {
    return {
      background: 'rgba(34, 197, 94, 0.15)',
      borderLeft: '2px solid rgba(34, 197, 94, 0.6)',
      color: 'rgba(255, 255, 255, 0.85)',
    };
  }
  if (isOpponent) {
    return {
      background: 'rgba(239, 68, 68, 0.1)',
      borderLeft: '2px solid rgba(239, 68, 68, 0.4)',
      color: 'rgba(255, 255, 255, 0.8)',
    };
  }
  // Player side (default)
  return {
    background: 'rgba(59, 130, 246, 0.1)',
    borderLeft: '2px solid rgba(59, 130, 246, 0.4)',
    color: 'rgba(255, 255, 255, 0.8)',
  };
}

export function TurnLog({ entries, turns }: TurnLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevEntryCountRef = useRef(0);

  const useFlat = entries != null;
  const items = useFlat ? entries : [];
  const turnItems = !useFlat ? (turns ?? []) : [];

  // Keep newest entry on the right: scroll tape so right edge of content is visible.
  const scrollTrigger = useFlat ? items.length : turnItems.length;
  const scrollToRight = useRef(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollLeft = el.scrollWidth - el.clientWidth;
    }
  });

  useLayoutEffect(() => {
    if (scrollTrigger > prevEntryCountRef.current) {
      prevEntryCountRef.current = scrollTrigger;
      scrollToRight.current();
    }
  }, [scrollTrigger]);

  useEffect(() => {
    if (scrollTrigger === 0) return;
    const id = setTimeout(() => scrollToRight.current(), 0);
    return () => clearTimeout(id);
  }, [scrollTrigger]);

  if (useFlat && items.length === 0) {
    return (
      <div className="battle-log">
        <div className="battle-log-header">
          <h3>Battle Log</h3>
        </div>
        <div
          className="battle-log-tape"
          style={{ minHeight: '52px', alignItems: 'center', paddingLeft: '12px' }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Battle starting...
          </span>
        </div>
      </div>
    );
  }

  if (!useFlat && turnItems.length === 0) {
    return (
      <div className="battle-log">
        <div className="battle-log-header">
          <h3>Battle Log</h3>
        </div>
        <div
          className="battle-log-tape"
          style={{ minHeight: '52px', alignItems: 'center', paddingLeft: '12px' }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            No events yet
          </span>
        </div>
      </div>
    );
  }

  if (useFlat) {
    const turnSeps = items.filter((e): e is FlatLogEntry & { kind: 'turn_sep' } => e.kind === 'turn_sep');
    const lastTurn = turnSeps.length > 0 ? turnSeps[turnSeps.length - 1].turn : 0;
    const turnCount = turnSeps.length || 1;
    return (
      <div className="battle-log">
        <div className="battle-log-header">
          <h3>Battle Log</h3>
          <span className="text-muted text-xs" style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>
            Turn {lastTurn} / {turnCount || 1}
          </span>
        </div>
        <div ref={scrollRef} className="battle-log-tape" role="region" aria-label="Battle log">
          <div className="battle-log-tape-inner">
            {items.map((entry, i) => {
              const isLast = i === items.length - 1;
              if (entry.kind === 'turn_sep') {
                return (
                  <div key={`sep-${entry.turn}-${i}`} className="battle-log-turn-sep">
                    Turn {entry.turn}
                  </div>
                );
              }
              return (
                <div
                  key={`chip-${i}`}
                  className={`battle-log-chip${isLast ? ' battle-log-chip-new' : ''}`}
                  style={getChipStyle(entry)}
                >
                  {entry.message ?? `${entry.type}: ${entry.damage ?? 0} dmg`}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const lastTurn = turnItems[turnItems.length - 1]?.turn ?? 0;
  return (
    <div className="battle-log">
      <div className="battle-log-header">
        <h3>Battle Log</h3>
        <span className="text-muted text-xs" style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>
          Turn {lastTurn} / {turnItems.length}
        </span>
      </div>
      <div ref={scrollRef} className="battle-log-tape">
        {turnItems.map((turn, turnIdx) => (
          <div key={turn.turn} className="battle-log-group">
            <div className="battle-log-turn-sep">Turn {turn.turn}</div>
            {turn.events?.map((event, i) => {
              const isNewest = turnIdx === turnItems.length - 1;
              return (
                <div
                  key={i}
                  className={`battle-log-chip${isNewest ? ' battle-log-chip-new' : ''}`}
                  style={getChipStyle(event)}
                >
                  {event.message ?? `${event.type}: ${event.damage ?? 0} dmg`}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
