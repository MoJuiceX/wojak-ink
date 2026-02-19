/**
 * Mouth Preview Card Positions
 *
 * These are the locked-in zoom and position transforms for mouth trait preview cards.
 * All mouth preview cards use a 2.5x zoom with specific translate offsets to focus on the mouth area.
 *
 * Format: scale(2.5) translate(X%, Y%)
 * - Negative X = move image left (shows more of the right side)
 * - Negative Y = move image up (shows more of the bottom/mouth area)
 */

export const MOUTH_PREVIEW_POSITIONS = {
  // Default position for most mouth traits
  DEFAULT: 'scale(2.5) translate(-6%, -8%)',

  // G1 Mouth traits (ImageCard)
  NECKBEARD: 'scale(2.5) translate(-6%, -8%)',
  STACHE: 'scale(2.5) translate(-6%, -8%)',
  CIG: 'scale(2.5) translate(-9%, -8%)',
  JOINT: 'scale(2.5) translate(-9%, -8%)',
  COHIBA: 'scale(2.5) translate(-9%, -8%)',
  PIZZA: 'scale(2.5) translate(-14%, -24%)',

  // G2 Mouth traits (G2MouthCard)
  BUBBLE_GUM: 'scale(2.5) translate(-29%, -10%)',
  PIPE: 'scale(2.5) translate(-18%, -18%)',
} as const;

/**
 * Get the zoom transform for a G1 mouth trait based on display name
 */
export function getG1MouthTransform(displayName: string): string {
  const lowerName = displayName.toLowerCase();

  if (lowerName.includes('pizza')) {
    return MOUTH_PREVIEW_POSITIONS.PIZZA;
  }
  if (lowerName.includes('cig') || lowerName.includes('joint') || lowerName.includes('cohiba')) {
    return MOUTH_PREVIEW_POSITIONS.CIG;
  }
  if (lowerName.includes('neckbeard')) {
    return MOUTH_PREVIEW_POSITIONS.NECKBEARD;
  }
  if (lowerName.includes('stach')) {
    return MOUTH_PREVIEW_POSITIONS.STACHE;
  }

  return MOUTH_PREVIEW_POSITIONS.DEFAULT;
}

/**
 * Get the zoom transform for a G2 mouth trait based on trait name
 */
export function getG2MouthTransform(traitName: string): string {
  const lowerName = traitName.toLowerCase();

  if (lowerName.includes('bubble')) {
    return MOUTH_PREVIEW_POSITIONS.BUBBLE_GUM;
  }
  if (lowerName.includes('pipe')) {
    return MOUTH_PREVIEW_POSITIONS.PIPE;
  }

  return MOUTH_PREVIEW_POSITIONS.DEFAULT;
}
