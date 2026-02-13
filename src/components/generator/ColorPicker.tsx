/**
 * Color Picker Component
 *
 * Curated palette for user-customizable layer colors.
 * Grouped by hue family with labels, collapsible sections, quick-access row.
 * 4 colors per row, compact layout.
 */

import { memo, useCallback, useState, type CSSProperties } from 'react';
import { RotateCcw } from 'lucide-react';

// ============ Generator color palette ============
// Must-haves from palette images + generator defaults; 6 per family for balance.
// Each family ordered light → dark (left to right). See docs/GENERATOR-COLOR-PALETTE.md.

export const COLOR_FAMILIES: { label: string; colors: string[] }[] = [
  { label: 'Reds', colors: ['#FFC0CB', '#FF69B4', '#FF6347', '#FF0000', '#FF1493', '#8B0000'] },
  { label: 'Oranges', colors: ['#FFFF00', '#FFD700', '#FACC15', '#FFA500', '#FF8C00', '#FF6B00'] },
  { label: 'Greens', colors: ['#00FF00', '#7CFC00', '#32CD32', '#16a34a', '#2E8B57', '#228B22'] },
  { label: 'Teals & Cyan', colors: ['#00FFFF', '#00d4ff', '#40E0D0', '#00CED1', '#20B2AA', '#0891b2'] },
  { label: 'Blues', colors: ['#00BFFF', '#1E90FF', '#3b82f6', '#2563EB', '#0000CD', '#000080'] },
  { label: 'Purples', colors: ['#BA55D3', '#a855f7', '#A020F0', '#7c3aed', '#800080', '#6d28d9'] },
  { label: 'Pinks & Magenta', colors: ['#FFC0CB', '#f9a8d4', '#FF69B4', '#ec4899', '#FF1493', '#FF00FF'] },
  { label: 'Browns', colors: ['#D2B48C', '#D4AF37', '#CD7F32', '#A0522D', '#8B4513', '#633800'] },
  { label: 'Neutrals', colors: ['#FFFFFF', '#F5F5DC', '#C0C0C0', '#808080', '#404040', '#262626'] },
];

export const GENERATOR_PALETTE_HEX: string[] = COLOR_FAMILIES.flatMap((f) => f.colors);

export const QUICK_ACCESS_COLORS = [
  '#FF0000', '#FF6B00', '#FFD700', '#22c55e', '#00d4ff',
  '#3b82f6', '#a855f7', '#ec4899', '#FFFFFF', '#262626',
];

// ============ Component ============

interface ColorPickerProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
  label?: string;
  /** When true, swatches are grayed out and not clickable */
  disabled?: boolean;
  /** Default/original color for the trait — shows a "Default" reset button in the palette */
  defaultColor?: string;
  /** When provided, Default button calls this instead of onColorChange(defaultColor) — e.g. reset to G1 layer */
  onReset?: () => void;
}

export const ColorPicker = memo(function ColorPicker({
  selectedColor,
  onColorChange,
  disabled = false,
  defaultColor,
  onReset,
}: ColorPickerProps) {
  const norm = useCallback((h: string) => (h.startsWith('#') ? h : '#' + h).toUpperCase(), []);
  const selectedNorm = norm(selectedColor);
  const isDefault = defaultColor ? selectedNorm === norm(defaultColor) : false;

  const [hoverHex, setHoverHex] = useState<string | null>(null);

  const Swatch = ({ hex, tooltipBelow = false }: { hex: string; tooltipBelow?: boolean }) => {
    const isSelected = selectedNorm === norm(hex);
    const isWhite = norm(hex) === '#FFFFFF' || hex.toLowerCase() === '#ffffff';
    const isBlack = hex === '#000000';
    const borderColor = isSelected
      ? 'var(--color-primary, #ff6b00)'
      : isWhite
        ? 'rgba(255,255,255,0.25)'
        : isBlack
          ? 'var(--color-border)'
          : 'rgba(255,255,255,0.12)';
    const hexDisplay = (hex.startsWith('#') ? hex : '#' + hex).toUpperCase();
    const tooltipStyle: CSSProperties = tooltipBelow
      ? { top: '100%', left: '50%', transform: 'translateX(-50%) translateY(4px)' }
      : { bottom: '100%', left: '50%', transform: 'translateX(-50%) translateY(-4px)' };
    return (
      <div
        className="relative"
        onMouseEnter={() => setHoverHex(hex)}
        onMouseLeave={() => setHoverHex(null)}
      >
        <button
          type="button"
          className="w-full aspect-square rounded transition-opacity"
          style={{
            background: hex,
            border: `2px solid ${borderColor}`,
            boxSizing: 'border-box',
            boxShadow: isSelected
              ? '0 0 4px var(--glow-primary, rgba(255,107,0,0.5))'
              : isWhite
                ? 'inset 0 1px 0 rgba(255,255,255,0.2)'
                : 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            pointerEvents: disabled ? 'none' : 'auto',
            outline: 'none',
          }}
          onClick={() => !disabled && onColorChange(hex)}
          disabled={disabled}
          aria-label={`Select color ${hexDisplay}`}
        />
        {hoverHex === hex && !disabled && (
          <div
            className="absolute z-50 px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap pointer-events-none"
            style={{
              ...tooltipStyle,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {hexDisplay}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-1" style={{ opacity: disabled ? 0.5 : 1 }}>
      {/* Color swatches by family — 6 columns, fluid width */}
      <div className="flex flex-col gap-1">
        {COLOR_FAMILIES.map((family) => (
          <div key={family.label} className="grid grid-cols-6 gap-1">
            {family.colors.map((hex, i) => (
              <Swatch key={`${family.label}-${i}`} hex={hex} />
            ))}
          </div>
        ))}
      </div>

      {/* Reset — compact row below swatches */}
      {(defaultColor || onReset) && (
        <button
          type="button"
          className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            color: isDefault ? 'var(--color-text-muted)' : 'var(--color-primary)',
            background: isDefault ? 'transparent' : 'rgba(255, 107, 0, 0.1)',
            cursor: disabled || isDefault ? 'default' : 'pointer',
            opacity: isDefault ? 0.4 : 1,
          }}
          onClick={() => !disabled && !isDefault && (onReset ? onReset() : onColorChange(defaultColor!))}
          disabled={disabled || isDefault}
          title={onReset ? 'Use original design' : 'Reset to default color'}
        >
          <RotateCcw size={12} />
          <span>{onReset ? 'Use original' : 'Reset'}</span>
        </button>
      )}
    </div>
  );
});

export default ColorPicker;
