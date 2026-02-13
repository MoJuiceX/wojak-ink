/**
 * Canvas Renderer Service
 *
 * Orchestrates layer building, image loading, and drawing. Layer list comes from
 * canvasRendererLayerBuilder; G2 expansion and draw logic live here.
 */

import type { ExportOptions, G2Selections, G2Selection } from '@/types/generator';
import { isSelectionPathEmpty } from '@/types/generator';
import { getG2DefaultColor } from '@/config/g2DefaultColors';
import type { SelectedLayers, UILayerName } from '@/lib/wojakRules';
import { CANVAS_CONFIG } from '@/config/layers';
import { getUnifiedTraitById, getG2BasePath, getCompositeLayerEntries, type UnifiedTrait } from '@/services/generatorService';
import { getFillSlotBehavior } from '@/lib/g2FillTreatments';
import { buildRenderLayers } from '@/services/canvasRendererLayerBuilder';
import { LAYER_Z_INDEX, MOUTH_OVER_BEER_HAT } from '@/services/canvasRendererConstants';
import type { RenderLayer, G2LayerData, G2DrawItem, RenderResult, LayerRenderOverride } from '@/services/canvasRendererTypes';

function isMouthOverBeerHat(path: string | undefined): boolean {
  if (!path) return false;
  const lower = path.toLowerCase();
  return MOUTH_OVER_BEER_HAT.some((trait) => lower.includes(trait.toLowerCase()));
}

// ============ Image Cache (bounded LRU, max 200 entries) ============

const MAX_IMAGE_CACHE = 200;
const imageCache = new Map<string, HTMLImageElement>();
const loadingPromises = new Map<string, Promise<HTMLImageElement>>();

/** Evict oldest entry when over capacity (Map iteration order = insertion order). */
function evictOldestIfNeeded(): void {
  if (imageCache.size <= MAX_IMAGE_CACHE) return;
  const firstKey = imageCache.keys().next().value;
  if (firstKey !== undefined) {
    imageCache.delete(firstKey);
  }
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) return cached;

  const loading = loadingPromises.get(src);
  if (loading) return loading;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      evictOldestIfNeeded();
      imageCache.set(src, img);
      loadingPromises.delete(src);
      resolve(img);
    };

    img.onerror = () => {
      loadingPromises.delete(src);
      reject(new Error(`Failed to load image: ${src}`));
    };

    img.src = src;
  });

  loadingPromises.set(src, promise);
  return promise;
}

export function clearImageCache(): void {
  imageCache.clear();
  loadingPromises.clear();
}

export async function preloadImages(sources: string[]): Promise<void> {
  await Promise.allSettled(sources.map(loadImage));
}

// ============ Rendering ============

function createOffscreenCanvas(width: number, height: number): {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
} {
  const contextOptions: CanvasRenderingContext2DSettings = { willReadFrequently: true };
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d', contextOptions);
    if (ctx) return { canvas, ctx };
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', contextOptions);
  if (!ctx) throw new Error('Failed to get canvas context');
  return { canvas, ctx };
}

// ============ G2 Color Tinting ============

/**
 * Convert hex color to HSL components.
 */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Convert HSL to hex color.
 */
function hslToHex(h: number, s: number, l: number): string {
  const hNorm = h / 360;
  const sNorm = s / 100;
  const lNorm = l / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (sNorm === 0) {
    r = g = b = lNorm;
  } else {
    const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm;
    const p = 2 * lNorm - q;
    r = hue2rgb(p, q, hNorm + 1 / 3);
    g = hue2rgb(p, q, hNorm);
    b = hue2rgb(p, q, hNorm - 1 / 3);
  }
  const toHex = (c: number) => Math.round(c * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Compute a derived color from a base color using a fill treatment.
 * Ported from layer-audit.html getDerivedColor.
 */
export function getDerivedColor(
  baseColor: string,
  treatment: string,
  amount: number = 30
): string {
  const hsl = hexToHsl(baseColor);
  switch (treatment) {
    case 'same_as':
      return baseColor;
    case 'darker_shade':
      return hslToHex(hsl.h, hsl.s, Math.max(0, hsl.l - amount));
    case 'lighter_shade':
      return hslToHex(hsl.h, hsl.s, Math.min(100, hsl.l + amount));
    case 'complementary':
      return hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l);
    case 'split_complementary':
      return hslToHex((hsl.h + 150) % 360, hsl.s, hsl.l);
    case 'warm_shift':
      return hslToHex((hsl.h - 30 + 360) % 360, hsl.s, hsl.l);
    case 'cool_shift':
      return hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l);
    case 'desaturated':
      return hslToHex(hsl.h, Math.max(0, hsl.s - amount), hsl.l);
    default:
      return baseColor;
  }
}

/**
 * Tint a gray fill image with a color using canvas compositing.
 * Ported from layer-audit.html tintDraw.
 *
 * 1. Draw gray fill
 * 2. source-atop: color only existing (non-transparent) pixels
 * 3. multiply: preserve original shading/lighting from the gray image
 * 4. Draw result onto main canvas
 */
function tintDraw(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  fillImg: HTMLImageElement,
  color: string,
  size: number,
  clipRightHalf?: boolean,
  clipLeftPercent?: number,
  clipRightPercent?: number,
  flatTint?: boolean,
  clipTopHalfOnly?: boolean,
  clipBottomHalfFull?: boolean,
  clipBoundaryOffsetPx?: number,
  clipTopPercent?: number,
  clipPolygon?: [number, number][]
): void {
  const tc = document.createElement('canvas');
  tc.width = size;
  tc.height = size;
  const tx = tc.getContext('2d', { willReadFrequently: true })!;

  // 1. Draw gray fill
  tx.drawImage(fillImg, 0, 0, size, size);

  // 2. Color only existing pixels (save this — flat color with alpha from fill)
  tx.globalCompositeOperation = 'source-atop';
  tx.fillStyle = color;
  tx.fillRect(0, 0, size, size);

  if (!flatTint) {
    const flatData = tx.getImageData(0, 0, size, size);
    // 3. Multiply to preserve shading (interior only; edges get over-darkened)
    tx.globalCompositeOperation = 'multiply';
    tx.drawImage(fillImg, 0, 0, size, size);

    // 3b. Edge pixels: multiply over-darkens anti-aliased gray (mid-gray → halved color).
    //     On dark colors that becomes a visible dark fringe. Use flat color for edges instead.
    const multData = tx.getImageData(0, 0, size, size);
    const fd = flatData.data;
    const md = multData.data;
    const EDGE_ALPHA = 0.85; // below this = edge; use flat color to avoid over-darkening
    const thresh = 255 * EDGE_ALPHA;
    for (let i = 0; i < fd.length; i += 4) {
      const a = fd[i + 3];
      if (a > 0 && a < thresh) {
        md[i] = fd[i];
        md[i + 1] = fd[i + 1];
        md[i + 2] = fd[i + 2];
      }
    }
    tx.putImageData(multData, 0, 0);
  }
  // When flatTint: skip multiply; use source-atop result as-is (no shading, no edge darkening)

  const halfH = size / 2;
  // 4. Draw result to main canvas (with optional clipping)
  if (clipPolygon && clipPolygon.length >= 3) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(clipPolygon[0][0] * size, clipPolygon[0][1] * size);
    for (let i = 1; i < clipPolygon.length; i++) ctx.lineTo(clipPolygon[i][0] * size, clipPolygon[i][1] * size);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(tc, 0, 0, size, size);
    ctx.restore();
  } else if (clipTopPercent && clipTopPercent > 0) {
    const clipY = size * clipTopPercent;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, clipY, size, size - clipY);
    ctx.clip();
    ctx.drawImage(tc, 0, 0, size, size);
    ctx.restore();
  } else if (clipBottomHalfFull && clipRightPercent && clipRightPercent > 0) {
    const clipW = size * (1 - clipRightPercent);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, clipW, halfH);
    ctx.rect(0, halfH, size, halfH);
    ctx.clip();
    ctx.drawImage(tc, 0, 0, size, size);
    ctx.restore();
  } else if (clipTopHalfOnly && clipLeftPercent && clipLeftPercent > 0) {
    const clipX = size * clipLeftPercent;
    ctx.save();
    ctx.beginPath();
    ctx.rect(clipX, 0, size - clipX, halfH);
    ctx.clip();
    ctx.drawImage(tc, 0, 0, size, size);
    ctx.restore();
  } else if (clipRightHalf) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(size / 2, 0, size / 2, size);
    ctx.clip();
    ctx.drawImage(tc, 0, 0, size, size);
    ctx.restore();
  } else if (clipLeftPercent && clipLeftPercent > 0) {
    let clipX = size * clipLeftPercent;
    if (clipBoundaryOffsetPx != null) clipX = Math.max(0, clipX - clipBoundaryOffsetPx);
    ctx.save();
    ctx.beginPath();
    ctx.rect(clipX, 0, size - clipX, size);
    ctx.clip();
    ctx.drawImage(tc, 0, 0, size, size);
    ctx.restore();
  } else if (clipRightPercent && clipRightPercent > 0) {
    let clipW = size * (1 - clipRightPercent);
    if (clipBoundaryOffsetPx != null) clipW = Math.max(0, clipW - clipBoundaryOffsetPx);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, clipW, size);
    ctx.clip();
    ctx.drawImage(tc, 0, 0, size, size);
    ctx.restore();
  } else {
    ctx.drawImage(tc, 0, 0, size, size);
  }
}

// Astronaut detail positions (1000x1000 canvas space)
// Must match gray areas in Clothes_Astronaut_detail1.png (circle) and detail2.png (rect)
// Use /astronaut-patch-debug.html to hover and read exact coords from the detail images
const ASTRONAUT_LOGO_POS = { cx: 355, cy: 912, r: 68 };   // Detail 1 — circle (left chest)
const ASTRONAUT_FLAG_POS = { x: 626, y: 861, w: 134, h: 92 };  // Detail 2 — rect (right arm)
// Wizard drip logo patch position (right chest — patch frame cutout is right of center)
const WIZARD_LOGO_POS = { cx: 520, cy: 922, r: 78 };  // 15% bigger (68→78), 10px down (912→922)
const COMRAD_HAT_LOGO_POS = { cx: 560, cy: 250, r: 58 };  // Circle on front of hat (detail2 gray area)
const HARD_HAT_LOGO_POS = { cx: 582, cy: 260, r: 55 };   // Front panel of hard hat
const CAP_LOGO_POS = { cx: 565, cy: 211, r: 65 };         // Front panel of cap (matches McD/Chia detail position)

// BEPA Army name tag positions (1000x1000 canvas space) — adjust from position file when available
const BEPA_ARMY_NAME1_POS = { x: 216, y: 897, w: 180, h: 60, fontSize: 38 };  // left chest
const BEPA_ARMY_NAME2_POS = { x: 605, y: 897, w: 180, h: 60, fontSize: 38 };  // right chest

const COIN_LOGOS_BASE = '/assets/wojak-layers/CHIA_coin_logos';

/**
 * Generate crisp SVG flag as data URL. Uses declarative SVG (CSS-like) for clean rendering
 * instead of canvas path drawing which can appear blurry at small sizes.
 */
