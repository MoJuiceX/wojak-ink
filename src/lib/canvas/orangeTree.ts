/**
 * Procedural Orange Tree Generator
 *
 * Creates realistic-looking orange trees with:
 * - Smooth dome canopy (citrus tree shape)
 * - Medium variation between trees
 * - Oranges highlighted at canopy edges
 * - Layered shading for depth
 *
 * Based on research:
 * - Citrus trees form "dense green globes" (University of Florida)
 * - Procedural variation via seed-based randomization
 * - L-system inspired organic shapes
 *
 * @example
 * const tree = generateOrangeTree({ seed: 12345 });
 * drawOrangeTree(ctx, tree, 200, 400); // x, groundY
 */

// ============================================
// TYPES
// ============================================

export interface OrangeTreeConfig {
  seed?: number;

  // Size (will be varied based on seed)
  baseRadius?: number;      // Base canopy radius (40-70)
  scale?: number;           // Overall scale multiplier

  // Colors
  canopyLight?: string;     // Highlight color
  canopyMid?: string;       // Main canopy color
  canopyDark?: string;      // Shadow color
  trunkColor?: string;      // Trunk color
  orangeColor?: string;     // Orange fruit color
  orangeHighlight?: string; // Orange highlight

  // Style overrides
  orangeCount?: number;     // Override random orange count
}

export interface OrangeTree {
  // Generated values
  seed: number;
  canopyRadius: number;
  canopyHeight: number;
  canopyOffsetY: number;    // Vertical offset for dome
  leanAngle: number;        // Slight lean (-5 to 5 degrees)

  // Trunk
  trunkWidth: number;
  trunkHeight: number;

  // Oranges (positions relative to canopy center)
  oranges: Array<{
    x: number;              // -1 to 1 (relative to radius)
    y: number;              // -1 to 1 (relative to radius)
    size: number;           // Radius in pixels
    depth: number;          // 0 = front, 1 = back (for layering)
  }>;

  // Colors
  canopyLight: string;
  canopyMid: string;
  canopyDark: string;
  trunkColor: string;
  orangeColor: string;
  orangeHighlight: string;

  // Subtle shape variations
  squash: number;           // 0.9-1.1 (horizontal squash)
  bumpPhase: number;        // 0-2π (where bumps start)
  bumpAmount: number;       // 0-0.1 (subtle edge variation)
}

// ============================================
// SEEDED RANDOM
// ============================================

/**
 * Simple seeded random number generator (Mulberry32)
 */
