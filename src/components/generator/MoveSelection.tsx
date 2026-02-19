/**
 * MoveSelection — select 4 moves for a combat-ready Wojak
 *
 * Shows available moves for the calculated combat type.
 * User picks exactly 4, must include at least 1 damaging move.
 */

import { useMemo, useState, useCallback } from 'react';
import { getMovePoolForType, validateMoveSelection } from '@/lib/combat/data/moves';
import type { CombatType, CombatMove } from '@/lib/combat/types';

interface MoveSelectionProps {
  type: CombatType;
  selectedMoves: string[];
  onSelectionChange: (moveIds: string[]) => void;
}

function categoryLabel(cat: string): string {
  if (cat === 'physical') return 'PHY';
  if (cat === 'special') return 'SPC';
  return 'STS';
}

export function MoveSelection({ type, selectedMoves, onSelectionChange }: MoveSelectionProps) {
  const [hoveredMove, setHoveredMove] = useState<string | null>(null);

  const pool = useMemo(() => getMovePoolForType(type), [type]);

  const toggleMove = useCallback((moveId: string) => {
    if (selectedMoves.includes(moveId)) {
      onSelectionChange(selectedMoves.filter(id => id !== moveId));
    } else if (selectedMoves.length < 4) {
      onSelectionChange([...selectedMoves, moveId]);
    }
  }, [selectedMoves, onSelectionChange]);

  const validation = useMemo(() => {
    if (selectedMoves.length !== 4) return null;
    return validateMoveSelection(selectedMoves, type);
  }, [selectedMoves, type]);

  const hoveredData = useMemo(() => {
    if (!hoveredMove) return null;
    return pool.find(m => m.id === hoveredMove) ?? null;
  }, [hoveredMove, pool]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Select 4 Moves</h3>
        <span className="text-xs text-secondary">
          {selectedMoves.length}/4 selected
        </span>
      </div>

      {/* Move description tooltip */}
      {hoveredData && (
        <div className="combat-preview-badge text-xs">
          <span className="font-semibold">{hoveredData.name}</span>
          <span className="text-muted">—</span>
          <span className="text-secondary">{hoveredData.description}</span>
        </div>
      )}

      {/* Move grid */}
      <div className="grid grid-cols-2 gap-2">
        {pool.map((move: CombatMove) => {
          const isSelected = selectedMoves.includes(move.id);
          const isDisabled = !isSelected && selectedMoves.length >= 4;

          return (
            <button
              key={move.id}
              className={`move-btn ${isSelected ? 'selected' : ''}`}
              disabled={isDisabled}
              onClick={() => toggleMove(move.id)}
              onMouseEnter={() => setHoveredMove(move.id)}
              onMouseLeave={() => setHoveredMove(null)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm truncate">{move.name}</span>
                <span className="text-xs text-muted whitespace-nowrap">
                  {categoryLabel(move.category)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-secondary mt-1">
                {move.power > 0 && <span>Pow {move.power}</span>}
                <span>Acc {move.accuracy}%</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Validation feedback */}
      {validation && !validation.valid && (
        <p className="text-xs text-error">
          {validation.error}
        </p>
      )}
      {selectedMoves.length === 4 && validation?.valid && (
        <p className="text-xs text-success">
          Move selection complete
        </p>
      )}
    </div>
  );
}