export function getFlagSvgDataUrl(code: string, w: number, h: number): string {
  const c = code.toLowerCase();
  const svg = (inner: string) =>
    `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`)}`;

  // Proper 5-pointed star with inner radius for clean star shapes
  const star5 = (cx: number, cy: number, outerR: number, fill: string, rot = 0) => {
    const innerR = outerR * 0.382;
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = (i * 36 - 90 + rot) * (Math.PI / 180);
      pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
    }
    return `<polygon points="${pts.join(' ')}" fill="${fill}"/>`;
  };

  // 6-pointed star (Star of David)
  const star6 = (cx: number, cy: number, r: number, fill: string) => {
    const t1: string[] = [], t2: string[] = [];
    for (let i = 0; i < 3; i++) {
      const a1 = (i * 120 - 90) * (Math.PI / 180);
      const a2 = (i * 120 + 30) * (Math.PI / 180);
      t1.push(`${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)}`);
      t2.push(`${cx + r * Math.cos(a2)},${cy + r * Math.sin(a2)}`);
    }
    return `<polygon points="${t1.join(' ')}" fill="${fill}"/><polygon points="${t2.join(' ')}" fill="${fill}"/>`;
  };

  // Horizontal triband
  const hTriband = (c1: string, c2: string, c3: string) => svg(
    `<rect width="${w}" height="${h/3}" fill="${c1}"/>` +
    `<rect y="${h/3}" width="${w}" height="${h/3}" fill="${c2}"/>` +
    `<rect y="${2*h/3}" width="${w}" height="${h/3}" fill="${c3}"/>`
  );
  // Vertical triband
  const vTriband = (c1: string, c2: string, c3: string) => svg(
    `<rect width="${w/3}" height="${h}" fill="${c1}"/>` +
    `<rect x="${w/3}" width="${w/3}" height="${h}" fill="${c2}"/>` +
    `<rect x="${2*w/3}" width="${w/3}" height="${h}" fill="${c3}"/>`
  );
  // Horizontal biband
  const hBiband = (c1: string, c2: string) => svg(
    `<rect width="${w}" height="${h/2}" fill="${c1}"/>` +
    `<rect y="${h/2}" width="${w}" height="${h/2}" fill="${c2}"/>`
  );

  // ──── Americas ────

  // US — 13 stripes, canton with 50 proper stars
  if (c === 'us') {
    const sH = h / 13;
    const cW = w * 0.4, cH = sH * 7;
    const stripes = Array.from({ length: 13 }, (_, i) =>
      `<rect y="${i * sH}" width="${w}" height="${sH + 0.5}" fill="${i % 2 === 0 ? '#B22234' : '#FFFFFF'}"/>`
    ).join('');
    const canton = `<rect width="${cW}" height="${cH}" fill="#3C3B6E"/>`;
    const sR = Math.min(cW, cH) * 0.038;
    const stars: string[] = [];
    const rows = [6, 5, 6, 5, 6, 5, 6, 5, 6];
    for (let row = 0; row < 9; row++) {
      const count = rows[row];
      const dy = cH * (0.065 + row * 0.105);
      const dx0 = count === 6 ? cW * 0.083 : cW * 0.166;
      const step = cW * 0.166;
      for (let col = 0; col < count; col++) {
        stars.push(star5(dx0 + col * step, dy, sR, '#FFFFFF'));
      }
    }
    return svg(`${stripes}${canton}${stars.join('')}`);
  }

  // Canada — red bars, white center, proper maple leaf (based on official 1:2:1 proportions)
  if (c === 'ca') {
    // Maple leaf drawn in a 0-100 viewBox, then scaled/translated to center
    const s = Math.min(w, h) * 0.006; // scale factor
    const ox = w / 2, oy = h / 2; // center offset
    // Official-style maple leaf path points (centered at 0,0, ~±50 range)
    const leafPath = `M0,-40 L2,-34 L10,-34 L6,-24 L14,-20 L10,-14 L18,-6 L12,-4 L14,2 L6,2 L4,10 L2,6 L0,14 L-2,6 L-4,10 L-6,2 L-14,2 L-12,-4 L-18,-6 L-10,-14 L-14,-20 L-6,-24 L-10,-34 L-2,-34 Z`;
    // Transform to SVG: scale and translate each coordinate
    const transformed = leafPath.replace(/(-?\d+),(-?\d+)/g, (_, x, y) =>
      `${ox + Number(x) * s},${oy + Number(y) * s}`
    );
    return svg(
      `<rect width="${w}" height="${h}" fill="#FF0000"/>` +
      `<rect x="${w*0.25}" width="${w*0.5}" height="${h}" fill="#fff"/>` +
      `<path d="${transformed}" fill="#FF0000"/>`
    );
  }

  // Brazil — green, yellow diamond, blue globe
  if (c === 'br') {
    const cx = w / 2, cy = h / 2;
    const dw = w * 0.42, dh = h * 0.38;
    return svg(
      `<rect width="${w}" height="${h}" fill="#009739"/>` +
      `<polygon points="${cx},${cy-dh} ${cx+dw},${cy} ${cx},${cy+dh} ${cx-dw},${cy}" fill="#FEDD00"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${Math.min(dw,dh)*0.55}" fill="#002776"/>` +
      `<path d="M${cx-dw*0.4},${cy+h*0.02} Q${cx},${cy-h*0.08} ${cx+dw*0.4},${cy+h*0.02}" stroke="#fff" stroke-width="${h*0.02}" fill="none"/>`
    );
  }

  // Mexico — vertical triband with emblem
  if (c === 'mx') {
    const cx = w / 2, cy = h / 2;
    return svg(
      `<rect width="${w/3}" height="${h}" fill="#006847"/>` +
      `<rect x="${w/3}" width="${w/3}" height="${h}" fill="#fff"/>` +
      `<rect x="${2*w/3}" width="${w/3}" height="${h}" fill="#CE1126"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${h*0.12}" fill="#6B3E26"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${h*0.09}" fill="#006847"/>`
    );
  }

  // Argentina
  if (c === 'ar') {
    const cx = w / 2, cy = h / 2;
    return svg(
      `<rect width="${w}" height="${h}" fill="#75AADB"/>` +
      `<rect y="${h/3}" width="${w}" height="${h/3}" fill="#fff"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${h*0.1}" fill="#FCBF49" stroke="#B4571B" stroke-width="${h*0.01}"/>`
    );
  }

  // Colombia
  if (c === 'co') return svg(
    `<rect width="${w}" height="${h/2}" fill="#FCD116"/>` +
    `<rect y="${h/2}" width="${w}" height="${h/4}" fill="#003893"/>` +
    `<rect y="${3*h/4}" width="${w}" height="${h/4}" fill="#CE1126"/>`
  );

  // Chile
  if (c === 'cl') return svg(
    `<rect width="${w}" height="${h/2}" fill="#fff"/>` +
    `<rect y="${h/2}" width="${w}" height="${h/2}" fill="#D52B1E"/>` +
    `<rect width="${w/3}" height="${h/2}" fill="#0039A6"/>` +
    star5(w / 6, h / 4, h * 0.1, '#fff')
  );

  // Peru
  if (c === 'pe') return vTriband('#D91023', '#fff', '#D91023');

  // ──── Europe ────

  // UK — proper Union Jack
  if (c === 'uk') {
    const sw = Math.max(1, h * 0.06); // white stripe width
    const sr = Math.max(1, h * 0.035); // red stripe width
    return svg(
      `<rect width="${w}" height="${h}" fill="#012169"/>` +
      // White diagonals (wide)
      `<line x1="0" y1="0" x2="${w}" y2="${h}" stroke="#fff" stroke-width="${sw * 2.5}"/>` +
      `<line x1="${w}" y1="0" x2="0" y2="${h}" stroke="#fff" stroke-width="${sw * 2.5}"/>` +
      // Red diagonals (narrower, offset for counter-change effect)
      `<line x1="0" y1="0" x2="${w/2}" y2="${h/2}" stroke="#C8102E" stroke-width="${sr * 1.5}"/>` +
      `<line x1="${w}" y1="0" x2="${w/2}" y2="${h/2}" stroke="#C8102E" stroke-width="${sr * 1.5}"/>` +
      `<line x1="0" y1="${h}" x2="${w/2}" y2="${h/2}" stroke="#C8102E" stroke-width="${sr * 1.5}"/>` +
      `<line x1="${w}" y1="${h}" x2="${w/2}" y2="${h/2}" stroke="#C8102E" stroke-width="${sr * 1.5}"/>` +
      // White cross (wide)
      `<rect x="${w/2 - sw}" width="${sw * 2}" height="${h}" fill="#fff"/>` +
      `<rect y="${h/2 - sw}" width="${w}" height="${sw * 2}" fill="#fff"/>` +
      // Red cross (narrower, on top)
      `<rect x="${w/2 - sr}" width="${sr * 2}" height="${h}" fill="#C8102E"/>` +
      `<rect y="${h/2 - sr}" width="${w}" height="${sr * 2}" fill="#C8102E"/>`
    );
  }

  // Germany
  if (c === 'de') return hTriband('#000', '#DD0000', '#FFCE00');
  // France
  if (c === 'fr') return vTriband('#0055A4', '#fff', '#EF4135');
  // Italy
  if (c === 'it') return vTriband('#009246', '#fff', '#CE2B37');
  // Netherlands
  if (c === 'nl') return hTriband('#AE1C28', '#fff', '#21468B');
  // Russia
  if (c === 'ru') return hTriband('#fff', '#0039A6', '#D52B1E');
  // Belgium
  if (c === 'be') return vTriband('#000', '#FAE042', '#ED2939');
  // Ireland
  if (c === 'ie') return vTriband('#169B62', '#fff', '#FF883E');
  // Romania
  if (c === 'ro') return vTriband('#002B7F', '#FCD116', '#CE1126');
  // Hungary
  if (c === 'hu') return hTriband('#CE2939', '#fff', '#477050');
  // Austria
  if (c === 'at') return hTriband('#ED2939', '#fff', '#ED2939');
  // Bulgaria
  if (c === 'bg') return hTriband('#fff', '#00966E', '#D62612');
  // Luxembourg
  if (c === 'lu') return hTriband('#ED2939', '#fff', '#00A1DE');

  // Poland
  if (c === 'pl') return hBiband('#fff', '#DC143C');
  // Ukraine
  if (c === 'ua') return hBiband('#0057B7', '#FFD700');
  // Monaco / Indonesia — red-white biband
  if (c === 'mc' || c === 'id') return hBiband('#CE1126', '#fff');

  // Spain
  if (c === 'es') return svg(
    `<rect width="${w}" height="${h}" fill="#AA151B"/>` +
    `<rect y="${h*0.25}" width="${w}" height="${h*0.5}" fill="#F1BF00"/>`
  );

  // Portugal
  if (c === 'pt') return svg(
    `<rect width="${w*0.4}" height="${h}" fill="#006600"/>` +
    `<rect x="${w*0.4}" width="${w*0.6}" height="${h}" fill="#FF0000"/>` +
    `<circle cx="${w*0.4}" cy="${h/2}" r="${h*0.18}" fill="#FCD116" stroke="#000" stroke-width="${h*0.01}"/>`
  );

  // Greece
  if (c === 'gr') {
    const sH = h / 9;
    const stripes = Array.from({ length: 9 }, (_, i) =>
      `<rect y="${i * sH}" width="${w}" height="${sH + 0.5}" fill="${i % 2 === 0 ? '#0D5EAF' : '#fff'}"/>`
    ).join('');
    const cS = sH * 5;
    return svg(
      stripes +
      `<rect width="${cS}" height="${cS}" fill="#0D5EAF"/>` +
      `<rect x="${cS*0.35}" width="${cS*0.3}" height="${cS}" fill="#fff"/>` +
      `<rect y="${cS*0.35}" width="${cS}" height="${cS*0.3}" fill="#fff"/>`
    );
  }

  // Czech Republic
  if (c === 'cz') return svg(
    `<rect width="${w}" height="${h/2}" fill="#fff"/>` +
    `<rect y="${h/2}" width="${w}" height="${h/2}" fill="#D7141A"/>` +
    `<polygon points="0,0 ${w*0.5},${h/2} 0,${h}" fill="#11457E"/>`
  );

  // Switzerland
  if (c === 'ch') {
    const arm = h * 0.24, thick = h * 0.12;
    return svg(
      `<rect width="${w}" height="${h}" fill="#FF0000"/>` +
      `<rect x="${(w-thick)/2}" y="${(h-arm)/2}" width="${thick}" height="${arm}" fill="#fff"/>` +
      `<rect x="${(w-arm)/2}" y="${(h-thick)/2}" width="${arm}" height="${thick}" fill="#fff"/>`
    );
  }

  // Scandinavian crosses
  const nordicCross = (bg: string, crossC: string, innerC?: string) => {
    const cx = w * 0.36, sw = h * 0.14, sw2 = innerC ? h * 0.08 : 0;
    let s = `<rect width="${w}" height="${h}" fill="${bg}"/>`;
    s += `<rect x="${cx - sw/2}" width="${sw}" height="${h}" fill="${crossC}"/>`;
    s += `<rect y="${h/2 - sw/2}" width="${w}" height="${sw}" fill="${crossC}"/>`;
    if (innerC) {
      s += `<rect x="${cx - sw2/2}" width="${sw2}" height="${h}" fill="${innerC}"/>`;
      s += `<rect y="${h/2 - sw2/2}" width="${w}" height="${sw2}" fill="${innerC}"/>`;
    }
    return svg(s);
  };
  if (c === 'se') return nordicCross('#006AA7', '#FECC02');
  if (c === 'dk') return nordicCross('#C8102E', '#fff');
  if (c === 'no') return nordicCross('#BA0C2F', '#fff', '#00205B');
  if (c === 'fi') return nordicCross('#fff', '#003580');
  if (c === 'is') return nordicCross('#003897', '#fff', '#D72828');

  // EU — blue with 12 gold stars
  if (c === 'eu') {
    const cx = w / 2, cy = h / 2, cr = Math.min(w, h) * 0.33, sR = Math.min(w, h) * 0.045;
    let s = `<rect width="${w}" height="${h}" fill="#003399"/>`;
    for (let i = 0; i < 12; i++) {
      const a = (i * 30 - 90) * (Math.PI / 180);
      s += star5(cx + cr * Math.cos(a), cy + cr * Math.sin(a), sR, '#FFCC00');
    }
    return svg(s);
  }

  // ──── Asia ────

  // Japan
  if (c === 'jp') return svg(
    `<rect width="${w}" height="${h}" fill="#fff"/>` +
    `<circle cx="${w/2}" cy="${h/2}" r="${Math.min(w,h)*0.22}" fill="#BC002D"/>`
  );

  // China — red with 5 yellow stars
  if (c === 'cn') {
    const bigR = Math.min(w, h) * 0.1, smR = Math.min(w, h) * 0.035;
    const bx = w * 0.2, by = h * 0.28;
    let s = `<rect width="${w}" height="${h}" fill="#DE2910"/>`;
    s += star5(bx, by, bigR, '#FFDE00');
    const smPos = [[0.34, 0.14], [0.38, 0.26], [0.38, 0.40], [0.34, 0.52]];
    for (const [px, py] of smPos) {
      const sx = w * px, sy = h * py;
      const angle = Math.atan2(by - sy, bx - sx) * (180 / Math.PI) + 90;
      s += star5(sx, sy, smR, '#FFDE00', angle);
    }
    return svg(s);
  }

  // South Korea — simplified taegeuk
  if (c === 'kr') {
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.2;
    return svg(
      `<rect width="${w}" height="${h}" fill="#fff"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#CD2E3A"/>` +
      `<clipPath id="b"><rect x="${cx - r}" y="${cy}" width="${r*2}" height="${r}"/></clipPath>` +
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#0047A0" clip-path="url(#b)"/>` +
      `<circle cx="${cx}" cy="${cy - r*0.3}" r="${r*0.35}" fill="#CD2E3A"/>` +
      `<circle cx="${cx}" cy="${cy + r*0.3}" r="${r*0.35}" fill="#0047A0"/>`
    );
  }

  // India
  if (c === 'in') {
    const cx = w / 2, cy = h / 2, cr = h * 0.08;
    return svg(
      `<rect width="${w}" height="${h/3}" fill="#FF9933"/>` +
      `<rect y="${h/3}" width="${w}" height="${h/3}" fill="#fff"/>` +
      `<rect y="${2*h/3}" width="${w}" height="${h/3}" fill="#138808"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${cr}" fill="none" stroke="#000088" stroke-width="${cr*0.15}"/>`
    );
  }

  // Turkey
  if (c === 'tr') {
    const cx = w * 0.4, cy = h / 2, r1 = h * 0.22, r2 = h * 0.17;
    return svg(
      `<rect width="${w}" height="${h}" fill="#E30A17"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${r1}" fill="#fff"/>` +
      `<circle cx="${cx + r1*0.2}" cy="${cy}" r="${r2}" fill="#E30A17"/>` +
      star5(cx + r1 * 0.7, cy, h * 0.08, '#fff')
    );
  }

  // Thailand
  if (c === 'th') return svg(
    `<rect width="${w}" height="${h}" fill="#A51931"/>` +
    `<rect y="${h/6}" width="${w}" height="${4*h/6}" fill="#F4F5F8"/>` +
    `<rect y="${2*h/6}" width="${w}" height="${2*h/6}" fill="#2D2A4A"/>`
  );

  // Vietnam
  if (c === 'vn') return svg(
    `<rect width="${w}" height="${h}" fill="#DA251D"/>` +
    star5(w / 2, h / 2, Math.min(w, h) * 0.2, '#FFFF00')
  );

  // Philippines
  if (c === 'ph') {
    const r = Math.min(w, h) * 0.07;
    return svg(
      `<rect width="${w}" height="${h/2}" fill="#0038A8"/>` +
      `<rect y="${h/2}" width="${w}" height="${h/2}" fill="#CE1126"/>` +
      `<polygon points="0,0 ${w*0.45},${h/2} 0,${h}" fill="#fff"/>` +
      `<circle cx="${w*0.12}" cy="${h/2}" r="${r}" fill="#FCD116" stroke="#FCD116" stroke-width="1"/>`
    );
  }

  // Pakistan
  if (c === 'pk') return svg(
    `<rect width="${w*0.25}" height="${h}" fill="#fff"/>` +
    `<rect x="${w*0.25}" width="${w*0.75}" height="${h}" fill="#01411C"/>` +
    `<circle cx="${w*0.58}" cy="${h/2}" r="${h*0.2}" fill="#fff"/>` +
    `<circle cx="${w*0.62}" cy="${h/2}" r="${h*0.17}" fill="#01411C"/>` +
    star5(w * 0.66, h * 0.35, h * 0.07, '#fff')
  );

  // ──── Middle East & Africa ────

  // Israel
  if (c === 'il') return svg(
    `<rect width="${w}" height="${h}" fill="#fff"/>` +
    `<rect y="${h*0.08}" width="${w}" height="${h*0.15}" fill="#0038B8"/>` +
    `<rect y="${h*0.77}" width="${w}" height="${h*0.15}" fill="#0038B8"/>` +
    star6(w / 2, h / 2, h * 0.18, '#0038B8')
  );

  // Saudi Arabia (simplified)
  if (c === 'sa') return svg(
    `<rect width="${w}" height="${h}" fill="#006C35"/>` +
    `<rect x="${w*0.1}" y="${h*0.3}" width="${w*0.8}" height="${h*0.02}" fill="#fff"/>` +
    `<rect x="${w*0.35}" y="${h*0.5}" width="${w*0.3}" height="${h*0.25}" rx="${h*0.03}" fill="#fff"/>`
  );

  // Egypt
  if (c === 'eg') return hTriband('#CE1126', '#fff', '#000');

  // Nigeria
  if (c === 'ng') return vTriband('#008751', '#fff', '#008751');

  // South Africa
  if (c === 'za') {
    return svg(
      `<rect width="${w}" height="${h/2}" fill="#E03C31"/>` +
      `<rect y="${h/2}" width="${w}" height="${h/2}" fill="#001489"/>` +
      `<rect y="${h*0.38}" width="${w}" height="${h*0.24}" fill="#fff"/>` +
      `<polygon points="0,0 ${w*0.42},${h/2} 0,${h}" fill="#007749"/>` +
      `<polygon points="0,${h*0.08} ${w*0.33},${h/2} 0,${h*0.92}" fill="#FFB81C"/>` +
      `<polygon points="0,${h*0.15} ${w*0.26},${h/2} 0,${h*0.85}" fill="#000"/>`
    );
  }

  // ──── Oceania ────

  // Australia — blue with proper stars
  if (c === 'au') {
    const cw = w * 0.3, ch = h * 0.45;
    let s = `<rect width="${w}" height="${h}" fill="#00008B"/>`;
    // Union Jack canton (simplified)
    s += `<rect width="${cw}" height="${ch}" fill="#012169"/>`;
    s += `<line x1="0" y1="0" x2="${cw}" y2="${ch}" stroke="#fff" stroke-width="${ch*0.08}"/>`;
    s += `<line x1="${cw}" y1="0" x2="0" y2="${ch}" stroke="#fff" stroke-width="${ch*0.08}"/>`;
    s += `<rect x="${cw/2 - ch*0.04}" width="${ch*0.08}" height="${ch}" fill="#fff"/>`;
    s += `<rect y="${ch/2 - ch*0.04}" width="${cw}" height="${ch*0.08}" fill="#fff"/>`;
    s += `<rect x="${cw/2 - ch*0.025}" width="${ch*0.05}" height="${ch}" fill="#C8102E"/>`;
    s += `<rect y="${ch/2 - ch*0.025}" width="${cw}" height="${ch*0.05}" fill="#C8102E"/>`;
    // Commonwealth star
    s += star5(w * 0.25, h * 0.72, h * 0.08, '#fff');
    // Southern Cross
    s += star5(w * 0.6, h * 0.25, h * 0.045, '#fff');
    s += star5(w * 0.75, h * 0.18, h * 0.045, '#fff');
    s += star5(w * 0.82, h * 0.42, h * 0.045, '#fff');
    s += star5(w * 0.7, h * 0.58, h * 0.045, '#fff');
    s += star5(w * 0.72, h * 0.4, h * 0.03, '#fff');
    return svg(s);
  }

  // New Zealand
  if (c === 'nz') {
    const cw = w * 0.3, ch = h * 0.45;
    let s = `<rect width="${w}" height="${h}" fill="#00247D"/>`;
    s += `<rect width="${cw}" height="${ch}" fill="#012169"/>`;
    s += `<line x1="0" y1="0" x2="${cw}" y2="${ch}" stroke="#fff" stroke-width="${ch*0.08}"/>`;
    s += `<line x1="${cw}" y1="0" x2="0" y2="${ch}" stroke="#fff" stroke-width="${ch*0.08}"/>`;
    s += `<rect x="${cw/2 - ch*0.04}" width="${ch*0.08}" height="${ch}" fill="#fff"/>`;
    s += `<rect y="${ch/2 - ch*0.04}" width="${cw}" height="${ch*0.08}" fill="#fff"/>`;
    s += `<rect x="${cw/2 - ch*0.025}" width="${ch*0.05}" height="${ch}" fill="#C8102E"/>`;
    s += `<rect y="${ch/2 - ch*0.025}" width="${cw}" height="${ch*0.05}" fill="#C8102E"/>`;
    // Southern Cross (4 red stars)
    s += star5(w * 0.72, h * 0.2, h * 0.05, '#CC142B');
    s += star5(w * 0.85, h * 0.38, h * 0.05, '#CC142B');
    s += star5(w * 0.78, h * 0.6, h * 0.05, '#CC142B');
    s += star5(w * 0.65, h * 0.45, h * 0.04, '#CC142B');
    return svg(s);
  }

  // ──── Special ────

  // Pirate flag — classic Jolly Roger: use ☠ emoji text for maximum recognizability
  if (c === 'pirate' || c === 'jolly') {
    return svg(
      `<rect width="${w}" height="${h}" fill="#000"/>` +
      `<text x="${w/2}" y="${h*0.58}" font-size="${h*0.7}" text-anchor="middle" dominant-baseline="central">☠</text>`
    );
  }

  // Rainbow / Pride
  if (c === 'pride' || c === 'rainbow') {
    const colors = ['#E40303', '#FF8C00', '#FFED00', '#008026', '#004DFF', '#750787'];
    const sH = h / 6;
    return svg(colors.map((col, i) => `<rect y="${i * sH}" width="${w}" height="${sH + 0.5}" fill="${col}"/>`).join(''));
  }

  // Chia (XCH) — custom green flag
  if (c === 'xch' || c === 'chia') return svg(
    `<rect width="${w}" height="${h}" fill="#3AAC59"/>` +
    `<circle cx="${w/2}" cy="${h/2}" r="${Math.min(w,h)*0.22}" fill="#fff" opacity="0.9"/>` +
    `<text x="${w/2}" y="${h/2}" font-family="sans-serif" font-size="${h*0.22}" font-weight="bold" fill="#3AAC59" text-anchor="middle" dominant-baseline="central">XCH</text>`
  );

  // Fallback — show country code on gray
  return svg(
    `<rect width="${w}" height="${h}" fill="#555" rx="${Math.min(w,h)*0.05}"/>` +
    `<text x="${w/2}" y="${h/2}" font-family="sans-serif" font-size="${h*0.35}" font-weight="bold" fill="#fff" text-anchor="middle" dominant-baseline="central">${code.toUpperCase()}</text>`
  );
}

