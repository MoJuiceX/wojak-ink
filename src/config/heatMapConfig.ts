/**
 * Heat Map Configuration
 *
 * Configuration for the accessible heat map visualization.
 */

import type {
  RarityBin,
  PriceBin,
  HeatMapViewMode,
} from '@/types/bigpulp';

// ============ Grid Dimensions ============

export const HEATMAP_CONFIG = {
  rarityBins: 10, // 10 rows (rarity)
  priceBins: 10, // 10 columns (price) - finer detail for 0-2 XCH range
  totalCells: 100, // 10 x 10

  // Cell dimensions
  cellMinSize: 48, // px
  cellGap: 3, // px
  cellBorderRadius: 6, // px

  // Hover
  hoverScale: 1.15,
  hoverZIndex: 10,
} as const;

// ============ Rarity Bins ============

export const RARITY_BINS: RarityBin[] = [
  { index: 0, label: 'Top 10%', minRank: 1, maxRank: 420 },
  { index: 1, label: '20%', minRank: 421, maxRank: 840 },
  { index: 2, label: '30%', minRank: 841, maxRank: 1260 },
  { index: 3, label: '40%', minRank: 1261, maxRank: 1680 },
  { index: 4, label: '50%', minRank: 1681, maxRank: 2100 },
  { index: 5, label: '60%', minRank: 2101, maxRank: 2520 },
  { index: 6, label: '70%', minRank: 2521, maxRank: 2940 },
  { index: 7, label: '80%', minRank: 2941, maxRank: 3360 },
  { index: 8, label: '90%', minRank: 3361, maxRank: 3780 },
  { index: 9, label: 'Bottom 10%', minRank: 3781, maxRank: 4200 },
];

// ============ Price Bins ============

export const PRICE_BINS: PriceBin[] = [
  { index: 0, label: '0-0.5', minPrice: 0, maxPrice: 0.5 },
  { index: 1, label: '0.5-1', minPrice: 0.5, maxPrice: 1 },
  { index: 2, label: '1-1.5', minPrice: 1, maxPrice: 1.5 },
  { index: 3, label: '1.5-2', minPrice: 1.5, maxPrice: 2 },
  { index: 4, label: '2-3', minPrice: 2, maxPrice: 3 },
  { index: 5, label: '3-4', minPrice: 3, maxPrice: 4 },
  { index: 6, label: '4-5', minPrice: 4, maxPrice: 5 },
  { index: 7, label: '5-6', minPrice: 5, maxPrice: 6 },
  { index: 8, label: '6-10', minPrice: 6, maxPrice: 10 },
  { index: 9, label: '10+', minPrice: 10, maxPrice: Infinity },
];

// ============ Color Palettes ============

// Amber/Orange palette (default for most themes)
const AMBER_INTENSITY = [
  'transparent',           // 0 (empty cell)
  'rgba(255, 149, 0, 0.20)', // 1 NFT
  'rgba(255, 149, 0, 0.35)', // 2-3 NFTs
  'rgba(255, 149, 0, 0.50)', // 4-5 NFTs
  'rgba(255, 149, 0, 0.65)', // 6-7 NFTs
  'rgba(255, 149, 0, 0.80)', // 8-9 NFTs
  'rgba(255, 149, 0, 0.95)', // 10+ NFTs
];

/**
 * Get the intensity color palette (always amber/orange)
 */
export function getIntensityPalette(_themeId?: string): readonly string[] {
  return AMBER_INTENSITY;
}

export const HEATMAP_COLORS = {
  // Default intensity palette (amber)
  intensity: AMBER_INTENSITY,

  // View mode overlays
  viewModeOverlays: {
    'sleepy-deals': 'rgba(34, 197, 94, 0.3)', // Green
    'delusion-zones': 'rgba(239, 68, 68, 0.3)', // Red
    'floor-snipes': 'rgba(59, 130, 246, 0.3)', // Blue
    'rare-reasonable': 'rgba(168, 85, 247, 0.3)', // Purple
    'whale-territory': 'rgba(251, 191, 36, 0.3)', // Gold
  },

  // Focus/selected
  focus: 'var(--color-brand-primary)',
  selected: 'var(--color-brand-glow)',
} as const;

/**
 * Get color for intensity value (0-1)
 * Uses logarithmic scaling for better visual differentiation with small counts
 * @param intensity - Value between 0-1
 * @param themeId - Optional theme ID to determine color palette
 */
