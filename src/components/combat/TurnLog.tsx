/**
 * TurnLog — scrollable turn-by-turn battle results with auto-scroll and entry animations.
 */

import { useRef, useState, useEffect } from 'react';

interface TurnEntry {
  turn: number;
  events?: Array<{
    type: string;
    message?: string;
    damage?: number;
    effectiveness?: string;
    isCrit?: boolean;
  }>;
  end_of_turn?: {
    fighter_a_hp: number;
    fighter_b_hp: number;
  };
}

interface TurnLogProps {
  turns: TurnEntry[];
  maxHeight?: string;
}

type TurnEvent = NonNullable<TurnEntry['events']>[number];

function getEntryClass(event: TurnEvent): string {
  if (!event) return 'turn-entry';
  if (event.isCrit) return 'turn-entry turn-crit';
  if (event.effectiveness === 'super_effective') return 'turn-entry turn-super-effective';
  if (event.effectiveness === 'not_very_effective') return 'turn-entry turn-not-effective';
  return 'turn-entry';
}

export function TurnLog({ turns, maxHeight = '300px' }: TurnLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [prevTurnCount, setPrevTurnCount] = useState(0);
  const [animatingTurn, setAnimatingTurn] = useState<number | null>(null);

  // Auto-scroll to bottom and trigger entry animation on new turns
  useEffect(() => {
    if (turns.length > prevTurnCount) {
      // Mark newest turn for animation
      setAnimatingTurn(turns.length > 0 ? turns[turns.length - 1].turn : null);

      // Auto-scroll to bottom
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });

      // Clear animation class after animation completes
      const timer = setTimeout(() => {
        setAnimatingTurn(null);
      }, 400);

      setPrevTurnCount(turns.length);
      return () => clearTimeout(timer);
    }
  }, [turns, prevTurnCount]);

  if (turns.length === 0) {
    return (
      <div className="text-center text-muted text-sm py-4">
        No turns yet.
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex flex-col gap-2 overflow-y-auto hide-scrollbar"
      style={{ maxHeight }}
    >
      {turns.map((turn) => {
        const isNewTurn = turn.turn === animatingTurn;
        return (
          <div key={turn.turn} className="flex flex-col gap-1">
            <span className="text-xs text-muted font-semibold">Turn {turn.turn}</span>
            {turn.events?.map((event, i) => {
              const baseClass = getEntryClass(event);
              const animClass = isNewTurn
                ? `turn-entry-animated stagger-${Math.min(i + 1, 4)}`
                : '';
              return (
                <div key={i} className={`${baseClass} ${animClass}`}>
                  {event.message ?? `${event.type}: ${event.damage ?? 0} damage`}
                </div>
              );
            })}
            {turn.end_of_turn && (
              <div className={`text-xs text-muted pl-3 ${isNewTurn ? 'turn-entry-animated stagger-4' : ''}`}>
                HP: A={turn.end_of_turn.fighter_a_hp} | B={turn.end_of_turn.fighter_b_hp}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
