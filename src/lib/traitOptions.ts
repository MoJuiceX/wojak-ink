/**
 * Trait Options Helper Module
 *
 * Shared formatting utilities for trait display labels.
 * Ported from wojak-ink-mobile/src/lib/traitOptions.js
 */

// Color tokens for variant grouping (case-insensitive)
export const COLOR_TOKENS: Record<string, string> = {
  blue: '#1e5bd7',
  red: '#d71818',
  green: '#2a9d3c',
  pink: '#ff4fd8',
  purple: '#7a2cff',
  orange: '#ff8a00',
  black: '#111111',
  brown: '#8b5a2b',
  blond: '#d9b56d',
  yellow: '#ffd200',
  grey: '#808080',
  gray: '#808080',
  white: '#ffffff',
  'neon green': '#39ff14',
};

export interface ColorVariant {
  base: string;
  color: string;
  hex: string;
}

export interface SuitVariant {
  suitColor: string;
  accessoryType: string;
  accessoryColor: string;
}

export interface ChiaFarmerVariant {
  color: string;
}

/**
 * Parse raw display name to extract base name and color token
 */
export function parseColorVariant(rawDisplayName: string | undefined): ColorVariant | null {
  if (!rawDisplayName) return null;

  const lowerName = rawDisplayName.toLowerCase().trim();

  // Pattern 1: "Name (color)" - paren color
  const parenMatch = rawDisplayName.match(/^(.+?)\s*\((.+?)\)\s*$/);
  if (parenMatch) {
    const base = parenMatch[1].trim();
    const colorToken = parenMatch[2].trim().toLowerCase();
    if (COLOR_TOKENS[colorToken]) {
      return { base, color: colorToken, hex: COLOR_TOKENS[colorToken] };
    }
  }

  // Pattern 2: "Name, color" - comma color
  const commaMatch = rawDisplayName.match(/^(.+?),\s*(.+?)\s*$/);
  if (commaMatch) {
    const base = commaMatch[1].trim();
    const colorToken = commaMatch[2].trim().toLowerCase();
    if (COLOR_TOKENS[colorToken]) {
      return { base, color: colorToken, hex: COLOR_TOKENS[colorToken] };
    }
  }

  // Pattern 3: "Name neon green" - last two tokens (special case)
  if (lowerName.endsWith(' neon green')) {
    const base = rawDisplayName.slice(0, -11).trim();
    if (base) {
      return { base, color: 'neon green', hex: COLOR_TOKENS['neon green'] };
    }
  }

  // Pattern 4: "Name color" - last token
  const words = rawDisplayName.trim().split(/\s+/);
  if (words.length >= 2) {
    const lastToken = words[words.length - 1].toLowerCase();
    if (COLOR_TOKENS[lastToken]) {
      const base = words.slice(0, -1).join(' ').trim();
      if (base) {
        return { base, color: lastToken, hex: COLOR_TOKENS[lastToken] };
      }
    }
  }

  return null;
}

/**
 * Normalize Head layer labels (display only)
 */
export function normalizeHeadLabel(label: string, layerName: string): string {
  if (!label || layerName !== 'Head') return label;

  let normalized = label;
  const labelLower = normalized.toLowerCase();

  // Super Saiyan handling
  if ((labelLower.includes('super') || labelLower.includes('supa')) && labelLower.includes('saiyan')) {
    normalized = normalized.replace(/supa/gi, 'Super');
    normalized = normalized.replace(/super\s+saiyan(?:\s+hair)?/gi, 'Super Saiyan Uniform');
  }

  // Tupac/2Pac capitalization
  normalized = normalized.replace(/^tupac\b/i, 'Tupac');
  normalized = normalized.replace(/^2pac\b/i, '2Pac');

  // SWAT handling
  if (labelLower.includes('swat')) {
    normalized = normalized.replace(/\bswat\b/gi, 'SWAT');
    normalized = normalized.replace(/\bSWAT\s+(Helmet|Gear)\b/gi, 'SWAT');
  } else {
    normalized = normalized.replace(/\bswat\b/gi, 'SWAT');
  }

  // Wizard - remove "man" suffix
  if (normalized.toLowerCase().includes('wizard')) {
    normalized = normalized.replace(/\s*,\s*man\s*$/i, '');
    normalized = normalized.replace(/\s*:\s*man\s*$/i, '');
    normalized = normalized.replace(/\s*\(\s*man\s*\)\s*$/i, '');
    normalized = normalized.replace(/\s+man\s*$/i, '');
  }

  return normalized;
}

/**
 * Format display label for dropdown options
 */