/** Draw flag at patch position — uses SVG for crisp rendering */
async function drawFlagAtPatch(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  code: string,
  size: number,
  pos: { x: number; y: number; w: number; h: number }
): Promise<void> {
  const scale = size / 1000;
  const x = pos.x * scale;
  const y = pos.y * scale;
  const w = pos.w * scale;
  const h = pos.h * scale;
  const dataUrl = getFlagSvgDataUrl(code, Math.ceil(w), Math.ceil(h));
  try {
    const img = await loadImage(dataUrl);
    ctx.drawImage(img, x, y, w, h);
  } catch {
    // Fallback: draw simple rect
    ctx.save();
    ctx.fillStyle = '#E0E0E0';
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }
}

async function drawLogoAtPatch(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  logoName: string,
  size: number,
  pos: { cx: number; cy: number; r: number }
): Promise<void> {
  const scale = size / 1000;
  const cx = pos.cx * scale;
  const cy = pos.cy * scale;
  const r = pos.r * scale;
  try {
    let img: HTMLImageElement;
    try {
      img = await loadImage(`${COIN_LOGOS_BASE}/${logoName}.webp`);
    } catch {
      img = await loadImage(`${COIN_LOGOS_BASE}/${logoName}.png`);
    }
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
  } catch {
    // Fallback: draw placeholder
  }
}

/**
 * Draw a G2 layer: tint fills, then draw outlines and detail.
 * When orderedDrawItems is set, draw in that exact order instead.
 * When supersample: render at 8x then scale down to reduce pixelation.
 */
const SUPERSAMPLE_FACTOR = 8;

