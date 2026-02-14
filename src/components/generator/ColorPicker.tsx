/**
 * Color Picker Component
 *
 * Curated palette for user-customizable layer colors.
 * Grouped by hue family, 6 per row. Selected swatch gets an animated rainbow border.
 * Exposes hovered/selected hex via onHexDisplay callback for parent to render.
 */

import { memo, useCallback, useState, useEffect } from 'react';

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
  /** Called with the hex code to display (hovered or selected). Parent can render it in a header. */
  onHexDisplay?: (hex: string) => void;
}

export const ColorPicker = memo(function ColorPicker({
  selectedColor,
  onColorChange,
  disabled = false,
  onHexDisplay,
}: ColorPickerProps) {
  const norm = useCallback((h: string) => (h.startsWith('#') ? h : '#' + h).toUpperCase(), []);
  const selectedNorm = norm(selectedColor);

  const [hoverHex, setHoverHex] = useState<string | null>(null);

  // Notify parent of display hex (hover takes priority over selected)
  const displayHex = hoverHex ? norm(hoverHex) : selectedNorm;
  useEffect(() => {
    if (onHexDisplay) onHexDisplay(displayHex);
  }, [displayHex, onHexDisplay]);

  const Swatch = ({ hex }: { hex: string }) => {
    const isSelected = selectedNorm === norm(hex);
    const isWhite = norm(hex) === '#FFFFFF' || hex.toLowerCase() === '#ffffff';
    const isBlack = hex === '#000000';
    const hexDisplay = (hex.startsWith('#') ? hex : '#' + hex).toUpperCase();
    return (
      <div
        className="relative"
        style={{ zIndex: isSelected ? 2 : 0 }}
        onMouseEnter={() => setHoverHex(hex)}
        onMouseLeave={() => setHoverHex(null)}
      >
        <button
          type="button"
          className={`w-full aspect-square rounded-md transition-opacity${isSelected ? ' color-picker-rainbow-swatch' : ''}`}
          style={{
            background: isSelected
              ? `linear-gradient(${hex}, ${hex}) padding-box, conic-gradient(from var(--rainbow-angle), #ff0000, #ff8800, #ffff00, #00ff00, #00ffff, #0088ff, #8800ff, #ff00ff, #ff0000) border-box`
              : hex,
            border: isSelected
              ? '2px solid transparent'
              : isWhite
                ? '2px solid rgba(255,255,255,0.25)'
                : isBlack
                  ? '2px solid var(--color-border)'
                  : '2px solid rgba(255,255,255,0.12)',
            boxSizing: 'border-box',
            cursor: disabled ? 'not-allowed' : 'pointer',
            pointerEvents: disabled ? 'none' : 'auto',
            outline: 'none',
          }}
          onClick={() => !disabled && onColorChange(hex)}
          disabled={disabled}
          aria-label={`Select color ${hexDisplay}`}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-1.5" style={{ opacity: disabled ? 0.5 : 1 }}>
      {/* Color swatches by family — 6 columns */}
      {COLOR_FAMILIES.map((family) => (
        <div key={family.label} className="grid grid-cols-6 gap-1.5">
          {family.colors.map((hex, i) => (
            <Swatch key={`${family.label}-${i}`} hex={hex} />
          ))}
        </div>
      ))}
    </div>
  );
});

export default ColorPicker;
