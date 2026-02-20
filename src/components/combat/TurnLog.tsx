/**
 * TurnLog — horizontal scrolling battle chip ticker.
 * New events slide in from the right, older events pushed left.
 * Modelled after ClawCombat's battle history panel.
 */

import { useRef, useEffect } from 'react';

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

interface TurnLogProps {
  turns: TurnEntry[];
  maxHeight?: string; // kept for API compatibility, unused in horizontal layout
}

/**
 * Determine chip style based on event type.
 * type containing 'a' or 'player' = player side (blue tint).
 * type containing 'b' or 'opponent' = opponent side (orange/red tint).
 */
function getChipStyle(event: TurnEvent): React.CSSProperties {
  const t = event.type?.toLowerCase() ?? '';
  const isOpponent = t.includes('_b') || t.includes('opponent');
  const isCrit = event.isCrit;
  const isSuperEffective = event.effectiveness === 'super_effective';

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

export function TurnLog({ turns }: TurnLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevTurnCountRef = useRef(0);

  // Auto-scroll to rightmost (newest) entry on new turns
  useEffect(() => {
    if (turns.length > prevTurnCountRef.current) {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
        }
      });
      prevTurnCountRef.current = turns.length;
    }
  }, [turns]);

  if (turns.length === 0) {
    return (
      <div
        style={{
          minHeight: '52px',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '12px',
        }}
      >
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          Battle starting...
        </span>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="battle-log-tape"
    >
      {turns.map((turn, turnIdx) => (
        <div key={turn.turn} className="battle-log-group">
          {/* Turn separator chip */}
          <div className="battle-log-turn-sep">
            Turn {turn.turn}
          </div>

          {/* Event chips */}
          {turn.events?.map((event, i) => {
            const isNewest = turnIdx === turns.length - 1;
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
  );
}