async function drawG2Layer(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  g2: G2LayerData,
  size: number,
  clipRightHalf?: boolean,
  clipLeftPercent?: number,
  clipRightPercent?: number,
  clipTopHalfOnly?: boolean,
  clipBottomHalfFull?: boolean,
  clipBoundaryOffsetPx?: number,
  clipTopPercent?: number,
  clipPolygon?: [number, number][]
): Promise<void> {
  const halfH = size / 2;
  const applyClip = () => {
    if (clipPolygon && clipPolygon.length >= 3) {
      ctx.beginPath();
      ctx.moveTo(clipPolygon[0][0] * size, clipPolygon[0][1] * size);
      for (let i = 1; i < clipPolygon.length; i++) ctx.lineTo(clipPolygon[i][0] * size, clipPolygon[i][1] * size);
      ctx.closePath();
      ctx.clip();
    } else if (clipTopPercent && clipTopPercent > 0) {
      const clipY = size * clipTopPercent;
      ctx.beginPath();
      ctx.rect(0, clipY, size, size - clipY);
      ctx.clip();
    } else if (clipBottomHalfFull && clipRightPercent && clipRightPercent > 0) {
      let clipW = size * (1 - clipRightPercent);
      if (clipBoundaryOffsetPx != null) clipW = Math.max(0, clipW - clipBoundaryOffsetPx);
      ctx.beginPath();
      ctx.rect(0, 0, clipW, halfH);
      ctx.rect(0, halfH, size, halfH);
      ctx.clip();
    } else if (clipTopHalfOnly && clipLeftPercent && clipLeftPercent > 0) {
      let clipX = size * clipLeftPercent;
      if (clipBoundaryOffsetPx != null) clipX = Math.max(0, clipX - clipBoundaryOffsetPx);
      ctx.beginPath();
      ctx.rect(clipX, 0, size - clipX, halfH);
      ctx.clip();
    } else if (clipRightHalf) {
      ctx.beginPath();
      ctx.rect(size / 2, 0, size / 2, size);
      ctx.clip();
    } else if (clipLeftPercent && clipLeftPercent > 0) {
      let clipX = size * clipLeftPercent;
      if (clipBoundaryOffsetPx != null) clipX = Math.max(0, clipX - clipBoundaryOffsetPx);
      ctx.beginPath();
      ctx.rect(clipX, 0, size - clipX, size);
      ctx.clip();
    } else if (clipRightPercent && clipRightPercent > 0) {
      let clipW = size * (1 - clipRightPercent);
      if (clipBoundaryOffsetPx != null) clipW = Math.max(0, clipW - clipBoundaryOffsetPx);
      ctx.beginPath();
      ctx.rect(0, 0, clipW, size);
      ctx.clip();
    }
  };
  // Centurion: render at 4x then scale down with high-quality smoothing
  if (g2.supersample) {
    const ssSize = size * SUPERSAMPLE_FACTOR;
    const { canvas: ssCanvas, ctx: ssCtx } = createOffscreenCanvas(ssSize, ssSize);
    await drawG2Layer(ssCtx, { ...g2, supersample: false }, ssSize, clipRightHalf, clipLeftPercent, clipRightPercent, clipTopHalfOnly, clipBottomHalfFull, clipBoundaryOffsetPx, clipTopPercent, clipPolygon);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    applyClip();
    ctx.drawImage(ssCanvas, 0, 0, ssSize, ssSize, 0, 0, size, size);
    ctx.restore();
    return;
  }

  if (g2.orderedDrawItems?.length) {
    for (const item of g2.orderedDrawItems) {
      if (item.type === 'fill') {
        try {
          const fillImg = await loadImage(item.file);
          if (item.opacity !== undefined && item.opacity < 1) {
            ctx.save();
            ctx.globalAlpha = item.opacity;
            tintDraw(ctx, fillImg, item.color, size, clipRightHalf, clipLeftPercent, clipRightPercent, undefined, clipTopHalfOnly, clipBottomHalfFull, clipBoundaryOffsetPx, clipTopPercent, clipPolygon);
            ctx.restore();
          } else {
            tintDraw(ctx, fillImg, item.color, size, clipRightHalf, clipLeftPercent, clipRightPercent, undefined, clipTopHalfOnly, clipBottomHalfFull, clipBoundaryOffsetPx, clipTopPercent, clipPolygon);
          }
        } catch (err) {
          console.warn(`[G2] Failed to load fill: ${item.file}`, err);
        }
      } else {
        try {
          const outlineImg = await loadImage(item.path);
          ctx.save();
          applyClip();
          ctx.drawImage(outlineImg, 0, 0, size, size);
          ctx.restore();
        } catch (err) {
          console.warn(`[G2] Failed to load outline: ${item.path}`, err);
        }
      }
    }
    // Don't return early — fall through to draw detail, frame, and logo below
  }

  // Draw each fill (tinted or as-is)
  for (const fill of g2.fills) {
    try {
      const fillImg = await loadImage(fill.file);
      if (fill.noTint) {
        ctx.save();
        applyClip();
        ctx.drawImage(fillImg, 0, 0, size, size);
        ctx.restore();
      } else {
        tintDraw(ctx, fillImg, fill.color, size, clipRightHalf, clipLeftPercent, clipRightPercent, fill.flatTint, clipTopHalfOnly, clipBottomHalfFull, clipBoundaryOffsetPx, clipTopPercent, clipPolygon);
      }
    } catch (err) {
      console.warn(`[G2] Failed to load fill: ${fill.file}`, err);
    }
  }

  // Draw outlines (no tinting)
  for (const outlinePath of g2.outlines) {
    try {
      const outlineImg = await loadImage(outlinePath);
      ctx.save();
      applyClip();
      ctx.drawImage(outlineImg, 0, 0, size, size);
      ctx.restore();
    } catch (err) {
      console.warn(`[G2] Failed to load outline: ${outlinePath}`, err);
    }
  }

  // Draw detail (no tinting) — for non-Astronaut traits
  if (g2.details?.length) {
    for (const d of g2.details) {
      try {
        const detailImg = await loadImage(d);
        ctx.drawImage(detailImg, 0, 0, size, size);
      } catch (err) {
        console.warn(`[G2] Failed to load detail: ${d}`, err);
      }
    }
  } else if (g2.detail) {
    try {
      const detailImg = await loadImage(g2.detail);
      ctx.drawImage(detailImg, 0, 0, size, size);
    } catch (err) {
      console.warn(`[G2] Failed to load detail: ${g2.detail}`, err);
    }
  }

  // Draw frame (no tinting)
  if (g2.frame) {
    try {
      const frameImg = await loadImage(g2.frame);
      ctx.drawImage(frameImg, 0, 0, size, size);
    } catch (err) {
      console.warn(`[G2] Failed to load frame: ${g2.frame}`, err);
    }
  }

  // Astronaut / Wizard: coin logo draws ON TOP of outline
  if (g2.logoOption) {
    const logoPos = g2.logoPos ?? ASTRONAUT_LOGO_POS;
    await drawLogoAtPatch(ctx, g2.logoOption, size, logoPos);
  }
  if (g2.logoFrame) {
    try {
      const img = await loadImage(g2.logoFrame);
      ctx.drawImage(img, 0, 0, size, size);
    } catch (err) {
      console.warn(`[G2] Failed to load logoFrame: ${g2.logoFrame}`, err);
    }
  }
  if (g2.flagOption) {
    await drawFlagAtPatch(ctx, g2.flagOption, size, ASTRONAUT_FLAG_POS);
  }

  // Astronaut: frame overlays (detail1.1, detail2.2) draw ON TOP of logo and flag
  if (g2.frame1) {
    try {
      const img = await loadImage(g2.frame1);
      ctx.drawImage(img, 0, 0, size, size);
    } catch (err) {
      console.warn(`[G2] Failed to load frame1: ${g2.frame1}`, err);
    }
  }
  if (g2.frame2) {
    try {
      const img = await loadImage(g2.frame2);
      ctx.drawImage(img, 0, 0, size, size);
    } catch (err) {
      console.warn(`[G2] Failed to load frame2: ${g2.frame2}`, err);
    }
  }

  // BEPA Army: detail overlay (name tag border) + name text on top
  if (g2.detailOverlay) {
    try {
      const img = await loadImage(g2.detailOverlay);
      ctx.drawImage(img, 0, 0, size, size);
    } catch (err) {
      console.warn(`[G2] Failed to load detailOverlay: ${g2.detailOverlay}`, err);
    }
  }
  if (g2.name1 || g2.name2) {
    const scale = size / 1000;
    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const drawNameTag = (text: string, p: typeof BEPA_ARMY_NAME1_POS) => {
      const txt = text.slice(0, 8).toUpperCase();
      const maxW = 210 * scale; // visible tag area is wider than the position rect
      let fs = p.fontSize * scale;
      ctx.font = `bold ${fs}px "Comic Sans MS", "Comic Sans", cursive`;
      // Shrink font if text is wider than the tag
      while (ctx.measureText(txt).width > maxW && fs > 8) {
        fs -= 1;
        ctx.font = `bold ${fs}px "Comic Sans MS", "Comic Sans", cursive`;
      }
      ctx.fillText(txt, (p.x + p.w / 2) * scale, (p.y + p.h / 2) * scale);
    };
    if (g2.name1) drawNameTag(g2.name1, BEPA_ARMY_NAME1_POS);
    if (g2.name2) drawNameTag(g2.name2, BEPA_ARMY_NAME2_POS);
    ctx.restore();
  }
}

// ============ G2 Layer Data Builder ============

/**
 * Resolve effective color for a fill slot: user-set or derived from another slot.
 */
function resolveFillColor(
  traitId: string,
  fillKey: string,
  g2: G2Selection,
  trait: UnifiedTrait,
): string {
  const defaultColor = trait.defaultColor || '#FFFFFF';
  const behavior = getFillSlotBehavior(traitId, fillKey);

  if (behavior.type === 'user') {
    const fromStore = g2.colors?.[fillKey];
    if (fromStore) return fromStore;
    if (trait.defaultColors?.length) {
      const n = trait.defaultColors.length;
      const idx =
        n === 2
          ? fillKey === 'fill1'
            ? 0
            : 1
          : (() => {
              const num = parseInt(fillKey.replace('fill', ''), 10);
              return !isNaN(num) && num < n ? num : fillKey === 'fill0' ? 0 : fillKey === 'fill1' ? 1 : 2;
            })();
      if (trait.defaultColors[idx] !== undefined) return trait.defaultColors[idx];
    }
    return defaultColor;
  }

  if (behavior.type === 'fixed') {
    return behavior.fixedColor;
  }

  // Derived: get source color (recursively in case source is also derived)
  const sourceColor = resolveFillColor(traitId, behavior.source, g2, trait);
  const amount = behavior.amount ?? 30;
  return getDerivedColor(sourceColor, behavior.treatment, amount);
}

/**
 * Build G2LayerData from a unified trait + user's color/detail selections.
 * Returns null if the trait is G1-only.
 */
