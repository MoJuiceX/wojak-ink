/**
 * SortControls — toolbar for sorting traits and clearing selections.
 */

import { Ban, Grid2X2, Grid3X3 } from 'lucide-react';
import type { TraitSortMode } from './TraitSelector';

export interface SortControlsProps {
  sortMode: TraitSortMode;
  onSortChange: (mode: TraitSortMode) => void;
  canClear?: boolean;
  isCleared?: boolean;
  onClear?: () => void;
  /** Mobile grid columns (2 or 3) */
  gridCols?: 2 | 3;
  onGridColsChange?: (cols: 2 | 3) => void;
}

export function SortControls({ sortMode, onSortChange, canClear, isCleared, onClear, gridCols, onGridColsChange }: SortControlsProps) {
  const isAlpha = sortMode === 'az' || sortMode === 'za';

  const handleAlphaClick = () => {
    if (sortMode === 'az') {
      onSortChange('za');
    } else if (sortMode === 'za') {
      onSortChange('az');
    } else {
      onSortChange('az');
    }
  };

  return (
    <div className="trait-sort-bar" role="toolbar" aria-label="Trait controls">
      <div className="trait-sort-leading">
        {/* Clear button — always rendered for layout stability, disabled when layer is required */}
        <button
          type="button"
          className={`trait-sort-clear ${isCleared ? 'trait-sort-clear--active' : ''} ${!canClear ? 'trait-sort-clear--disabled' : ''}`}
          onClick={canClear && onClear ? onClear : undefined}
          disabled={!canClear}
          aria-label="Clear selection"
          title={canClear ? 'Clear selection' : 'This layer is required'}
        >
          <Ban size={14} />
        </button>
        <div className="trait-sort-divider" aria-hidden="true" />
      </div>

      {/* Sort buttons — right side */}
      <div className="trait-sort-buttons">
        <div className="trait-sort-group" aria-label="Trait usage sorting">
          <button
            type="button"
            className={`trait-sort-btn ${sortMode === 'hot' ? 'trait-sort-btn--active' : ''}`}
            onClick={() => onSortChange('hot')}
            aria-label="Most used first"
            aria-pressed={sortMode === 'hot'}
            title="Most used first"
          >
            🔥
          </button>
          <button
            type="button"
            className={`trait-sort-btn ${sortMode === 'not' ? 'trait-sort-btn--active' : ''}`}
            onClick={() => onSortChange('not')}
            aria-label="Least used first"
            aria-pressed={sortMode === 'not'}
            title="Least used first"
          >
            💀
          </button>
        </div>

        <div className="trait-sort-buttons-divider" aria-hidden="true" />

        <div className="trait-sort-group" aria-label="Trait ordering controls">
          <button
            type="button"
            className={`trait-sort-btn trait-sort-btn--text ${isAlpha ? 'trait-sort-btn--active' : ''}`}
            onClick={handleAlphaClick}
            aria-label={sortMode === 'za' ? 'Z to A' : 'A to Z'}
            aria-pressed={isAlpha}
            title={sortMode === 'za' ? 'Z to A' : 'A to Z'}
          >
            {sortMode === 'za' ? 'Z→A' : 'A→Z'}
          </button>

          {/* Grid column toggle — mobile only */}
          {onGridColsChange && (
            <button
              type="button"
              className="trait-sort-btn trait-sort-grid-toggle"
              onClick={() => onGridColsChange(gridCols === 2 ? 3 : 2)}
              aria-label={gridCols === 2 ? 'Switch to 3 columns' : 'Switch to 2 columns'}
              title={gridCols === 2 ? '3 columns' : '2 columns'}
            >
              {gridCols === 2 ? <Grid3X3 size={14} /> : <Grid2X2 size={14} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
