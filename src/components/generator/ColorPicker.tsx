/* eslint-disable react-refresh/only-export-components */
/**
 * Color Picker Component
 *
 * Curated palette for user-customizable layer colors.
 * Grouped by hue family, 6 per row. Selected swatch gets an animated rainbow border.
 * Exposes hovered/selected hex via onHexDisplay callback for parent to render.
 */

import { memo, useCallback, useState, useEffect, useMemo } from 'react';
import { useLayout } from '@/hooks/useLayout';
import { ChevronDown, ChevronUp } from 'lucide-react';

/** Number of color rows shown by default on mobile before "Show all" */
const MOBILE_COLLAPSED_ROWS = 8;

// ============ Generator color palette ============
// V2 palette: 15 families × 6 colors = 90 unique colors. All 18 combat types reachable (3–8 primary colors each).
// Each family ordered light → dark (left to right). See docs/COLOR-PALETTE-V2-SPEC.md.

export const COLOR_FAMILIES: { label: string; colors: string[] }[] = [
  // Row 1 — Reds → FIRE
  { label: 'Reds',           colors: ['#FF6347','#FF0000','#DC143C','#C0392B','#B22222','#992222'] },

  // Row 2 — Crimsons → MARTIAL (same hue as Reds, darker band)
  { label: 'Crimsons',       colors: ['#7B1111','#6B0000','#5C0000','#4A0000','#380000','#1A0000'] },

  // Row 3 — Oranges → DRAGON
  { label: 'Oranges',        colors: ['#FFA500','#FF8C00','#FF6B00','#E65C00','#CC5200','#B34400'] },

  // Row 4 — Yellows → ELECTRIC
  { label: 'Yellows',        colors: ['#FFFF00','#FFD700','#CCFF00','#D4E500','#C8D600','#A8B800'] },

  // Row 5 — Yellow-Greens → INSECT
  { label: 'Yellow-Greens',  colors: ['#ADFF2F','#9ACD32','#8DB600','#7CB518','#6B8E23','#4A6520'] },

  // Row 6 — Greens → GRASS
  { label: 'Greens',         colors: ['#00FF00','#32CD32','#22C55E','#16A34A','#2E8B57','#1A5C38'] },

  // Row 7 — Teals → WATER / ICE
  { label: 'Teals',          colors: ['#00FFFF','#40E0D0','#00CED1','#20B2AA','#0891B2','#0E7490'] },

  // Row 8 — Sky Blues → AIR
  { label: 'Sky Blues',      colors: ['#E0F7FF','#BAE6FD','#7DD3FC','#60A5FA','#93C5FD','#38BDF8'] },

  // Row 9 — Blues → WATER / PSYCHE
  { label: 'Blues',          colors: ['#1E90FF','#3B82F6','#2563EB','#1D4ED8','#1E3A8A','#172554'] },

  // Row 10 — Purples → PSYCHE
  { label: 'Purples',        colors: ['#C084FC','#A855F7','#9333EA','#7C3AED','#6D28D9','#5B21B6'] },

  // Row 11 — Indigos → GHOST
  { label: 'Indigos',        colors: ['#4B0082','#3B006B','#2E0054','#210040','#170030','#0D001A'] },

  // Row 12 — Magentas → VENOM
  { label: 'Magentas',       colors: ['#FF00FF','#E879F9','#D946EF','#A21CAF','#86198F','#6B1278'] },

  // Row 13 — Pinks → MYSTIC
  { label: 'Pinks',          colors: ['#FFB3D9','#FF69B4','#EC4899','#DB2777','#BE185D','#9D174D'] },

  // Row 14 — Earth & Olive → EARTH
  { label: 'Earth & Olive',  colors: ['#C8A87A','#A67C52','#8B7355','#6B5C3E','#5C4A1E','#3D2B1F'] },

  // Row 15 — Neutrals (achromatic ramp: ICE → AIR → METAL → NEUTRAL → STONE → SHADOW)
  { label: 'Neutrals',       colors: ['#FFFFFF','#C8C8C8','#999999','#666666','#404040','#171717'] },
];

export const GENERATOR_PALETTE_HEX: string[] = COLOR_FAMILIES.flatMap((f) => f.colors);