function buildG2LayerData(
  trait: UnifiedTrait,
  g2: G2Selection,
  basePath: string,
  layerPosFilter?: number[],
): G2LayerData {
  const fills: { file: string; color: string; noTint?: boolean }[] = [];
  const outlines: string[] = [];

  // BEPA Army: default = original green only; colored = tinted fill + outline (no outline2)
  if (trait.id === 'Clothes_Bepe-army') {
    const defaultColor = trait.defaultColor || '#4a5d23';
    const color = resolveFillColor(trait.id, 'fill', g2, trait) || defaultColor;
    const isDefault = (c: string) => (c || '').toUpperCase().replace('#', '') === (defaultColor || '').toUpperCase().replace('#', '');
    if (trait.defaultFile && isDefault(color)) {
      fills.push({ file: `${basePath}/${trait.defaultFile}`, color: defaultColor, noTint: true });
      return { fills, outlines: [], name1: g2.name1, name2: g2.name2 };
    }
    if (trait.fillFile) {
      fills.push({ file: `${basePath}/${trait.fillFile}`, color });
    }
    const fill3File = trait.fill3File;
    if (fill3File) {
      const darkerColor = getDerivedColor(color, 'darker_shade', 5);
      fills.push({ file: `${basePath}/${fill3File}`, color: darkerColor });
    }
    const fillNamePositionFile = trait.fillNamePositionFile;
    if (fillNamePositionFile) {
      const namePosColor = getDerivedColor(color, 'darker_shade', 8);
      fills.push({ file: `${basePath}/${fillNamePositionFile}`, color: namePosColor });
    }
    if (trait.outlineFileForFill) {
      outlines.push(`${basePath}/${trait.outlineFileForFill}`);
    }
    const detailOverlay = trait.detailOverlayFile;
    return {
      fills,
      outlines,
      detailOverlay: detailOverlay ? `${basePath}/${detailOverlay}` : undefined,
      name1: g2.name1,
      name2: g2.name2,
    };
  }

  // Astronaut: default layer when reset, else tinted fill; outline on top
  if (trait.id === 'Clothes_Astronaut') {
    const defaultColor = trait.defaultColor || '#FFFFFF';
    const color = resolveFillColor(trait.id, 'fill', g2, trait) || defaultColor;
    const isDefault = (c: string) => (c || '').toUpperCase().replace('#', '') === (defaultColor || '').toUpperCase().replace('#', '');
    if (trait.defaultFile && isDefault(color)) {
      fills.push({ file: `${basePath}/${trait.defaultFile}`, color: defaultColor, noTint: true });
    } else if (trait.fillFile) {
      fills.push({ file: `${basePath}/${trait.fillFile}`, color });
    }
    if (trait.outlineFile) outlines.push(`${basePath}/${trait.outlineFile}`);
    const frame1 = trait.frameFiles?.find(f => f.over === 'Detail 1');
    const frame2 = trait.frameFiles?.find(f => f.over === 'Detail 2');
    return {
      fills,
      outlines,
      logoOption: g2.logoOption,
      flagOption: g2.flagOption,
      frame1: frame1 ? `${basePath}/${frame1.file}` : undefined,
      frame2: frame2 ? `${basePath}/${frame2.file}` : undefined,
    };
  }

  // Handle different fill structures
  if (trait.composite) {
    // Composite traits (layer0 + layer1 or layers array) don't use tintDraw — they're pre-colored
    // Treat them as G1-style layers (return minimal g2 data)
    const entries = getCompositeLayerEntries(trait, basePath);
    outlines.push(...entries.map(e => e.path));
    return { fills: [], outlines, detail: undefined, frame: undefined };
  }

  // Beer Hat: outline must always render on top of detail (can logo). Default can = Citrus.
  if (trait.id === 'Head_Beer-Hat' && trait.outlineFile && trait.detailOptions?.length) {
    const items: G2DrawItem[] = [];
    const defaultCan = trait.detailOptions.find(d => d.name === 'Tang')?.file ?? trait.detailOptions[0]?.file;
    const detailFile = (g2.detailOption && g2.detailOption !== '') ? g2.detailOption : defaultCan;
    if (detailFile) {
      items.push({ type: 'outline', path: `${basePath}/${detailFile}` });
    }
    items.push({ type: 'outline', path: `${basePath}/${trait.outlineFile}` });
    return { fills: [], outlines: [], orderedDrawItems: items };
  }

  // Ninja-turtle-fit: layered draw order (fill3, outline2, fill1, fill2, outline1).
  // layerPosFilter: when set, only include layers with pos in filter (split body pos 0-3 vs over-head pos 4).
  const layerKeyToFill: Record<string, string> = { mfill0: 'fill0', mfill1: 'fill1', mfill2: 'fill2' };
  if (trait.id === 'Clothes_Ninja-turtle-fit' && trait.layers?.length) {
    let sortedLayers = [...trait.layers]
      .filter(l => l.visible !== false)
      .sort((a, b) => a.pos - b.pos);
    if (layerPosFilter?.length) {
      const posSet = new Set(layerPosFilter);
      sortedLayers = sortedLayers.filter(l => posSet.has(l.pos));
    }
    const items: G2DrawItem[] = [];
    for (const layer of sortedLayers) {
      if (layer.type === 'fill') {
        const fillSlot = layerKeyToFill[layer.key] ?? 'fill0';
        const color = resolveFillColor(trait.id, fillSlot, g2, trait) || getG2DefaultColor(trait.id, fillSlot, trait, '#32CD32');
        items.push({ type: 'fill', file: `${basePath}/${layer.file}`, color });
      } else if (layer.type === 'outline') {
        items.push({ type: 'outline', path: `${basePath}/${layer.file}` });
      }
    }
    return { fills: [], outlines: [], orderedDrawItems: items };
  }

  // Viking helmet: fill1 (user), fill2 (darker_shade 13 from fill1), outline
  if (trait.id === 'Head_viking-helmet' && trait.layers?.length) {
    const vikingFillKey: Record<string, string> = { fill1: 'fill1', fill2: 'fill2' };
    const items: G2DrawItem[] = [];
    for (const layer of [...trait.layers].filter(l => l.visible !== false).sort((a, b) => a.pos - b.pos)) {
      if (layer.type === 'fill') {
        const fillSlot = vikingFillKey[layer.key];
        const color = fillSlot
          ? resolveFillColor(trait.id, fillSlot, g2, trait) || trait.defaultColors?.[fillSlot === 'fill1' ? 0 : 1] || '#FF6B00'
          : trait.defaultColors?.[0] || '#FF6B00';
        items.push({ type: 'fill', file: `${basePath}/${layer.file}`, color });
      } else if (layer.type === 'outline') {
        items.push({ type: 'outline', path: `${basePath}/${layer.file}` });
      }
    }
    return { fills: [], outlines: [], orderedDrawItems: items };
  }

  // Laser Eyes: layered fills (mfill0, mfill1, mfill2) with lighter_shade derived; fill2 90% opacity, fill3 85%
  if (trait.id === 'Face-laser_Laser-Eyes' && trait.layers?.length) {
    const items: G2DrawItem[] = [];
    for (const layer of [...trait.layers].filter(l => l.visible !== false).sort((a, b) => a.pos - b.pos)) {
      if (layer.type === 'fill') {
        const fillSlot = layerKeyToFill[layer.key] ?? 'fill0';
        const color = resolveFillColor(trait.id, fillSlot, g2, trait) || trait.defaultColors?.[0] || '#FF0000';
        items.push({
          type: 'fill',
          file: `${basePath}/${layer.file}`,
          color,
          opacity: layer.opacity,
        });
      }
    }
    return { fills: [], outlines: [], orderedDrawItems: items };
  }

  // 3D Glasses: fill1 (user), fill2 (split_complementary from fill1), outline. Uses layer keys fill1/fill2.
  if (trait.id === 'Face-wear_3d-glases' && trait.layers?.length) {
    const glassesFillKey: Record<string, string> = { fill1: 'fill1', fill2: 'fill2' };
    const items: G2DrawItem[] = [];
    for (const layer of [...trait.layers].filter(l => l.visible !== false).sort((a, b) => a.pos - b.pos)) {
      if (layer.type === 'fill') {
        const fillSlot = glassesFillKey[layer.key];
        const color = fillSlot
          ? resolveFillColor(trait.id, fillSlot, g2, trait) || getG2DefaultColor(trait.id, fillSlot, trait, trait.defaultColors?.[fillSlot === 'fill1' ? 0 : 1] ?? '#2563EB')
          : trait.defaultColors?.[0] ?? '#2563EB';
        items.push({ type: 'fill', file: `${basePath}/${layer.file}`, color });
      } else if (layer.type === 'outline') {
        items.push({ type: 'outline', path: `${basePath}/${layer.file}` });
      }
    }
    return { fills: [], outlines: [], orderedDrawItems: items };
  }

  // MOG Glasses: detail (default rainbow or selected) under outline, outline on top
  if (trait.id === 'Face-wear_MOG-Glasses' && trait.outlineFile) {
    const defaultDetailFile = trait.detailOptions?.find(d => d.name === 'Default (Rainbow)')?.file ?? 'Face-wear_MOG-Glasses_detail_default.png';
    const detailFile = g2.detailOption || defaultDetailFile;
    const items: G2DrawItem[] = [
      { type: 'outline', path: `${basePath}/${detailFile}` }, // detail draws first (under)
      { type: 'outline', path: `${basePath}/${trait.outlineFile}` }, // outline on top
    ];
    return { fills: [], outlines: [], orderedDrawItems: items };
  }

  // Chia Farmer: under layer (Tee or Tank top) with fill1, then outfit with fill0
  if (trait.id === 'Clothes_Chia-farmer') {
    const underlayer = g2.chiaFarmerUnderlayer ?? 'tee';
    const underFillFile = underlayer === 'tee' ? 'Clothes_Tee_fill.png' : 'Clothes_Tank-top_fill.png';
    const underOutlineFile = underlayer === 'tee' ? 'Clothes_Tee_outline.png' : 'Clothes_Tank-top_outline.png';
    const underColor = resolveFillColor(trait.id, 'fill1', g2, trait) || getG2DefaultColor(trait.id, 'fill1', trait, '#2563EB');
    const outfitColor = resolveFillColor(trait.id, 'fill0', g2, trait) || getG2DefaultColor(trait.id, 'fill0', trait, '#22c55e');
    const items: G2DrawItem[] = [
      { type: 'fill', file: `${basePath}/${underFillFile}`, color: underColor },
      { type: 'outline', path: `${basePath}/${underOutlineFile}` },
      { type: 'fill', file: `${basePath}/${trait.fillFile!}`, color: outfitColor },
      { type: 'outline', path: `${basePath}/${trait.outlineFile!}` },
    ];
    return { fills: [], outlines: [], orderedDrawItems: items };
  }

  // Suit: Tie vs Bow — fill0 = suit, fill1 = tie/bow. Ordered so bow fill is under bow outline.
  if (trait.id === 'Clothes_Suit' && trait.fillFiles && trait.outlineFiles) {
    const defaultSuit = trait.defaultColors?.[0] ?? '#171717';
    const defaultTieBow = trait.defaultColors?.[1] ?? '#2563EB';
    const isBow = g2.detailOption?.toLowerCase().includes('suite-bow') ?? false;
    const suitColor = resolveFillColor(trait.id, 'fill0', g2, trait) || defaultSuit;
    const tieBowColor = resolveFillColor(trait.id, 'fill1', g2, trait) || defaultTieBow;
    const items: G2DrawItem[] = [
      { type: 'fill', file: `${basePath}/Clothes_Suite-Tie_fill1.png`, color: suitColor },
    ];
    if (isBow) {
      items.push({ type: 'outline', path: `${basePath}/Clothes_Suite-Tie_outline.png` });
      items.push({ type: 'fill', file: `${basePath}/Clothes_Suite-Bow_fill.png`, color: tieBowColor });
      items.push({ type: 'outline', path: `${basePath}/Clothes_Suite-Bow_outline.png` });
    } else {
      items.push({ type: 'fill', file: `${basePath}/Clothes_Suite-Tie_fill2.png`, color: tieBowColor });
      items.push({ type: 'outline', path: `${basePath}/Clothes_Suite-Tie_outline.png` });
    }
    return { fills: [], outlines: [], orderedDrawItems: items };
  }

  // Military jacket: always draw 5 fills + outline in layer order (no default image shortcut)
  if (trait.id === 'Clothes_Military-jacket' && trait.layers?.length) {
    const defaultColor = trait.defaultColor || '#2563EB';
    const militaryFillKey: Record<string, string> = { mfill0: 'fill0', mfill1: 'fill1', mfill2: 'fill2', mfill3: 'fill3', mfill4: 'fill4' };
    const items: G2DrawItem[] = [];
    for (const layer of [...trait.layers].filter(l => l.visible !== false).sort((a, b) => a.pos - b.pos)) {
      if (layer.type === 'fill') {
        const fillSlot = militaryFillKey[layer.key] ?? 'fill0';
        const color = resolveFillColor(trait.id, fillSlot, g2, trait) || trait.defaultColors?.[parseInt(fillSlot.replace('fill', ''), 10)] || defaultColor;
        items.push({ type: 'fill', file: `${basePath}/${layer.file}`, color });
      } else if (layer.type === 'outline') {
        items.push({ type: 'outline', path: `${basePath}/${layer.file}` });
      }
    }
    return { fills: [], outlines: [], orderedDrawItems: items };
  }

  // Comrad Hat: fill1 (band) + fill2 (body) + detail1 as fill3 (star, colorable) + detail1.1 (star outline) + detail2 (coin logo patch)
  if (trait.id === 'Head_Comrad-Hat' && trait.fill1File && trait.fill2File && trait.outlineFile) {
    const fill1Color = resolveFillColor(trait.id, 'fill1', g2, trait) || getG2DefaultColor(trait.id, 'fill1', trait, trait.defaultColor || '#404040');
    const fill2Color = resolveFillColor(trait.id, 'fill2', g2, trait) || getG2DefaultColor(trait.id, 'fill2', trait, trait.defaultColor2 || '#808080');
    const fill3Color = resolveFillColor(trait.id, 'fill3', g2, trait) || getG2DefaultColor(trait.id, 'fill3', trait, '#FF0000');
    const detail1File = trait.detailOptions?.[0]?.file; // Star fill (colorable as fill3)
    const detail1Overlay = trait.detail1OverlayFile;     // Star outline (detail1.1)

    const items: G2DrawItem[] = [
      { type: 'fill', file: `${basePath}/${trait.fill1File}`, color: fill1Color },
      { type: 'fill', file: `${basePath}/${trait.fill2File}`, color: fill2Color },
    ];
    if (g2.logoOption) {
      // Coin logo selected: skip detail1 (star fill) + detail1.1 (star outline) + detail2 (gray patch)
      // Only the coin logo renders at the patch position
    } else {
      if (detail1File) items.push({ type: 'fill', file: `${basePath}/${detail1File}`, color: fill3Color });
      if (detail1Overlay) items.push({ type: 'outline', path: `${basePath}/${detail1Overlay}` });
    }
    items.push({ type: 'outline', path: `${basePath}/${trait.outlineFile}` });

    const result: G2LayerData = { fills: [], outlines: [], orderedDrawItems: items };
    if (g2.logoOption) {
      result.logoOption = g2.logoOption;
      result.logoPos = COMRAD_HAT_LOGO_POS;
    }
    return result;
  }

  // Hard Hat: fill1 + fill2 + outline, with optional coin logo on the front panel
  if (trait.id === 'Head_Hard-hat' && trait.fill1File && trait.fill2File && trait.outlineFile) {
    const fill1Color = resolveFillColor(trait.id, 'fill1', g2, trait) || getG2DefaultColor(trait.id, 'fill1', trait, trait.defaultColor || '#262626');
    const fill2Color = resolveFillColor(trait.id, 'fill2', g2, trait) || getG2DefaultColor(trait.id, 'fill2', trait, trait.defaultColor2 || '#00d4ff');
    const items: G2DrawItem[] = [
      { type: 'fill', file: `${basePath}/${trait.fill1File}`, color: fill1Color },
      { type: 'fill', file: `${basePath}/${trait.fill2File}`, color: fill2Color },
      { type: 'outline', path: `${basePath}/${trait.outlineFile}` },
    ];
    const result: G2LayerData = { fills: [], outlines: [], orderedDrawItems: items };
    if (g2.logoOption) {
      result.logoOption = g2.logoOption;
      result.logoPos = HARD_HAT_LOGO_POS;
    }
    return result;
  }

  // Cap: coin logo support — let generic path handle fill/outline/detail, just add logo when selected
  if (trait.id === 'Head_Cap' && g2.logoOption) {
    const variantFile = g2.variant && trait.variants?.find(v => v.file === g2.variant)?.file;
    const color = resolveFillColor(trait.id, 'fill', g2, trait) || getG2DefaultColor(trait.id, 'fill', trait, trait.defaultColor || '#228B22');
    const fills: G2LayerData['fills'] = [];
    const outlines: string[] = [];
    const fillSrc = variantFile ? `${basePath}/${variantFile}` : (trait.fillFile ? `${basePath}/${trait.fillFile}` : undefined);
    if (fillSrc) fills.push({ file: fillSrc, color });
    if (trait.outlineFile) outlines.push(`${basePath}/${trait.outlineFile}`);
    return { fills, outlines, logoOption: g2.logoOption, logoPos: CAP_LOGO_POS };
  }

  // Wizard drip: Detail 1, Detail 2, or coin logos (no None). Default to Detail 1 when neither set.
  if (trait.id === 'Clothes_Wizard-drip' && trait.fillFile && trait.outlineFile) {
    const defaultColor = getG2DefaultColor(trait.id, 'fill', trait, '#FFA500');
    const color = resolveFillColor(trait.id, 'fill', g2, trait) || defaultColor;
    const detail1File = trait.detailOptions?.[0]?.file;
    const frameForLogo = trait.frameFiles?.find(f => f.over === 'Logo Patch');
    const frameFile = frameForLogo ? `${basePath}/${frameForLogo.file}` : undefined;

    const result: G2LayerData = {
      fills: [{ file: `${basePath}/${trait.fillFile}`, color }],
      outlines: [`${basePath}/${trait.outlineFile}`],
    };
    if (g2.logoOption) {
      result.logoOption = g2.logoOption;
      result.logoPos = WIZARD_LOGO_POS;
      if (frameFile) result.logoFrame = frameFile;
    } else {
      const detailFile = g2.detailOption || detail1File;
      if (detailFile) result.detail = `${basePath}/${detailFile}`;
    }
    return result;
  }

  if (trait.fillFiles) {
    // Multi-fill (e.g. Ninja-turtle-fit: fill1, fill2, fill3)
    trait.fillFiles.forEach((file, i) => {
      const fillKey = `fill${i}`;
      const color = resolveFillColor(trait.id, fillKey, g2, trait) || trait.defaultColors?.[i] || '#FFFFFF';
      fills.push({ file: `${basePath}/${file}`, color });
    });
  } else if (trait.fill1File && trait.fill2File) {
    // Dual fill (e.g. Bathrobe: fill1, fill2) — SWAT gets special orderedDrawItems with details under outline
    if (trait.id === 'Clothes_SWAT' && trait.detailOptions && trait.detailOptions.length >= 2) {
      const detail1File = trait.detailOptions[0]!.file;
      const detail2File = trait.detailOptions[1]!.file;
      const fill1Color = resolveFillColor(trait.id, 'fill1', g2, trait) || getG2DefaultColor(trait.id, 'fill1', trait, trait.defaultColor || '#FFFFFF');
      const fill2Color = resolveFillColor(trait.id, 'fill2', g2, trait) || getG2DefaultColor(trait.id, 'fill2', trait, trait.defaultColor2 || '#FFFFFF');
      const items: G2DrawItem[] = [
        { type: 'fill', file: `${basePath}/${trait.fill1File}`, color: fill1Color },
        { type: 'fill', file: `${basePath}/${trait.fill2File}`, color: fill2Color },
        { type: 'outline', path: `${basePath}/${detail1File}` },
      ];
      if (g2.detailOption === detail2File) {
        items.push({ type: 'outline', path: `${basePath}/${detail2File}` });
      }
      if (trait.outlineFile) items.push({ type: 'outline', path: `${basePath}/${trait.outlineFile}` });
      return { fills: [], outlines: [], orderedDrawItems: items };
    }
    fills.push({
      file: `${basePath}/${trait.fill1File}`,
      color: resolveFillColor(trait.id, 'fill1', g2, trait) || getG2DefaultColor(trait.id, 'fill1', trait, trait.defaultColor || '#FFFFFF'),
    });
    fills.push({
      file: `${basePath}/${trait.fill2File}`,
      color: resolveFillColor(trait.id, 'fill2', g2, trait) || getG2DefaultColor(trait.id, 'fill2', trait, trait.defaultColor2 || '#FFFFFF'),
    });
  } else if (trait.fillFile) {
    // Single fill — variant swaps the fill image but still tints with user color
    const variantFile = g2.variant && trait.variants?.find(v => v.file === g2.variant)?.file;
    if (variantFile) {
      const fillColor = resolveFillColor(trait.id, 'fill', g2, trait) || getG2DefaultColor(trait.id, 'fill', trait, trait.defaultColor || '#FFFFFF');
      fills.push({ file: `${basePath}/${variantFile}`, color: fillColor });
    } else {
      const fillColor = resolveFillColor(trait.id, 'fill', g2, trait) || getG2DefaultColor(trait.id, 'fill', trait, trait.defaultColor || '#FFFFFF');
      const fillEntry: { file: string; color: string; flatTint?: boolean } = {
        file: `${basePath}/${trait.fillFile}`,
        color: fillColor,
      };
      // Centurion plume: flat tint + 4x supersample to reduce pixelation
      if (trait.id === 'Head_Centurion') fillEntry.flatTint = true;
      fills.push(fillEntry);
    }
  }

  // Outlines
  if (trait.outlineFiles) {
    trait.outlineFiles.forEach(file => outlines.push(`${basePath}/${file}`));
  } else if (trait.outlineFile) {
    outlines.push(`${basePath}/${trait.outlineFile}`);
  }
  if (trait.outline2File) {
    outlines.push(`${basePath}/${trait.outline2File}`);
  }

  // Detail
  let detail: string | undefined;
  let details: string[] | undefined;
  if (trait.id === 'Head_Construction-Helmet' && trait.detailOptions?.length) {
    // Multi-detail: Chia logo (toggle) + cigarette pack (one of two, mutually exclusive)
    const chiaFile = trait.detailOptions.find(d => d.file.includes('chia-logo'))?.file;
    const cig1File = trait.detailOptions.find(d => d.file.endsWith('cig-pack.png'))?.file;
    const cig2File = trait.detailOptions.find(d => d.file.includes('cig-pack-2'))?.file;
    const parts: string[] = [];
    if (g2.constructionHelmetChiaLogo && chiaFile) parts.push(`${basePath}/${chiaFile}`);
    const cigPack = g2.constructionHelmetCigPack;
    if (cigPack === cig1File) parts.push(`${basePath}/${cig1File}`);
    else if (cigPack === cig2File) parts.push(`${basePath}/${cig2File}`);
    if (parts.length) details = parts;
  }
  if (!details) {
    if (g2.detailOption) {
      detail = `${basePath}/${g2.detailOption}`;
    } else if (trait.detailFile) {
      detail = `${basePath}/${trait.detailFile}`;
    }
  }

  // Frame
  let frame: string | undefined;
  if (g2.frameOption) {
    frame = `${basePath}/${g2.frameOption}`;
  }

  const result: G2LayerData = { fills, outlines, detail, details, frame };
  if (trait.id === 'Head_Centurion' || fills.some((f) => f.file.toLowerCase().includes('centurion'))) {
    result.supersample = true;
  }
  return result;
}