export function getColorForIntensity(intensity: number, themeId?: string): string {
  const palette = themeId ? getIntensityPalette(themeId) : HEATMAP_COLORS.intensity;

  if (intensity === 0) return palette[0];

  // Convert intensity back to approximate count (intensity = count/50)
  const approxCount = intensity * 50;

  // Use stepped thresholds for clearer differentiation
  // 1 NFT = index 1, 2-3 = index 2, 4-5 = index 3, 6-7 = index 4, 8-9 = index 5, 10+ = index 6
  let index: number;
  if (approxCount >= 10) index = 6;
  else if (approxCount >= 8) index = 5;
  else if (approxCount >= 6) index = 4;
  else if (approxCount >= 4) index = 3;
  else if (approxCount >= 2) index = 2;
  else index = 1;

  return palette[index];
}

/**
 * Get high-density pattern CSS for cells with intensity > 0.7
 */
export function getHighDensityPattern(intensity: number): string | undefined {
  if (intensity > 0.7) {
    return 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)';
  }
  return undefined;
}

// ============ View Mode Configurations ============

export interface ViewModeConfig {
  id: HeatMapViewMode;
  label: string;
  description: string;
  filter: (rarityBinIndex: number, priceBinIndex: number) => boolean;
}

export const VIEW_MODES: ViewModeConfig[] = [
  {
    id: 'all',
    label: 'All',
    description: 'Show all listings',
    filter: () => true,
  },
  {
    id: 'sleepy-deals',
    label: 'Sleepy Deals',
    description: 'Good value: decent rarity, low price',
    // Top 30% rarity (bins 0-2), low price (bins 0-2)
    filter: (r, p) => r <= 2 && p <= 2,
  },
  {
    id: 'delusion-zones',
    label: "This better be 'high provenance' or else...",
    description: 'Overpriced: low rarity, high price',
    // Bottom 40% rarity (bins 6-9), high price (bins 5-7)
    filter: (r, p) => r >= 6 && p >= 5,
  },
  {
    id: 'floor-snipes',
    label: 'Floor Price',
    description: 'Near floor price listings',
    // First price column only (0-1 XCH)
    filter: (_, p) => p === 0,
  },
  {
    id: 'whale-territory',
    label: 'Moon Territory',
    description: 'High price listings',
    // High price (bins 6-7 = 6+ XCH)
    filter: (_, p) => p >= 6,
  },
];

// ============ Accessibility ============

/**
 * Generate accessible label for a cell
 */
export function getCellAccessibleLabel(
  rarityBin: RarityBin,
  priceBin: PriceBin,
  count: number
): string {
  const rarityText = rarityBin.label.replace('%', ' percent');
  const priceText =
    priceBin.maxPrice === Infinity
      ? `${priceBin.minPrice} XCH and above`
      : `${priceBin.minPrice} to ${priceBin.maxPrice} XCH`;

  const nftText = count === 1 ? '1 NFT' : `${count} NFTs`;

  return `Rarity ${rarityText}, price ${priceText}: ${nftText} listed`;
}

// ============ Keyboard Navigation ============

export const HEATMAP_KEYBOARD = {
  // Arrow key movements
  ArrowUp: { row: -1, col: 0 },
  ArrowDown: { row: 1, col: 0 },
  ArrowLeft: { row: 0, col: -1 },
  ArrowRight: { row: 0, col: 1 },

  // Jump keys
  Home: 'rowStart',
  End: 'rowEnd',
  'Ctrl+Home': 'gridStart',
  'Ctrl+End': 'gridEnd',
} as const;

/**
 * Calculate next cell position based on key press
 */
export function getNextCellPosition(
  currentRow: number,
  currentCol: number,
  key: string,
  ctrlKey: boolean
): { row: number; col: number } {
  const maxRow = HEATMAP_CONFIG.rarityBins - 1;
  const maxCol = HEATMAP_CONFIG.priceBins - 1;

  if (ctrlKey && key === 'Home') {
    return { row: 0, col: 0 };
  }
  if (ctrlKey && key === 'End') {
    return { row: maxRow, col: maxCol };
  }

  switch (key) {
    case 'ArrowUp':
      return { row: Math.max(0, currentRow - 1), col: currentCol };
    case 'ArrowDown':
      return { row: Math.min(maxRow, currentRow + 1), col: currentCol };
    case 'ArrowLeft':
      return { row: currentRow, col: Math.max(0, currentCol - 1) };
    case 'ArrowRight':
      return { row: currentRow, col: Math.min(maxCol, currentCol + 1) };
    case 'Home':
      return { row: currentRow, col: 0 };
    case 'End':
      return { row: currentRow, col: maxCol };
    default:
      return { row: currentRow, col: currentCol };
  }
}