export function formatDisplayLabel(rawLabel: string | undefined): string {
  if (!rawLabel) return rawLabel || '';

  // Cashtag labels - preserve full uppercase
  if (rawLabel.startsWith('$')) {
    return rawLabel.toUpperCase();
  }

  // Chia Farmer items
  if (/chia[- ]?farmer/i.test(rawLabel)) {
    return 'Chia Farmer';
  }

  // Drac -> Vampire Teeth
  if (/^drac$/i.test(rawLabel)) {
    return 'Vampire Teeth';
  }

  // Topless Blue (overalls) - format as "Topless Blue"
  if (/topless[_ ]?blue/i.test(rawLabel)) {
    return 'Topless Blue';
  }

  // Mom's Basement
  if (rawLabel.toLowerCase().includes('mom') && rawLabel.toLowerCase().includes('basement')) {
    return "Mom's Basement";
  }

  // NYSE labels
  if (/nyse\s+dump/i.test(rawLabel)) return 'NYSE Dump';
  if (/nyse\s+pump/i.test(rawLabel)) return 'NYSE Pump';

  // 2Pac Bandana
  const pacBandanaMatch = rawLabel.match(/^(2pac\s+bandana)(?:\s+(.+))?$/i);
  if (pacBandanaMatch) {
    const colorPart = pacBandanaMatch[2];
    if (colorPart) {
      const colorCapitalized = colorPart
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      return `2Pac Bandana (${colorCapitalized})`;
    }
    return '2Pac Bandana';
  }

  // Wizard Hat
  const wizardHatMatch = rawLabel.match(/^(wizard\s+hat(?:\s+man)?)(?:\s+(.+))?$/i);
  if (wizardHatMatch) {
    const colorPart = wizardHatMatch[2];
    if (colorPart) {
      const colorCapitalized = colorPart
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      return `Wizard Hat (${colorCapitalized})`;
    }
    return 'Wizard Hat';
  }

  // Tin Foil
  const tinFoilMatch = rawLabel.match(/^tin\s+foil(?:\s+(.+))?$/i);
  if (tinFoilMatch) {
    const colorPart = tinFoilMatch[1];
    if (colorPart && !colorPart.toLowerCase().includes('hat')) {
      const colorCapitalized = colorPart
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      return `Tin Foil Hat (${colorCapitalized})`;
    }
    return 'Tin Foil Hat';
  }

  const labelLower = rawLabel.toLowerCase();

  // Head layer naming adjustments
  if (labelLower.includes('anarchy') && labelLower.includes('spikes')) {
    const colorPart = rawLabel.match(/anarchy\s+spikes(?:\s+(.+))?$/i)?.[1];
    if (colorPart) {
      const colorCapitalized = colorPart
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      return `Spikes (${colorCapitalized})`;
    }
    return 'Spikes';
  }

  if (labelLower.includes('comrade') && labelLower.includes('cap')) {
    return 'Comrade Hat';
  }

  if (labelLower.includes('firefigther')) {
    return rawLabel.replace(/firefigther/gi, 'Firefighter');
  }

  if (labelLower.includes('piccolo') && labelLower.includes('hat')) {
    return 'Piccolo Turban';
  }

  if (labelLower.includes('vikings') && labelLower.includes('hat')) {
    return 'Viking Helmet';
  }

  // Super Mario
  const superMarioMatch = rawLabel.match(/^(super\s+mario)(?:\s+(.+))?$/i);
  if (superMarioMatch) {
    const colorPart = superMarioMatch[2];
    if (colorPart) {
      const colorCapitalized = colorPart
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      return `Super Wojak Hat (${colorCapitalized})`;
    }
    return 'Super Wojak Hat';
  }

  // SWAT
  if (labelLower.includes('swat')) {
    return 'SWAT';
  }

  // Super Saiyan
  if (labelLower.includes('super') && labelLower.includes('saiyan')) {
    return 'Super Saiyan Uniform';
  }

  // Wizard Glasses New
  if (labelLower.includes('wizard') && labelLower.includes('glasses') && labelLower.includes('new')) {
    const cleaned = rawLabel
      .replace(/\s+new\s*/gi, ' ')
      .replace(/\s+new$/gi, '')
      .trim();
    return cleaned
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // Eyes/Face Wear adjustments
  if (labelLower.includes('3d') && labelLower.includes('glasses')) {
    return '3D Glasses';
  }

  if (labelLower.includes('mog') && labelLower.includes('glasses')) {
    return 'MOG Glasses';
  }

  if (labelLower.includes('matrix') && labelLower.includes('lenses')) {
    const parsed = parseColorVariant(rawLabel);
    if (parsed && parsed.color) {
      const colorCapitalized = parsed.color.charAt(0).toUpperCase() + parsed.color.slice(1).toLowerCase();
      return `Matrix Lenses (${colorCapitalized})`;
    }
    return 'Matrix Lenses';
  }

  if (labelLower.includes('ninja') && labelLower.includes('turtle') && labelLower.includes('mask')) {
    return 'Ninja Turtle Mask';
  }

  // Clothes layer adjustments
  if (labelLower.includes('firefigther')) {
    return rawLabel.replace(/firefigther/gi, 'Firefighter');
  }

  if (labelLower.includes('super') && labelLower.includes('saiyan') && !labelLower.includes('uniform')) {
    return 'Super Saiyan Uniform';
  }

  if (labelLower.includes('god') && labelLower.includes('rope')) {
    return "God's Robe";
  }

  if (labelLower.includes('military') && labelLower.includes('jacket')) {
    return 'El Presidente';
  }

  if (labelLower.includes('swat')) {
    return 'SWAT Gear';
  }

  // Specific overrides
  const overrides: Record<string, string> = {
    stach: 'Stache',
    numb: 'Numb',
    screeming: 'Screaming',
    neckbeard: 'Neckbeard',
  };

  const lowerLabel = rawLabel.toLowerCase().trim();

  if (overrides[lowerLabel]) {
    return overrides[lowerLabel];
  }

  for (const [key, value] of Object.entries(overrides)) {
    const regex = new RegExp(`\\b${key}\\b`, 'gi');
    if (regex.test(rawLabel)) {
      return rawLabel.replace(regex, value);
    }
  }

  // Title-case by default
  return rawLabel
    .split(' ')
    .map((word) => {
      if (!word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Parse suit variant to extract suit color, accessory type, and accessory color
 */
export function parseSuitVariant(rawDisplayName: string | undefined): SuitVariant | null {
  if (!rawDisplayName) return null;

  const lowerName = rawDisplayName.toLowerCase().trim();

  if (!lowerName.startsWith('suit')) return null;

  const match = lowerName.match(/^suit\s+(\w+)\s+(\w+)\s+(tie|bow)$/);
  if (match) {
    const suitColor = match[1].toLowerCase();
    const accessoryColor = match[2].toLowerCase();
    const accessoryType = match[3].toLowerCase();

    if (suitColor !== 'black' && suitColor !== 'orange') return null;
    if (accessoryType !== 'tie' && accessoryType !== 'bow') return null;

    return {
      suitColor,
      accessoryType,
      accessoryColor,
    };
  }

  return null;
}

/**
 * Parse Chia Farmer variant to extract color
 */
export function parseChiaFarmerVariant(path: string | undefined, rawDisplayName: string | undefined): ChiaFarmerVariant | null {
  if (!path && !rawDisplayName) return null;

  const pathLower = (path || '').toLowerCase();
  const nameLower = (rawDisplayName || '').toLowerCase();

  if (!pathLower.includes('chia') || !pathLower.includes('farmer')) {
    if (!nameLower.includes('chia') || !nameLower.includes('farmer')) {
      return null;
    }
  }

  const pathMatch = pathLower.match(/chia[- ]?farmer[-_]?(\w+)/);
  if (pathMatch) {
    const color = pathMatch[1];
    if (['blue', 'brown', 'orange', 'red'].includes(color)) {
      return { color };
    }
  }

  const nameMatch = nameLower.match(/chia[- ]?farmer[- ]?(\w+)/);
  if (nameMatch) {
    const color = nameMatch[1];
    if (['blue', 'brown', 'orange', 'red'].includes(color)) {
      return { color };
    }
  }

  return null;
}

/**
 * Clean display name from file path
 * Extracts the trait name portion and removes prefixes/suffixes
 */
export function cleanDisplayName(filepath: string): string {
  // Get the filename without extension
  const filename = filepath.split('/').pop()?.replace(/\.(png|jpg|jpeg|gif|webp)$/i, '') || '';

  // Remove layer prefix (e.g., "BACKGROUND_", "BASE_", "HEAD_", "EXTRA_MOUTH_")
  let cleaned = filename.replace(/^[A-Z]+_/, '');
  // Handle EXTRA_MOUTH_ prefix (becomes MOUTH_ after first replace)
  cleaned = cleaned.replace(/^MOUTH_/i, '');

  // Remove "Base-Wojak_" or "Base-Wojak " prefix from base layer names
  cleaned = cleaned.replace(/^Base-Wojak[_\s]*/i, '');

  // Remove any remaining underscores and hyphens
  cleaned = cleaned.replace(/[-_]/g, ' ');

  // Remove "Extra Mouth" or "Mouth" prefix from display names
  cleaned = cleaned.replace(/^Extra\s*Mouth\s*/i, '');
  cleaned = cleaned.replace(/^Mouth\s*/i, '');

  // Handle special characters (Mom's Basement encoding issues)
  cleaned = cleaned.replace(/[ΓÇÖ\u0192\u00E7\u00F4]/g, "'");

  // Trim whitespace
  cleaned = cleaned.trim();

  return cleaned;
}