/**
 * Phase 2: Draw a single fill + outline layer with one color (multiply blend, then outline on top).
 */
function drawColoredLayer(
  mainCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  fillImage: HTMLImageElement,
  outlineImage: HTMLImageElement,
  color: string,
  size: number,
  clipRightHalf?: boolean,
  clipLeftPercent?: number,
  clipRightPercent?: number,
  clipTopHalfOnly?: boolean,
  clipBottomHalfFull?: boolean,
  clipTopPercent?: number,
  clipPolygon?: [number, number][]
): void {
  const halfH = size / 2;
  const { canvas: tempCanvas, ctx: tempCtx } = createOffscreenCanvas(size, size);
  tempCtx.drawImage(fillImage, 0, 0, size, size);
  tempCtx.globalCompositeOperation = 'multiply';
  tempCtx.fillStyle = color;
  tempCtx.fillRect(0, 0, size, size);
  tempCtx.globalCompositeOperation = 'destination-in';
  tempCtx.drawImage(fillImage, 0, 0, size, size);
  mainCtx.save();
  if (clipPolygon && clipPolygon.length >= 3) {
    mainCtx.beginPath();
    mainCtx.moveTo(clipPolygon[0][0] * size, clipPolygon[0][1] * size);
    for (let i = 1; i < clipPolygon.length; i++) mainCtx.lineTo(clipPolygon[i][0] * size, clipPolygon[i][1] * size);
    mainCtx.closePath();
    mainCtx.clip();
  } else if (clipTopPercent && clipTopPercent > 0) {
    const clipY = size * clipTopPercent;
    mainCtx.beginPath();
    mainCtx.rect(0, clipY, size, size - clipY);
    mainCtx.clip();
  } else if (clipBottomHalfFull && clipRightPercent && clipRightPercent > 0) {
    const clipW = size * (1 - clipRightPercent);
    mainCtx.beginPath();
    mainCtx.rect(0, 0, clipW, halfH);
    mainCtx.rect(0, halfH, size, halfH);
    mainCtx.clip();
  } else if (clipTopHalfOnly && clipLeftPercent && clipLeftPercent > 0) {
    const clipX = size * clipLeftPercent;
    mainCtx.beginPath();
    mainCtx.rect(clipX, 0, size - clipX, halfH);
    mainCtx.clip();
  } else if (clipRightHalf) {
    mainCtx.beginPath();
    mainCtx.rect(size / 2, 0, size / 2, size);
    mainCtx.clip();
  } else if (clipLeftPercent && clipLeftPercent > 0) {
    const clipX = size * clipLeftPercent;
    mainCtx.beginPath();
    mainCtx.rect(clipX, 0, size - clipX, size);
    mainCtx.clip();
  } else if (clipRightPercent && clipRightPercent > 0) {
    const clipW = size * (1 - clipRightPercent);
    mainCtx.beginPath();
    mainCtx.rect(0, 0, clipW, size);
    mainCtx.clip();
  }
  mainCtx.drawImage(tempCanvas, 0, 0, size, size);
  mainCtx.drawImage(outlineImage, 0, 0, size, size);
  mainCtx.restore();
}

/**
 * Draw an image with optional clipping
 */
function drawLayer(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  image: HTMLImageElement,
  size: number,
  clipRightHalf?: boolean,
  clipLeftPercent?: number,
  clipRightPercent?: number,
  clipTopHalfOnly?: boolean,
  clipBottomHalfFull?: boolean,
  clipBoundaryOffsetPx?: number,
  clipTopPercent?: number,
  clipPolygon?: [number, number][]
): void {
  const halfH = size / 2;
  if (clipPolygon && clipPolygon.length >= 3) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(clipPolygon[0][0] * size, clipPolygon[0][1] * size);
    for (let i = 1; i < clipPolygon.length; i++) ctx.lineTo(clipPolygon[i][0] * size, clipPolygon[i][1] * size);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(image, 0, 0, size, size);
    ctx.restore();
  } else if (clipTopPercent && clipTopPercent > 0) {
    const clipY = size * clipTopPercent;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, clipY, size, size - clipY);
    ctx.clip();
    ctx.drawImage(image, 0, 0, size, size);
    ctx.restore();
  } else if (clipBottomHalfFull && clipRightPercent && clipRightPercent > 0) {
    let clipW = size * (1 - clipRightPercent);
    if (clipBoundaryOffsetPx != null) clipW = Math.max(0, clipW - clipBoundaryOffsetPx);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, clipW, halfH);
    ctx.rect(0, halfH, size, halfH);
    ctx.clip();
    ctx.drawImage(image, 0, 0, size, size);
    ctx.restore();
  } else if (clipTopHalfOnly && clipLeftPercent && clipLeftPercent > 0) {
    let clipX = size * clipLeftPercent;
    if (clipBoundaryOffsetPx != null) clipX = Math.max(0, clipX - clipBoundaryOffsetPx);
    ctx.save();
    ctx.beginPath();
    ctx.rect(clipX, 0, size - clipX, halfH);
    ctx.clip();
    ctx.drawImage(image, 0, 0, size, size);
    ctx.restore();
  } else if (clipRightHalf) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(size / 2, 0, size / 2, size);
    ctx.clip();
    ctx.drawImage(image, 0, 0, size, size);
    ctx.restore();
  } else if (clipLeftPercent && clipLeftPercent > 0) {
    let clipX = size * clipLeftPercent;
    if (clipBoundaryOffsetPx != null) clipX = Math.max(0, clipX - clipBoundaryOffsetPx);
    ctx.save();
    ctx.beginPath();
    ctx.rect(clipX, 0, size - clipX, size);
    ctx.clip();
    ctx.drawImage(image, 0, 0, size, size);
    ctx.restore();
  } else if (clipRightPercent && clipRightPercent > 0) {
    let clipW = size * (1 - clipRightPercent);
    if (clipBoundaryOffsetPx != null) clipW = Math.max(0, clipW - clipBoundaryOffsetPx);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, clipW, size);
    ctx.clip();
    ctx.drawImage(image, 0, 0, size, size);
    ctx.restore();
  } else {
    ctx.drawImage(image, 0, 0, size, size);
  }
}

/** Sentinel path for solid-color background (user picks color via color picker) */
const BACKGROUND_SOLID_PATH = '__solid__';

// ─── Layer override helpers (Rule Builder visual preview) ───

/** Map virtual/composite layer names back to their parent UI layer name. */
function getUIParentLayer(name: string): string {
  if (name.startsWith('Eyes') || name === 'NinjaTurtleUnderMask') return 'Eyes';
  if (name.startsWith('Mask') || name === 'HannibalMask' || name === 'FullFaceMask') return 'Mask';
  if (name.startsWith('Clothes') || name === 'Astronaut' || name.startsWith('NinjaTurtle')) return 'Clothes';
  if (name.startsWith('BeerHat')) return 'Head';
  if (name === 'BubbleGumRekt' || name === 'BubbleGumOverEyes') return 'MouthBase';
  return name;
}

/** Create a copy of a RenderLayer with all clip properties cleared. */
function clearClips<T extends RenderLayer>(layer: T): T {
  return {
    ...layer,
    clipLeftPercent: undefined,
    clipRightPercent: undefined,
    clipTopPercent: undefined,
    clipRightHalf: undefined,
    clipTopHalfOnly: undefined,
    clipBottomHalfFull: undefined,
    clipBoundaryOffsetPx: undefined,
    clipPolygon: undefined,
  };
}

/**
 * Apply Rule Builder layer overrides to loaded layers.
 * Supports crop-only, underSuit-only, or both simultaneously.
 * Each can have independent X and Y axes. Also supports z-index overrides.
 */
