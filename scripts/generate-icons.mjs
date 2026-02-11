#!/usr/bin/env node
/**
 * Generate favicon and PWA manifest icons from the brand image.
 * Uses sharp to output crisp, correctly sized PNGs.
 *
 * Usage: node scripts/generate-icons.mjs [source.png]
 * Default source: public/assets/icons/Wojak_logo.png
 *
 * Run after updating the brand image, or: npm run icons
 */

import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const DEFAULT_SOURCE = join(ROOT, 'public/assets/icons/Wojak_logo.png');
const sourcePath = process.argv[2] ? join(process.cwd(), process.argv[2]) : DEFAULT_SOURCE;

const SIZES = {
  favicon: 32,
  manifest: [72, 96, 128, 144, 152, 192, 384, 512],
};

async function main() {
  if (!existsSync(sourcePath)) {
    console.error('Source image not found:', sourcePath);
    console.error('Usage: node scripts/generate-icons.mjs [path/to/source.png]');
    process.exit(1);
  }

  const iconsDir = join(ROOT, 'public/icons');
  mkdirSync(iconsDir, { recursive: true });

  const buffer = readFileSync(sourcePath);
  const faviconPath = join(ROOT, 'public/favicon.png');

  // Favicon (32x32)
  await sharp(buffer)
    .resize(SIZES.favicon, SIZES.favicon, { fit: 'cover' })
    .png()
    .toFile(faviconPath);
  console.log('  public/favicon.png (32×32)');

  // Manifest icons
  for (const size of SIZES.manifest) {
    const outPath = join(iconsDir, `icon-${size}.png`);
    await sharp(buffer)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(outPath);
    console.log(`  public/icons/icon-${size}.png (${size}×${size})`);
  }

  console.log('Done. Favicon and manifest icons updated.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
