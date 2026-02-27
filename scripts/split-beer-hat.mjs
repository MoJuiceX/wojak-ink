#!/usr/bin/env node
/**
 * split-beer-hat.mjs
 *
 * Pre-splits Beer Hat PNG images into left-main and right-behind variants.
 * This eliminates the need for runtime canvas clipping, which is broken on iOS WebKit.
 *
 * Split regions (1000×1000 canvas):
 *   Right-behind (_right): x:[620,1000], y:[0,500] — top-right rectangle only
 *   Left-main   (_left):   L-shape — x:[0,630] y:[0,500] + x:[0,1000] y:[500,1000]
 *
 * The 10px overlap (x:620-630, top half) prevents visible seams.
 * The left-main layer renders at z=12 (on top), so its pixels win in the overlap.
 *
 * Usage: node scripts/split-beer-hat.mjs
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSET_DIR = path.join(__dirname, '..', 'public', 'assets', 'wojak-layers', 'YourWojak-layers');

// Canvas dimensions
const SIZE = 1000;
const HALF_H = 500;

// Clip boundaries (matching canvasRenderer.ts values exactly)
// BeerHatRightBehind: clipLeftPercent=0.62, clipTopHalfOnly=true → right starts at x=620
// Head: clipRightPercent=0.37, clipBottomHalfFull=true → left extends to x=630
const RIGHT_START_X = 620;  // Math.round(1000 * 0.62)
const LEFT_END_X = 630;     // Math.round(1000 * (1 - 0.37))

// Source files: 1 outline + 18 detail options
const OUTLINE = 'Head_Beer-Hat_outline.png';
const DETAILS = [
  'Head_Beer-Hat_detail_7up.png',
  'Head_Beer-Hat_detail_AW.png',
  'Head_Beer-Hat_detail_budweiser.png',
  'Head_Beer-Hat_detail_captainmorgan.png',
  'Head_Beer-Hat_detail_citrus.png',
  'Head_Beer-Hat_detail_Coffee.png',
  'Head_Beer-Hat_detail_Coke.png',
  'Head_Beer-Hat_detail_corona.png',
  'Head_Beer-Hat_detail_DrPepper.png',
  'Head_Beer-Hat_detail_Heineken.png',
  'Head_Beer-Hat_detail_LaCroix.png',
  'Head_Beer-Hat_detail_Modelo.png',
  'Head_Beer-Hat_detail_monster.png',
  'Head_Beer-Hat_detail_monster-orange.png',
  'Head_Beer-Hat_detail_MtnDew.png',
  'Head_Beer-Hat_detail_red-bull.png',
  'Head_Beer-Hat_detail_Sunny-D.png',
  'Head_Beer-Hat_detail_Tang.png',
];

const ALL_SOURCES = [OUTLINE, ...DETAILS];

/**
 * Create the right-behind variant: only top-right rectangle visible.
 * Region: x:[RIGHT_START_X, SIZE], y:[0, HALF_H]
 * Everything else is transparent.
 */
async function createRightBehind(srcPath, dstPath) {
  const width = SIZE - RIGHT_START_X; // 380
  const height = HALF_H;              // 500

  // Extract the top-right rectangle from source
  const extracted = await sharp(srcPath)
    .extract({ left: RIGHT_START_X, top: 0, width, height })
    .toBuffer();

  // Create a 1000x1000 transparent canvas and composite the extracted piece at its original position
  await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([{ input: extracted, left: RIGHT_START_X, top: 0 }])
    .png()
    .toFile(dstPath);
}

/**
 * Create the left-main variant: L-shaped region visible.
 * Region: x:[0, LEFT_END_X] y:[0, HALF_H] (top-left) + x:[0, SIZE] y:[HALF_H, SIZE] (full bottom)
 * The top-right rectangle (x:[LEFT_END_X, SIZE], y:[0, HALF_H]) is erased to transparent.
 */
async function createLeftMain(srcPath, dstPath) {
  // Strategy: extract two pieces and composite them onto transparent canvas
  // Piece 1: top-left rectangle x:[0, LEFT_END_X], y:[0, HALF_H]
  const topLeft = await sharp(srcPath)
    .extract({ left: 0, top: 0, width: LEFT_END_X, height: HALF_H })
    .toBuffer();

  // Piece 2: full bottom half x:[0, SIZE], y:[HALF_H, SIZE]
  const bottom = await sharp(srcPath)
    .extract({ left: 0, top: HALF_H, width: SIZE, height: HALF_H })
    .toBuffer();

  // Composite both pieces onto transparent canvas
  await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([
      { input: topLeft, left: 0, top: 0 },
      { input: bottom, left: 0, top: HALF_H },
    ])
    .png()
    .toFile(dstPath);
}

function getSplitName(filename, side) {
  const ext = path.extname(filename);
  const base = filename.slice(0, -ext.length);
  return `${base}_${side}${ext}`;
}

async function main() {
  console.log(`\nSplitting ${ALL_SOURCES.length} Beer Hat images into left/right variants...\n`);
  console.log(`  Asset dir: ${ASSET_DIR}`);
  console.log(`  Right-behind: x:[${RIGHT_START_X},${SIZE}], y:[0,${HALF_H}]`);
  console.log(`  Left-main:    x:[0,${LEFT_END_X}] y:[0,${HALF_H}] + x:[0,${SIZE}] y:[${HALF_H},${SIZE}]`);
  console.log(`  Overlap zone: x:[${RIGHT_START_X},${LEFT_END_X}] y:[0,${HALF_H}] (10px)\n`);

  let created = 0;
  let errors = 0;

  for (const filename of ALL_SOURCES) {
    const srcPath = path.join(ASSET_DIR, filename);
    if (!fs.existsSync(srcPath)) {
      console.error(`  ✗ Missing: ${filename}`);
      errors++;
      continue;
    }

    const rightName = getSplitName(filename, 'right');
    const leftName = getSplitName(filename, 'left');
    const rightPath = path.join(ASSET_DIR, rightName);
    const leftPath = path.join(ASSET_DIR, leftName);

    try {
      await createRightBehind(srcPath, rightPath);
      await createLeftMain(srcPath, leftPath);
      const rightSize = fs.statSync(rightPath).size;
      const leftSize = fs.statSync(leftPath).size;
      console.log(`  ✓ ${filename}`);
      console.log(`    → ${rightName} (${(rightSize / 1024).toFixed(1)} KB)`);
      console.log(`    → ${leftName} (${(leftSize / 1024).toFixed(1)} KB)`);
      created += 2;
    } catch (err) {
      console.error(`  ✗ Failed: ${filename} — ${err.message}`);
      errors++;
    }
  }

  console.log(`\nDone! Created ${created} files, ${errors} errors.`);
  if (errors > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
