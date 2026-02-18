/**
 * TurnLog — scrollable turn-by-turn battle results.
 */

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

function getEntryClass(event: TurnEntry['events'] extends (infer T)[] ? T : never): string {
  if (!event) return 'turn-entry';
  if (event.isCrit) return 'turn-entry turn-crit';
  if (event.effectiveness === 'super_effective') return 'turn-entry turn-super-effective';
  if (event.effectiveness === 'not_very_effective') return 'turn-entry turn-not-effective';
  return 'turn-entry';
}

export function TurnLog({ turns, maxHeight = '300px' }: TurnLogProps) {
  if (turns.length === 0) {
    return (
      <div className="text-center text-muted text-sm py-4">
        No turns yet.
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-2 overflow-y-auto hide-scrollbar"
      style={{ maxHeight }}
    >
      {turns.map((turn) => (
        <div key={turn.turn} className="flex flex-col gap-1">
          <span className="text-xs text-muted font-semibold">Turn {turn.turn}</span>
          {turn.events?.map((event, i) => (
            <div key={i} className={getEntryClass(event)}>
              {event.message ?? `${event.type}: ${event.damage ?? 0} damage`}
            </div>
          ))}
          {turn.end_of_turn && (
            <div className="text-xs text-muted pl-3">
              HP: A={turn.end_of_turn.fighter_a_hp} | B={turn.end_of_turn.fighter_b_hp}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