const createRandom = (seed: number) => {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * Get random in range using seeded random
 */
const randomInRange = (random: () => number, min: number, max: number) => {
  return min + random() * (max - min);
};

// ============================================
// GENERATOR
// ============================================

/**
 * Generate an orange tree configuration
 */
export const generateOrangeTree = (config: OrangeTreeConfig = {}): OrangeTree => {
  const seed = config.seed ?? Math.floor(Math.random() * 1000000);
  const random = createRandom(seed);
  const scale = config.scale ?? 1;

  // Base size with medium variation
  const baseRadius = (config.baseRadius ?? randomInRange(random, 45, 65)) * scale;

  // Canopy dimensions (citrus trees are round/dome shaped)
  const canopyRadius = baseRadius;
  const canopyHeight = canopyRadius * randomInRange(random, 0.85, 1.0); // Slightly shorter than wide
  const canopyOffsetY = canopyHeight * 0.1; // Offset down slightly

  // Subtle lean for natural look
  const leanAngle = randomInRange(random, -3, 3);

  // Trunk (often mostly hidden by canopy)
  const trunkWidth = randomInRange(random, 10, 16) * scale;
  const trunkHeight = randomInRange(random, canopyHeight * 0.3, canopyHeight * 0.5);

  // Colors (consistent palette with slight variations)
  const canopyLight = config.canopyLight ?? '#4a7c4e';
  const canopyMid = config.canopyMid ?? '#2d5a30';
  const canopyDark = config.canopyDark ?? '#1a3d1c';
  const trunkColor = config.trunkColor ?? '#5d4037';
  const orangeColor = config.orangeColor ?? '#ff8c00';
  const orangeHighlight = config.orangeHighlight ?? '#ffb347';

  // Shape variations
  const squash = randomInRange(random, 0.92, 1.08);
  const bumpPhase = random() * Math.PI * 2;
  const bumpAmount = randomInRange(random, 0.02, 0.06);

  // Generate oranges at highlighted edges
  const orangeCount = config.orangeCount ?? Math.floor(randomInRange(random, 5, 10));
  const oranges: OrangeTree['oranges'] = [];

  for (let i = 0; i < orangeCount; i++) {
    // Place oranges at canopy edges (0.6-0.95 of radius)
    const edgeDistance = randomInRange(random, 0.6, 0.95);

    // Distribute around the canopy, biased toward lower half (where fruit hangs)
    const angle = randomInRange(random, Math.PI * 0.15, Math.PI * 0.85); // Lower 70%

    // Position relative to center (-1 to 1)
    const x = Math.cos(angle - Math.PI / 2) * edgeDistance;
    const y = Math.sin(angle - Math.PI / 2) * edgeDistance * 0.8; // Compress vertically

    // Size variation
    const size = randomInRange(random, 4, 7) * scale;

    // Depth for layering (edges are front)
    const depth = 1 - edgeDistance;

    oranges.push({ x, y, size, depth });
  }

  // Sort oranges by depth (back to front)
  oranges.sort((a, b) => b.depth - a.depth);

  return {
    seed,
    canopyRadius,
    canopyHeight,
    canopyOffsetY,
    leanAngle,
    trunkWidth,
    trunkHeight,
    oranges,
    canopyLight,
    canopyMid,
    canopyDark,
    trunkColor,
    orangeColor,
    orangeHighlight,
    squash,
    bumpPhase,
    bumpAmount,
  };
};

// ============================================
// RENDERER
// ============================================

/**
 * Draw a smooth dome canopy with subtle bumps
 */
const drawCanopyShape = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radiusX: number,
  radiusY: number,
  bumpPhase: number,
  bumpAmount: number
) => {
  ctx.beginPath();

  const steps = 32;
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 2;

    // Subtle bumps using sine waves (3-4 bumps around perimeter)
    const bumpFrequency = 3.5;
    const bump = 1 + Math.sin(angle * bumpFrequency + bumpPhase) * bumpAmount;

    const x = cx + Math.cos(angle) * radiusX * bump;
    const y = cy + Math.sin(angle) * radiusY * bump;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.closePath();
};

/**
 * Draw an orange tree at the specified position
 *
 * @param ctx - Canvas context
 * @param tree - Generated tree data
 * @param x - X position (center of tree base)
 * @param groundY - Y position of ground
 * @param alpha - Opacity (for parallax depth)
 */