function applyLayerClipOverrides<T extends RenderLayer>(
  layers: T[],
  overrides: Record<string, LayerRenderOverride>,
): T[] {
  let result = [...layers];

  for (const [target, ov] of Object.entries(overrides)) {
    const matchNames = new Set(
      result.filter((l) => l.layerName === target || getUIParentLayer(l.layerName) === target).map((l) => l.layerName)
    );
    if (matchNames.size === 0) continue;

    const template = result.find((l) => matchNames.has(l.layerName))!;
    const originalZ = ov.zIndex ?? LAYER_Z_INDEX[target] ?? template.zIndex;
    result = result.filter((l) => !matchNames.has(l.layerName));

    // Hidden: skip entirely
    if (ov.hidden) continue;

    // Compute the visible X range [xMin, xMax] after crop
    let xMin = 0, xMax = 1;
    if (ov.crop?.x) {
      if (ov.crop.x.side === 'left') xMin = ov.crop.x.clip;
      else xMax = ov.crop.x.clip;
    }

    // Compute the visible Y range [yMin, yMax] after crop
    let yMin = 0, yMax = 1;
    if (ov.crop?.y) {
      if (ov.crop.y.side === 'top') yMin = ov.crop.y.clip;
      else yMax = ov.crop.y.clip;
    }

    // No underSuit — just crop (or z-index override only)
    if (!ov.underSuit) {
      const layer = clearClips(template);
      layer.zIndex = originalZ;
      layer.layerName = target;
      applyRangeClip(layer, xMin, xMax, yMin, yMax);
      result.push(layer);
      continue;
    }

    // underSuit active — split visible region into under/over
    const UNDER_Z = 1.4;
    const hasUX = !!ov.underSuit.x;
    const hasUY = !!ov.underSuit.y;

    if (hasUX && hasUY) {
      // Both axes — UNION: under if on the under-side of EITHER axis.
      // Decomposition into 3 non-overlapping regions:
      //   Under 1: full-height strip on the under-X side
      //   Under 2: over-X strip on the under-Y side
      //   Over:    over-X × over-Y corner (stays on top)
      const splitX = Math.max(xMin, Math.min(xMax, ov.underSuit.x!.clip));
      const splitY = Math.max(yMin, Math.min(yMax, ov.underSuit.y!.clip));
      const isLeftUnder = ov.underSuit.x!.side === 'left';
      const isTopUnder = ov.underSuit.y!.side === 'top';

      const uXMin = isLeftUnder ? xMin : splitX;
      const uXMax = isLeftUnder ? splitX : xMax;
      const uYMin = isTopUnder ? yMin : splitY;
      const uYMax = isTopUnder ? splitY : yMax;
      const oXMin = isLeftUnder ? splitX : xMin;
      const oXMax = isLeftUnder ? xMax : splitX;
      const oYMin = isTopUnder ? splitY : yMin;
      const oYMax = isTopUnder ? yMax : splitY;

      // Under region 1: full-height strip on the under-X side
      if (uXMax > uXMin) {
        const underLayer1 = clearClips(template);
        underLayer1.layerName = target + '_under1';
        underLayer1.zIndex = UNDER_Z;
        applyRangeClip(underLayer1, uXMin, uXMax, yMin, yMax);
        result.push(underLayer1);
      }

      // Under region 2: remaining under-Y strip (only the over-X portion)
      if (oXMax > oXMin && uYMax > uYMin) {
        const underLayer2 = clearClips(template);
        underLayer2.layerName = target + '_under2';
        underLayer2.zIndex = UNDER_Z;
        applyRangeClip(underLayer2, oXMin, oXMax, uYMin, uYMax);
        result.push(underLayer2);
      }

      // Over region: the corner that's on the over-side of BOTH axes
      if (oXMax > oXMin && oYMax > oYMin) {
        const overLayer = clearClips(template);
        overLayer.layerName = target + '_over';
        overLayer.zIndex = originalZ;
        applyRangeClip(overLayer, oXMin, oXMax, oYMin, oYMax);
        result.push(overLayer);
      }
    } else if (hasUX) {
      // X-axis only
      const splitX = Math.max(xMin, Math.min(xMax, ov.underSuit.x!.clip));
      const isLeftUnder = ov.underSuit.x!.side === 'left';

      const uXMin = isLeftUnder ? xMin : splitX;
      const uXMax = isLeftUnder ? splitX : xMax;
      if (uXMax > uXMin) {
        const underLayer = clearClips(template);
        underLayer.layerName = target + '_under';
        underLayer.zIndex = UNDER_Z;
        applyRangeClip(underLayer, uXMin, uXMax, yMin, yMax);
        result.push(underLayer);
      }

      const oXMin = isLeftUnder ? splitX : xMin;
      const oXMax = isLeftUnder ? xMax : splitX;
      if (oXMax > oXMin) {
        const overLayer = clearClips(template);
        overLayer.layerName = target + '_over';
        overLayer.zIndex = originalZ;
        applyRangeClip(overLayer, oXMin, oXMax, yMin, yMax);
        result.push(overLayer);
      }
    } else if (hasUY) {
      // Y-axis only
      const splitY = Math.max(yMin, Math.min(yMax, ov.underSuit.y!.clip));
      const isTopUnder = ov.underSuit.y!.side === 'top';

      const uYMin = isTopUnder ? yMin : splitY;
      const uYMax = isTopUnder ? splitY : yMax;
      if (uYMax > uYMin) {
        const underLayer = clearClips(template);
        underLayer.layerName = target + '_under';
        underLayer.zIndex = UNDER_Z;
        applyRangeClip(underLayer, xMin, xMax, uYMin, uYMax);
        result.push(underLayer);
      }

      const oYMin = isTopUnder ? splitY : yMin;
      const oYMax = isTopUnder ? yMax : splitY;
      if (oYMax > oYMin) {
        const overLayer = clearClips(template);
        overLayer.layerName = target + '_over';
        overLayer.zIndex = originalZ;
        applyRangeClip(overLayer, xMin, xMax, oYMin, oYMax);
        result.push(overLayer);
      }
    } else {
      // underSuit set but no axis enabled — treat as no underSuit
      const layer = clearClips(template);
      layer.zIndex = originalZ;
      layer.layerName = target;
      applyRangeClip(layer, xMin, xMax, yMin, yMax);
      result.push(layer);
    }
  }

  return result.sort((a, b) => a.zIndex - b.zIndex);
}

/** Apply a visible rectangle [xMin,xMax] × [yMin,yMax] as clip properties on a layer. */
function applyRangeClip(layer: RenderLayer, xMin: number, xMax: number, yMin: number, yMax: number): void {
  // Full range = no clip needed on that axis
  if (xMin > 0) layer.clipLeftPercent = xMin;
  if (xMax < 1) layer.clipRightPercent = 1 - xMax;
  if (yMin > 0 || yMax < 1) {
    // Use polygon for Y clipping since there's no clipBottomPercent
    const x1 = xMin > 0 ? xMin : 0;
    const x2 = xMax < 1 ? xMax : 1;
    // If we also have X clips, use polygon for the entire rectangle
    if (xMin > 0 || xMax < 1) {
      layer.clipPolygon = [[x1, yMin], [x2, yMin], [x2, yMax], [x1, yMax]];
      layer.clipLeftPercent = undefined;
      layer.clipRightPercent = undefined;
    } else {
      if (yMin > 0 && yMax < 1) {
        layer.clipPolygon = [[0, yMin], [1, yMin], [1, yMax], [0, yMax]];
      } else if (yMin > 0) {
        layer.clipTopPercent = yMin;
      } else {
        layer.clipPolygon = [[0, 0], [1, 0], [1, yMax], [0, yMax]];
      }
    }
  }
}

export async function renderToCanvas(
  selectedLayers: SelectedLayers,
  options: {
    size?: number;
    includeBackground?: boolean;
    g2Selections?: G2Selections;
    selectedColors?: Partial<Record<UILayerName, string>>;
    /** Per-layer opacity overrides (0-1). Key is layerName. Visual-only for dev tools. */
    layerOpacities?: Record<string, number>;
    /** Per-layer clip overrides (crop/underSuit). Key is UI layerName. Visual-only for Rule Builder. */
    layerClipOverrides?: Record<string, LayerRenderOverride>;
  } = {}
): Promise<RenderResult> {
  const size = options.size ?? CANVAS_CONFIG.renderSize;
  const { canvas, ctx } = createOffscreenCanvas(size, size);

  ctx.clearRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const layers = buildRenderLayers(selectedLayers);

  // Resolve G2 data; expand composite Clothes so layer0/layer1 draw under MouthBase and MouthItem (z 2.1/2.2)
  let resolvedLayers: RenderLayer[] = layers;
  if (options.g2Selections) {
    const basePath = getG2BasePath();
    const expanded: RenderLayer[] = [];
    for (const layer of layers) {
      const layerNameStr = layer.layerName;
      // Virtual layers: map back to their parent UI layer for G2 lookup
      const lookupLayer = getUIParentLayer(layerNameStr) as UILayerName;
      const g2Sel = options.g2Selections[lookupLayer];
      if (layerNameStr === 'Clothes' && g2Sel) {
        try {
          let trait = await getUnifiedTraitById(g2Sel.traitId);
          if (trait?.id === 'Clothes_Bepe-suit' && g2Sel.suitVariant === 'pepe') {
            const pepeTrait = await getUnifiedTraitById('Clothes_Pepe-suit');
            if (pepeTrait) trait = pepeTrait;
          }
          const compositeEntries = trait?.composite ? getCompositeLayerEntries(trait, basePath) : [];
          if (compositeEntries.length > 0) {
            let overIdx = 0;
            compositeEntries.forEach((entry) => {
              const zKey = entry.underBase
                ? 'ClothesCompositeUnderBase'
                : overIdx === 0 ? 'ClothesComposite0' : overIdx === 1 ? 'ClothesComposite1' : `ClothesComposite${overIdx}`;
              const zVal = LAYER_Z_INDEX[zKey] ?? LAYER_Z_INDEX.ClothesComposite0 + overIdx * 0.1;
              expanded.push({ path: entry.path, zIndex: zVal, layerName: zKey });
              if (!entry.underBase) overIdx++;
            });
            continue;
          }
          // Ninja-turtle-fit: fill3, outline2 UNDER base; fill1, fill2, outline1 (on top) OVER base
          if (trait?.id === 'Clothes_Ninja-turtle-fit' && trait.layers?.length) {
            const underBaseG2 = buildG2LayerData(trait, g2Sel, basePath, [0, 1]);   // fill3, outline2
            const overBaseG2 = buildG2LayerData(trait, g2Sel, basePath, [2, 3, 4]); // fill1, fill2, outline1
            if (underBaseG2.orderedDrawItems?.length) {
              expanded.push({
                path: layer.path,
                zIndex: LAYER_Z_INDEX.ClothesCompositeUnderBase,
                layerName: 'NinjaTurtleUnderBase',
                g2: underBaseG2,
              });
            }
            if (overBaseG2.orderedDrawItems?.length) {
              expanded.push({
                path: layer.path,
                zIndex: LAYER_Z_INDEX.Clothes,
                layerName: 'Clothes',
                g2: overBaseG2,
              });
            }
            continue;
          }
        } catch (err) {
          console.warn(`[G2] Failed to resolve composite trait:`, err);
        }
      }
      // Beer Hat: right can behind base/cap, then under head (cap), then left can on top
      if (layerNameStr === 'Head' && g2Sel?.traitId === 'Head_Beer-Hat') {
        try {
          const beerHatTrait = await getUnifiedTraitById('Head_Beer-Hat');
          if (beerHatTrait && beerHatTrait.outlineFile && beerHatTrait.detailOptions?.length) {
            const beerHatG2 = buildG2LayerData(beerHatTrait, g2Sel, basePath);
            expanded.push({
              path: layer.path,
              zIndex: LAYER_Z_INDEX.BeerHatRightBehind,
              layerName: 'BeerHatRightBehind',
              g2: beerHatG2,
              clipLeftPercent: 0.62,
              clipTopHalfOnly: true,
            });
          }
          if (g2Sel.beerHatUnderlayer && g2Sel.beerHatUnderlayerG2) {
            const underTrait = await getUnifiedTraitById(g2Sel.beerHatUnderlayer);
            if (underTrait && (underTrait.source === 'g2' || underTrait.source === 'both')) {
              const underG2 = buildG2LayerData(underTrait, g2Sel.beerHatUnderlayerG2, basePath);
              // Split: detail/logo renders ABOVE Beer Hat so it's not hidden by cans/outline
              const hasDetailOrLogo = underG2.detail || underG2.logoOption;
              if (hasDetailOrLogo) {
                // Base layer (fill + outline only, no detail/logo)
                const baseG2: G2LayerData = { ...underG2, detail: undefined, logoOption: undefined, logoPos: undefined };
                expanded.push({
                  path: layer.path,
                  zIndex: LAYER_Z_INDEX.BeerHatUnder,
                  layerName: 'BeerHatUnder',
                  g2: baseG2,
                });
                // Detail/logo layer on top of Beer Hat
                const detailG2: G2LayerData = { fills: [], outlines: [], detail: underG2.detail, logoOption: underG2.logoOption, logoPos: underG2.logoPos };
                expanded.push({
                  path: layer.path,
                  zIndex: LAYER_Z_INDEX.BeerHatUnderDetailOver,
                  layerName: 'BeerHatUnderDetailOver',
                  g2: detailG2,
                });
              } else {
                expanded.push({
                  path: layer.path,
                  zIndex: LAYER_Z_INDEX.BeerHatUnder,
                  layerName: 'BeerHatUnder',
                  g2: underG2,
                });
              }
            }
          }
        } catch (err) {
          console.warn(`[G2] Failed to resolve Beer Hat layers:`, err);
        }
      }
      if (g2Sel) {
        try {
          const trait = await getUnifiedTraitById(g2Sel.traitId);
          if (trait && (trait.source === 'g2' || trait.source === 'both')) {
            (layer as RenderLayer).g2 = buildG2LayerData(trait, g2Sel, basePath);
          }
        } catch (err) {
          console.warn(`[G2] Failed to resolve trait for ${layerNameStr}:`, err);
        }
      }
      // Mouth Cig/Joint/Cohiba on top of Beer Hat
      if (
        (layerNameStr === 'MouthBase' || layerNameStr === 'MouthItem') &&
        options.g2Selections?.Head?.traitId === 'Head_Beer-Hat' &&
        isMouthOverBeerHat(layer.path)
      ) {
        expanded.push({ ...layer, zIndex: LAYER_Z_INDEX.MouthOverBeerHat });
        continue;
      }
      if (layerNameStr === 'Head' && g2Sel?.traitId === 'Head_Beer-Hat') {
        expanded.push({ ...layer, clipRightPercent: 0.37, clipBottomHalfFull: true });
      } else {
        expanded.push(layer);
      }
    }
    resolvedLayers = expanded;
  }

  type LoadedLayer =
    | (RenderLayer & { image: HTMLImageElement; isSolidBackground?: false })
    | (RenderLayer & { fillImage: HTMLImageElement; outlineImage: HTMLImageElement; image?: null; isSolidBackground?: false })
    | (RenderLayer & { image?: null; isSolidBackground: true });

  const loadPromises = resolvedLayers.map(async (layer): Promise<LoadedLayer | null> => {
    if (layer.g2) {
      return { ...layer, image: null as unknown as HTMLImageElement } as LoadedLayer;
    }
    // Solid color background: no image load
    if (layer.layerName === 'Background' && (layer.path === BACKGROUND_SOLID_PATH || layer.path?.includes(BACKGROUND_SOLID_PATH))) {
      return { ...layer, image: undefined, isSolidBackground: true } as unknown as LoadedLayer;
    }
    if (layer.fillPath && layer.outlinePath && layer.color) {
      try {
        const [fillImage, outlineImage] = await Promise.all([
          loadImage(layer.fillPath),
          loadImage(layer.outlinePath),
        ]);
        return {
          ...layer,
          fillImage,
          outlineImage,
          image: null as unknown as HTMLImageElement,
        } as LoadedLayer;
      } catch (err) {
        console.warn(`Failed to load Phase 2 layer ${layer.layerName}:`, err);
        return null;
      }
    }
    try {
      const image = await loadImage(layer.path);
      return { ...layer, image };
    } catch (err) {
      console.warn(`Failed to load image for ${layer.layerName}:`, err);
      return null;
    }
  });

  let loadedLayers = (await Promise.all(loadPromises)).filter(
    (l): l is LoadedLayer => l !== null
  );

  // Apply Rule Builder clip overrides (crop / underSuit) before drawing
  if (options.layerClipOverrides && Object.keys(options.layerClipOverrides).length > 0) {
    loadedLayers = applyLayerClipOverrides(loadedLayers, options.layerClipOverrides);
  }

  loadedLayers.sort((a, b) => a.zIndex - b.zIndex);

  const bgColor = options.selectedColors?.Background ?? '#1a1a2e';

  for (const layer of loadedLayers) {
    if (!options.includeBackground && layer.layerName === 'Background') {
      continue;
    }

    // Apply per-layer opacity if provided (visual-only dev tool feature)
    // Map virtual/composite layer names back to the UI layer for opacity lookup
    const opacityLayerName = getUIParentLayer(layer.layerName);
    const opacityOverride = options.layerOpacities?.[opacityLayerName] ?? options.layerOpacities?.[layer.layerName];
    if (opacityOverride !== undefined && opacityOverride < 1) {
      ctx.globalAlpha = opacityOverride;
    }

    if ((layer as LoadedLayer & { isSolidBackground?: boolean }).isSolidBackground) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, size, size);
    } else if (layer.g2) {
      await drawG2Layer(ctx, layer.g2, size, layer.clipRightHalf, layer.clipLeftPercent, layer.clipRightPercent, layer.clipTopHalfOnly, layer.clipBottomHalfFull, layer.clipBoundaryOffsetPx, layer.clipTopPercent, layer.clipPolygon);
    } else if (
      layer.fillPath &&
      layer.outlinePath &&
      layer.color &&
      'fillImage' in layer &&
      layer.fillImage &&
      layer.outlineImage
    ) {
      drawColoredLayer(
        ctx,
        layer.fillImage,
        layer.outlineImage,
        layer.color,
        size,
        layer.clipRightHalf,
        layer.clipLeftPercent,
        layer.clipRightPercent,
        layer.clipTopHalfOnly,
        layer.clipBottomHalfFull,
        layer.clipTopPercent,
        layer.clipPolygon
      );
    } else if ('image' in layer && layer.image) {
      drawLayer(ctx, layer.image, size, layer.clipRightHalf, layer.clipLeftPercent, layer.clipRightPercent, layer.clipTopHalfOnly, layer.clipBottomHalfFull, layer.clipBoundaryOffsetPx, layer.clipTopPercent, layer.clipPolygon);
    }

    // Reset alpha after each layer
    if (opacityOverride !== undefined && opacityOverride < 1) {
      ctx.globalAlpha = 1;
    }
  }

  let dataUrl: string;
  if (canvas instanceof OffscreenCanvas) {
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    dataUrl = await blobToDataUrl(blob);
  } else {
    dataUrl = canvas.toDataURL('image/png');
  }

  return {
    dataUrl,
    width: size,
    height: size,
  };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function renderPreview(
  selectedLayers: SelectedLayers,
  g2Selections?: G2Selections,
  selectedColors?: Partial<Record<UILayerName, string>>
): Promise<string> {
  const result = await renderToCanvas(selectedLayers, {
    size: CANVAS_CONFIG.displaySize,
    includeBackground: true,
    g2Selections,
    selectedColors,
  });
  return result.dataUrl;
}