export const QUICK_ACCESS_COLORS = [
  '#FF0000',  // FIRE
  '#FF8C00',  // DRAGON
  '#FFFF00',  // ELECTRIC
  '#9ACD32',  // INSECT
  '#22C55E',  // GRASS
  '#00CED1',  // WATER
  '#7DD3FC',  // AIR
  '#3B82F6',  // WATER/PSYCHE
  '#A855F7',  // PSYCHE
  '#4B0082',  // GHOST
  '#D946EF',  // VENOM
  '#EC4899',  // MYSTIC
  '#8B7355',  // EARTH
  '#6B0000',  // MARTIAL
  '#999999',  // NEUTRAL/METAL
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
  const { isDesktop } = useLayout();
  const norm = useCallback((h: string) => (h.startsWith('#') ? h : '#' + h).toUpperCase(), []);
  const selectedNorm = norm(selectedColor);

  const [hoverHex, setHoverHex] = useState<string | null>(null);
  const [userExpanded, setUserExpanded] = useState(false);

  // Auto-expand if selected color is in hidden rows (mobile only)
  const autoExpand = useMemo(() => {
    if (isDesktop) return false;
    const hiddenFamilies = COLOR_FAMILIES.slice(MOBILE_COLLAPSED_ROWS);
    return hiddenFamilies.some((f) => f.colors.some((c) => norm(c) === selectedNorm));
  }, [selectedNorm, norm, isDesktop]);
  const expanded = userExpanded || autoExpand;

  // Notify parent of display hex (hover takes priority over selected)
  const displayHex = hoverHex ? norm(hoverHex) : selectedNorm;
  useEffect(() => {
    if (onHexDisplay) onHexDisplay(displayHex);
  }, [displayHex, onHexDisplay]);

  const Swatch = ({ hex, cornerRadius = '0' }: { hex: string; cornerRadius?: string }) => {
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
          className={`w-full aspect-square transition-opacity${isSelected ? ' color-picker-rainbow-swatch' : ''}`}
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
            borderRadius: cornerRadius,
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

  // On mobile, show collapsed rows by default; desktop always shows all
  const isMobileCollapsed = !isDesktop && !expanded;
  const visibleFamilies = isMobileCollapsed
    ? COLOR_FAMILIES.slice(0, MOBILE_COLLAPSED_ROWS)
    : COLOR_FAMILIES;
  const totalVisible = visibleFamilies.length;
  const hasHiddenRows = !isDesktop && COLOR_FAMILIES.length > MOBILE_COLLAPSED_ROWS;

  return (
    <div style={{ opacity: disabled ? 0.5 : 1 }}>
      {/* Color swatches — zero-gap color chart */}
      <div className="flex flex-col gap-0">
        {visibleFamilies.map((family, familyIdx) => (
          <div key={family.label} className="grid grid-cols-6 gap-0">
            {family.colors.map((hex, i) => {
              // Compute corner radius for the 4 outer corners
              let borderRadius = '0';
              const r = '14px';
              if (familyIdx === 0 && i === 0) borderRadius = `${r} 0 0 0`;
              else if (familyIdx === 0 && i === 5) borderRadius = `0 ${r} 0 0`;
              else if (familyIdx === totalVisible - 1 && i === 0 && !isMobileCollapsed) borderRadius = `0 0 0 ${r}`;
              else if (familyIdx === totalVisible - 1 && i === 5 && !isMobileCollapsed) borderRadius = `0 0 ${r} 0`;

              return <Swatch key={`${family.label}-${i}`} hex={hex} cornerRadius={borderRadius} />;
            })}
          </div>
        ))}
      </div>

      {/* Mobile: show all / collapse toggle */}
      {hasHiddenRows && (
        <button
          type="button"
          className="w-full flex items-center justify-center gap-1 py-2 text-xs text-muted font-medium transition-colors"
          onClick={() => setUserExpanded((v) => !v)}
          style={{ background: 'transparent' }}
        >
          {expanded ? (
            <>Less colors <ChevronUp size={14} /></>
          ) : (
            <>All colors <ChevronDown size={14} /></>
          )}
        </button>
      )}
    </div>
  );
});

export default ColorPicker;
