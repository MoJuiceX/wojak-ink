// src/config/aiEnhanceFamilyColors.ts
// Visual identity for each AI style family — gradient colors that evoke the style.

/** Two-color gradient pair [from, to] for family card backgrounds. */
const FAMILY_GRADIENT_MAP: Record<string, [string, string]> = {
  // --- Universal Enhance ---
  'Animal Prints': ['#D2691E', '#8B4513'],
  'Elemental': ['#FF4500', '#DC143C'],
  'Precious Metals': ['#FFD700', '#C0C0C0'],
  'Battle Worn': ['#708090', '#8B0000'],
  'Art & Paint': ['#FF6B6B', '#4ECDC4'],
  'Digital & Glitch': ['#00CED1', '#FF00FF'],
  'Nature Overgrowth': ['#228B22', '#8FBC8F'],

  // --- Clothes Enhance ---
  'Luxury & Bling': ['#FFD700', '#9B59B6'],
  'Tactical & Combat': ['#556B2F', '#8B8B00'],
  'Street & Punk': ['#FF1493', '#FF6B00'],
  'Patterns': ['#FF6B6B', '#6B5BFF'],
  'Sci-Fi & Tech': ['#00CED1', '#3A3AFF'],
  'Medieval & Fantasy': ['#708090', '#DAA520'],
  'Weird & Fun': ['#FFD93D', '#FF6B6B'],
  'Energy & Power': ['#4A90D9', '#FFD700'],
  'Worn & Aged': ['#D2B48C', '#808080'],

  // --- Head Enhance ---
  'Steampunk': ['#B8860B', '#CD853F'],
  'Magical': ['#7B68EE', '#4B0082'],
  'Patches & Pins': ['#4169E1', '#DC143C'],
  'Weathered & Adventure': ['#C4A882', '#8B7355'],
  'Food & Candy': ['#FF69B4', '#98FB98'],
  'Material Swap': ['#B0C4DE', '#87CEEB'],

  // --- Clothes Create ---
  'Armor & Warriors': ['#708090', '#4A4A4A'],
  'Formal & Elegant': ['#2C2C5E', '#DAA520'],
  'Fantasy & Magical': ['#7B68EE', '#4B0082'],
  'Costumes & Characters': ['#DC143C', '#FFD700'],
  'Uniforms & Work': ['#4682B4', '#87CEEB'],
  'Sports & Athletic': ['#FF4500', '#32CD32'],
  'Cultural & Traditional': ['#CD853F', '#DAA520'],
  'Dark & Horror': ['#1C1C1C', '#8B0000'],
  'Absurd & Meme': ['#FFD93D', '#FF69B4'],

  // --- Head Create ---
  'Helmets & Armor': ['#708090', '#4A4A4A'],
  'Hats & Classic': ['#3B3B4F', '#8B7355'],
  'Crowns & Royalty': ['#FFD700', '#DC143C'],
  'Fantasy & Creature': ['#7B68EE', '#228B22'],
  'Wild & Absurd': ['#FF6B6B', '#FFD93D'],
  'Sport & Activity': ['#FF4500', '#4682B4'],
  'Food & Object': ['#FF8C00', '#FFD93D'],

  // --- Background Create ---
  'City & Urban': ['#4A4A6A', '#FF6B00'],
  'Nature & Wild': ['#228B22', '#87CEEB'],
  'Historical & Fantasy': ['#DAA520', '#708090'],
  'Sci-Fi & Space': ['#1A1A2E', '#00CED1'],
  'Indoor Scenes': ['#8B7355', '#FFB347'],
  'Action & Extreme': ['#DC143C', '#FF4500'],
  'Abstract & Surreal': ['#E040FB', '#00CED1'],
  'Crypto & Meme': ['#FFD700', '#32CD32'],
  'Entertainment': ['#FF69B4', '#4169E1'],
};

/**
 * Parse a family label like "🐾 Animal Prints" into { emoji, name }.
 * Handles multi-byte surrogate pair emojis correctly.
 */
export function parseFamilyLabel(label: string): { emoji: string; name: string } {
  const spaceIdx = label.indexOf(' ');
  if (spaceIdx === -1) return { emoji: '', name: label };
  return {
    emoji: label.slice(0, spaceIdx),
    name: label.slice(spaceIdx + 1).trim(),
  };
}

/**
 * Get the two gradient colors for a family by its label.
 * Returns [color1, color2] or null if no mapping exists.
 */
export function getFamilyColors(familyLabel: string): [string, string] | null {
  const { name } = parseFamilyLabel(familyLabel);
  return FAMILY_GRADIENT_MAP[name] ?? null;
}

/**
 * Build a CSS gradient string for a family card background.
 * Uses low opacity so text remains readable.
 */
export function getFamilyGradient(familyLabel: string): string {
  const colors = getFamilyColors(familyLabel);
  if (!colors) return 'none';
  // 20% and 10% opacity for subtle evocative background
  return `linear-gradient(135deg, ${colors[0]}33 0%, ${colors[1]}1a 100%)`;
}

/**
 * Build a CSS border-color for a family card's hover/active state.
 * Returns a slightly brighter version of the first color.
 */
export function getFamilyAccent(familyLabel: string): string {
  const colors = getFamilyColors(familyLabel);
  if (!colors) return 'rgba(255, 107, 0, 0.3)';
  return `${colors[0]}66`; // 40% opacity
}
