/**
 * MilitaryBeretSwatches — color swatch grid for upgrading G1 Military Beret to G2
 *
 * Picking a color triggers the G2 upgrade. Reuses the same palette
 * layout as the main ColorPicker (quick-access row + families).
 */

import { COLOR_FAMILIES, QUICK_ACCESS_COLORS } from './ColorPicker';

export interface MilitaryBeretSwatchesProps {
  onColorPick: (color: string) => void;
  disabled?: boolean;
}

export function MilitaryBeretSwatches({ onColorPick, disabled }: MilitaryBeretSwatchesProps) {
  const Swatch = ({ hex }: { hex: string }) => (
    <button
      type="button"
      className="w-5 h-5 rounded flex-shrink-0 transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: hex,
        border: '2px solid var(--color-border)',
        boxSizing: 'border-box',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onClick={() => !disabled && onColorPick(hex)}
      disabled={disabled}
      aria-label={`Use new design with color ${hex}`}
    />
  );
  return (
    <div className="flex flex-col gap-1.5">
      {/* Quick-access row — matches ColorPicker layout */}
      <div className="grid grid-cols-5 gap-1">
        {QUICK_ACCESS_COLORS.map((hex) => (
          <Swatch key={hex} hex={hex} />
        ))}
      </div>
      {COLOR_FAMILIES.map((family) => (
        <div key={family.label} className="grid grid-cols-6 gap-1">
          {family.colors.map((hex) => (
            <Swatch key={hex} hex={hex} />
          ))}
        </div>
      ))}
    </div>
  );
}
