#!/usr/bin/env node
/**
 * Clean Head_Centurion_fill.png edges to fix pixelation when tinting.
 *
 * The fill has rough anti-aliasing - semi-transparent edge pixels get
 * over-darkened by tintDraw's multiply step on dark colors. We:
 * 1. Harden alpha: pixels with alpha < threshold become fully transparent
 * 2. Optionally apply slight blur to smooth jagged stair-stepping first
 */

import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const INPUT = join(ROOT, 'public/assets/wojak-layers/YourWojak-layers/Head_Centurion_fill.png');
const OUTPUT = INPUT; // overwrite in place

const ALPHA_THRESHOLD = 0.4; // pixels below this become fully transparent (removes fringe)

async function main() {
  const { data, info } = await sharp(INPUT)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const d = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);

  let changed = 0;
  for (let i = 0; i < d.length; i += channels) {
    const a = d[i + 3];
    if (a > 0 && a < 255 * ALPHA_THRESHOLD) {
      d[i] = 0;
      d[i + 1] = 0;
      d[i + 2] = 0;
      d[i + 3] = 0;
      changed++;
    } else if (a >= 255 * ALPHA_THRESHOLD && a < 255) {
      d[i + 3] = 255;
      changed++;
    }
  }

  console.log(`Cleaned ${changed} edge pixels (threshold ${ALPHA_THRESHOLD})`);

  await sharp(d, {
    raw: {
      width,
      height,
      channels,
    },
  })
    .png()
    .toFile(OUTPUT);

  console.log(`Wrote ${OUTPUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