export async function renderThumbnail(
  selectedLayers: SelectedLayers,
  g2Selections?: G2Selections,
  selectedColors?: Partial<Record<UILayerName, string>>
): Promise<string> {
  const result = await renderToCanvas(selectedLayers, {
    size: CANVAS_CONFIG.thumbnailSize,
    includeBackground: true,
    g2Selections,
    selectedColors,
  });
  return result.dataUrl;
}

export async function exportImage(
  selectedLayers: SelectedLayers,
  options: ExportOptions,
  g2Selections?: G2Selections,
  selectedColors?: Partial<Record<UILayerName, string>>
): Promise<Blob> {
  let size: number;
  if ('preset' in options.size) {
    size = CANVAS_CONFIG.exportSizes[options.size.preset]?.width ?? CANVAS_CONFIG.renderSize;
  } else {
    size = options.size.custom.width;
  }

  const { canvas, ctx } = createOffscreenCanvas(size, size);

  ctx.clearRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const layers = buildRenderLayers(selectedLayers);

  // Resolve G2 data; expand composite Clothes so layer0/layer1 draw under MouthBase and MouthItem (z 2.1/2.2)
  let resolvedLayers: RenderLayer[] = layers;
  if (g2Selections) {
    const basePath = getG2BasePath();
    const expanded: RenderLayer[] = [];
    for (const layer of layers) {
      const layerNameStr = layer.layerName;
      // Virtual layers: map back to their parent UI layer for G2 lookup
      const lookupLayer = getUIParentLayer(layerNameStr) as UILayerName;
      const g2Sel = g2Selections[lookupLayer];
      if (layerNameStr === 'Clothes' && g2Sel) {
        try {
          let trait = await getUnifiedTraitById(g2Sel.traitId);
          if (trait?.id === 'Clothes_Bepe-suit' && g2Sel.suitVariant === 'pepe') {
            const pepeTrait = await getUnifiedTraitById('Clothes_Pepe-suit');
            if (pepeTrait) trait = pepeTrait;
          }
          const compositeEntries = trait?.composite ? getCompositeLayerEntries(trait, basePath) : [];
          if (compositeEntries.length > 0) {
            let overIdx = 0;
            compositeEntries.forEach((entry) => {
              const zKey = entry.underBase
                ? 'ClothesCompositeUnderBase'
                : overIdx === 0 ? 'ClothesComposite0' : overIdx === 1 ? 'ClothesComposite1' : `ClothesComposite${overIdx}`;
              const zVal = LAYER_Z_INDEX[zKey] ?? LAYER_Z_INDEX.ClothesComposite0 + overIdx * 0.1;
              expanded.push({ path: entry.path, zIndex: zVal, layerName: zKey });
              if (!entry.underBase) overIdx++;
            });
            continue;
          }
          // Ninja-turtle-fit: fill3, outline2 UNDER base; fill1, fill2, outline1 (on top) OVER base
          if (trait?.id === 'Clothes_Ninja-turtle-fit' && trait.layers?.length) {
            const underBaseG2 = buildG2LayerData(trait, g2Sel, basePath, [0, 1]);
            const overBaseG2 = buildG2LayerData(trait, g2Sel, basePath, [2, 3, 4]);
            if (underBaseG2.orderedDrawItems?.length) {
              expanded.push({
                path: layer.path,
                zIndex: LAYER_Z_INDEX.ClothesCompositeUnderBase,
                layerName: 'NinjaTurtleUnderBase',
                g2: underBaseG2,
              });
            }
            if (overBaseG2.orderedDrawItems?.length) {
              expanded.push({
                path: layer.path,
                zIndex: LAYER_Z_INDEX.Clothes,
                layerName: 'Clothes',
                g2: overBaseG2,
              });
            }
            continue;
          }
        } catch {
          // fall through to normal handling
        }
      }
      // Beer Hat: right can behind base/cap, then under head (cap), then left can on top
      if (layerNameStr === 'Head' && g2Sel?.traitId === 'Head_Beer-Hat') {
        try {
          const beerHatTrait = await getUnifiedTraitById('Head_Beer-Hat');
          if (beerHatTrait && beerHatTrait.outlineFile && beerHatTrait.detailOptions?.length) {
            const beerHatG2 = buildG2LayerData(beerHatTrait, g2Sel, basePath);
            expanded.push({
              path: layer.path,
              zIndex: LAYER_Z_INDEX.BeerHatRightBehind,
              layerName: 'BeerHatRightBehind',
              g2: beerHatG2,
              clipLeftPercent: 0.62,
              clipTopHalfOnly: true,
            });
          }
          if (g2Sel.beerHatUnderlayer && g2Sel.beerHatUnderlayerG2) {
            const underTrait = await getUnifiedTraitById(g2Sel.beerHatUnderlayer);
            if (underTrait && (underTrait.source === 'g2' || underTrait.source === 'both')) {
              const underG2 = buildG2LayerData(underTrait, g2Sel.beerHatUnderlayerG2, basePath);
              // Split: detail/logo renders ABOVE Beer Hat so it's not hidden by cans/outline
              const hasDetailOrLogo = underG2.detail || underG2.logoOption;
              if (hasDetailOrLogo) {
                const baseG2: G2LayerData = { ...underG2, detail: undefined, logoOption: undefined, logoPos: undefined };
                expanded.push({
                  path: layer.path,
                  zIndex: LAYER_Z_INDEX.BeerHatUnder,
                  layerName: 'BeerHatUnder',
                  g2: baseG2,
                });
                const detailG2: G2LayerData = { fills: [], outlines: [], detail: underG2.detail, logoOption: underG2.logoOption, logoPos: underG2.logoPos };
                expanded.push({
                  path: layer.path,
                  zIndex: LAYER_Z_INDEX.BeerHatUnderDetailOver,
                  layerName: 'BeerHatUnderDetailOver',
                  g2: detailG2,
                });
              } else {
                expanded.push({
                  path: layer.path,
                  zIndex: LAYER_Z_INDEX.BeerHatUnder,
                  layerName: 'BeerHatUnder',
                  g2: underG2,
                });
              }
            }
          }
        } catch {
          // fall through
        }
      }
      if (g2Sel) {
        try {
          const trait = await getUnifiedTraitById(g2Sel.traitId);
          if (trait && (trait.source === 'g2' || trait.source === 'both')) {
            (layer as RenderLayer).g2 = buildG2LayerData(trait, g2Sel, basePath);
          }
        } catch {
          // Skip G2 resolution on error
        }
      }
      // Mouth Cig/Joint/Cohiba on top of Beer Hat
      if (
        (layerNameStr === 'MouthBase' || layerNameStr === 'MouthItem') &&
        g2Selections?.Head?.traitId === 'Head_Beer-Hat' &&
        isMouthOverBeerHat(layer.path)
      ) {
        expanded.push({ ...layer, zIndex: LAYER_Z_INDEX.MouthOverBeerHat });
        continue;
      }
      if (layerNameStr === 'Head' && g2Sel?.traitId === 'Head_Beer-Hat') {
        expanded.push({ ...layer, clipRightPercent: 0.37, clipBottomHalfFull: true });
      } else {
        expanded.push(layer);
      }
    }
    resolvedLayers = expanded;
  }

  const loadPromises = resolvedLayers.map(async (layer) => {
    if (layer.g2) {
      return { ...layer, image: null as unknown as HTMLImageElement, isSolidBg: false };
    }
    if (layer.layerName === 'Background' && (layer.path === BACKGROUND_SOLID_PATH || layer.path?.includes(BACKGROUND_SOLID_PATH))) {
      return { ...layer, image: null as unknown as HTMLImageElement, isSolidBg: true };
    }
    try {
      const image = await loadImage(layer.path);
      return { ...layer, image, isSolidBg: false };
    } catch {
      return null;
    }
  });

  type ExportLoaded = RenderLayer & { image: HTMLImageElement | null; isSolidBg: boolean };
  const loadedLayers = (await Promise.all(loadPromises)).filter((l) => l !== null) as ExportLoaded[];

  loadedLayers.sort((a, b) => a.zIndex - b.zIndex);

  const bgColor = selectedColors?.Background ?? '#1a1a2e';

  for (const layer of loadedLayers) {
    if (!options.includeBackground && layer.layerName === 'Background') {
      continue;
    }
    if (layer.isSolidBg) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, size, size);
      continue;
    }
    if (layer.g2) {
      await drawG2Layer(ctx, layer.g2, size, layer.clipRightHalf, layer.clipLeftPercent, layer.clipRightPercent, layer.clipTopHalfOnly, layer.clipBottomHalfFull, layer.clipBoundaryOffsetPx, layer.clipTopPercent, layer.clipPolygon);
    } else if (layer.image) {
      drawLayer(ctx, layer.image, size, layer.clipRightHalf, layer.clipLeftPercent, layer.clipRightPercent, layer.clipTopHalfOnly, layer.clipBottomHalfFull, layer.clipBoundaryOffsetPx, layer.clipTopPercent, layer.clipPolygon);
    }
  }

  const mimeType = `image/${options.format}`;
  const quality = options.quality ?? 0.92;

  if (canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type: mimeType, quality });
  } else {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        },
        mimeType,
        quality
      );
    });
  }
}

export async function downloadImage(
  selectedLayers: SelectedLayers,
  options: ExportOptions,
  filename: string = 'wojak',
  g2Selections?: G2Selections,
  selectedColors?: Partial<Record<UILayerName, string>>
): Promise<void> {
  const blob = await exportImage(selectedLayers, options, g2Selections, selectedColors);
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.${options.format}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export async function renderToTargetCanvas(
  targetCanvas: HTMLCanvasElement,
  selectedLayers: SelectedLayers,
  options: {
    includeBackground?: boolean;
  } = {}
): Promise<void> {
  const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Failed to get canvas context');

  const width = targetCanvas.width;
  const height = targetCanvas.height;

  ctx.clearRect(0, 0, width, height);

  const layers = buildRenderLayers(selectedLayers);

  const loadPromises = layers.map(async (layer) => {
    try {
      const image = await loadImage(layer.path);
      return { ...layer, image };
    } catch {
      return null;
    }
  });

  const loadedLayers = (await Promise.all(loadPromises)).filter(
    (l): l is RenderLayer & { image: HTMLImageElement } => l !== null
  );

  loadedLayers.sort((a, b) => a.zIndex - b.zIndex);

  for (const layer of loadedLayers) {
    if (!options.includeBackground && layer.layerName === 'Background') {
      continue;
    }
    if (layer.g2) {
      await drawG2Layer(ctx, layer.g2, width, layer.clipRightHalf, layer.clipLeftPercent, layer.clipRightPercent, layer.clipTopHalfOnly, layer.clipBottomHalfFull, layer.clipBoundaryOffsetPx, layer.clipTopPercent, layer.clipPolygon);
    } else {
      drawLayer(ctx, layer.image, width, layer.clipRightHalf, layer.clipLeftPercent, layer.clipRightPercent, layer.clipTopHalfOnly, layer.clipBottomHalfFull, layer.clipBoundaryOffsetPx, layer.clipTopPercent, layer.clipPolygon);
    }
  }
}

/**
 * Render pre-built layers to an offscreen canvas (used by Rule Builder for live override preview).
 * Skips buildRenderLayers — caller provides the final layer array.
 */
export function hasRequiredSelections(selectedLayers: SelectedLayers): boolean {
  const basePath = selectedLayers.Base;
  return !isSelectionPathEmpty(basePath);
}

export function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = src;
  });
}