export const drawOrangeTree = (
  ctx: CanvasRenderingContext2D,
  tree: OrangeTree,
  x: number,
  groundY: number,
  alpha: number = 1
) => {
  ctx.save();
  ctx.globalAlpha = alpha;

  // Apply lean
  ctx.translate(x, groundY);
  ctx.rotate((tree.leanAngle * Math.PI) / 180);

  // Canopy center position
  const canopyCenterY = -tree.trunkHeight - tree.canopyHeight + tree.canopyOffsetY;
  const radiusX = tree.canopyRadius * tree.squash;
  const radiusY = tree.canopyHeight;

  // ========== TRUNK ==========
  // Draw trunk (partially visible)
  const trunkTop = -tree.trunkHeight;
  const trunkGradient = ctx.createLinearGradient(
    -tree.trunkWidth / 2, 0,
    tree.trunkWidth / 2, 0
  );
  trunkGradient.addColorStop(0, '#4a3728');
  trunkGradient.addColorStop(0.3, tree.trunkColor);
  trunkGradient.addColorStop(0.7, tree.trunkColor);
  trunkGradient.addColorStop(1, '#3d2b1f');

  ctx.fillStyle = trunkGradient;
  ctx.beginPath();
  // Tapered trunk
  ctx.moveTo(-tree.trunkWidth / 2, 0);
  ctx.lineTo(-tree.trunkWidth / 3, trunkTop);
  ctx.lineTo(tree.trunkWidth / 3, trunkTop);
  ctx.lineTo(tree.trunkWidth / 2, 0);
  ctx.closePath();
  ctx.fill();

  // ========== CANOPY SHADOW LAYER (back) ==========
  ctx.fillStyle = tree.canopyDark;
  drawCanopyShape(
    ctx,
    0 + 3,                    // Offset right
    canopyCenterY + 5,        // Offset down
    radiusX * 0.95,
    radiusY * 0.95,
    tree.bumpPhase,
    tree.bumpAmount
  );
  ctx.fill();

  // ========== MAIN CANOPY ==========
  // Radial gradient for depth
  const canopyGradient = ctx.createRadialGradient(
    -radiusX * 0.3, canopyCenterY - radiusY * 0.3, 0,  // Light source top-left
    0, canopyCenterY, Math.max(radiusX, radiusY)
  );
  canopyGradient.addColorStop(0, tree.canopyLight);
  canopyGradient.addColorStop(0.4, tree.canopyMid);
  canopyGradient.addColorStop(1, tree.canopyDark);

  ctx.fillStyle = canopyGradient;
  drawCanopyShape(
    ctx,
    0,
    canopyCenterY,
    radiusX,
    radiusY,
    tree.bumpPhase,
    tree.bumpAmount
  );
  ctx.fill();

  // ========== CANOPY HIGHLIGHT (top) ==========
  ctx.fillStyle = tree.canopyLight;
  ctx.globalAlpha = alpha * 0.3;
  drawCanopyShape(
    ctx,
    -radiusX * 0.15,
    canopyCenterY - radiusY * 0.15,
    radiusX * 0.5,
    radiusY * 0.4,
    tree.bumpPhase + 1,
    tree.bumpAmount * 0.5
  );
  ctx.fill();
  ctx.globalAlpha = alpha;

  // ========== ORANGES ==========
  tree.oranges.forEach((orange) => {
    const ox = orange.x * radiusX;
    const oy = canopyCenterY + orange.y * radiusY;

    // Orange body
    const orangeGradient = ctx.createRadialGradient(
      ox - orange.size * 0.3,
      oy - orange.size * 0.3,
      0,
      ox,
      oy,
      orange.size
    );
    orangeGradient.addColorStop(0, tree.orangeHighlight);
    orangeGradient.addColorStop(0.6, tree.orangeColor);
    orangeGradient.addColorStop(1, '#cc6600');

    ctx.fillStyle = orangeGradient;
    ctx.beginPath();
    ctx.arc(ox, oy, orange.size, 0, Math.PI * 2);
    ctx.fill();

    // Small highlight
    ctx.fillStyle = 'var(--color-white-40)';
    ctx.beginPath();
    ctx.arc(
      ox - orange.size * 0.3,
      oy - orange.size * 0.3,
      orange.size * 0.25,
      0,
      Math.PI * 2
    );
    ctx.fill();
  });

  ctx.restore();
};

// ============================================
// GROVE GENERATOR
// ============================================

/**
 * Generate a grove of orange trees with consistent variation
 */
export const generateOrangeGrove = (
  count: number,
  config: Omit<OrangeTreeConfig, 'seed'> & { baseSeed?: number } = {}
): OrangeTree[] => {
  const baseSeed = config.baseSeed ?? Math.floor(Math.random() * 1000000);
  const trees: OrangeTree[] = [];

  for (let i = 0; i < count; i++) {
    trees.push(
      generateOrangeTree({
        ...config,
        seed: baseSeed + i * 7919, // Prime number for good distribution
      })
    );
  }

  return trees;
};

// ============================================
// PARALLAX LAYER HELPERS
// ============================================

/**
 * Generate trees for a parallax layer
 *
 * @param layerIndex - 0 = far back, higher = closer
 * @param layerCount - Total number of layers
 * @param canvasWidth - Width to distribute trees across
 */
export const generateParallaxTreeLayer = (
  layerIndex: number,
  layerCount: number,
  canvasWidth: number,
  baseSeed: number = 12345
): {
  trees: OrangeTree[];
  positions: number[];
  scale: number;
  alpha: number;
} => {
  // Back layers: smaller, more transparent, more trees
  // Front layers: larger, more opaque, fewer trees
  const depthFactor = layerIndex / (layerCount - 1); // 0 to 1

  const scale = 0.4 + depthFactor * 0.6;           // 0.4 to 1.0
  const alpha = 0.3 + depthFactor * 0.7;           // 0.3 to 1.0
  const treeCount = Math.floor(8 - depthFactor * 5); // 8 to 3
  const spacing = canvasWidth / (treeCount + 1);

  const trees = generateOrangeGrove(treeCount, {
    baseSeed: baseSeed + layerIndex * 10000,
    scale,
  });

  // Distribute trees with slight random offset
  const random = createRandom(baseSeed + layerIndex);
  const positions = trees.map((_, i) => {
    const baseX = spacing * (i + 1);
    const offset = randomInRange(random, -spacing * 0.3, spacing * 0.3);
    return baseX + offset;
  });

  return { trees, positions, scale, alpha };
};

export default {
  generateOrangeTree,
  drawOrangeTree,
  generateOrangeGrove,
  generateParallaxTreeLayer,
};
