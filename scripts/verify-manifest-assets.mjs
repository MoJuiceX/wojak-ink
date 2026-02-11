#!/usr/bin/env node
/**
 * Verify that every file referenced in YourWojak-layers/manifest.json
 * exists in that directory. Run from repo root: node scripts/verify-manifest-assets.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifestPath = join(__dirname, '../public/assets/wojak-layers/YourWojak-layers/manifest.json');
const assetDir = join(__dirname, '../public/assets/wojak-layers/YourWojak-layers');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const files = new Set();

function collectFiles(obj) {
  if (!obj) return;
  if (typeof obj === 'string') {
    if (obj.endsWith('.png') || obj.endsWith('.webp')) files.add(obj);
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item) => {
      if (typeof item === 'object' && item !== null && item.file) files.add(item.file);
      else collectFiles(item);
    });
    return;
  }
  for (const key of ['outlineFile', 'outline2File', 'fillFile', 'fill1File', 'fill2File', 'detailFile', 'layer0File', 'layer1File']) {
    if (obj[key]) files.add(obj[key]);
  }
  for (const key of ['fillFiles', 'outlineFiles']) {
    if (Array.isArray(obj[key])) obj[key].forEach((f) => files.add(f));
  }
  for (const key of ['detailOptions', 'frameFiles']) {
    if (Array.isArray(obj[key])) obj[key].forEach((item) => item.file && files.add(item.file));
  }
  Object.values(obj).forEach(collectFiles);
}

collectFiles(manifest);
const missing = [];
for (const f of files) {
  if (!existsSync(join(assetDir, f))) missing.push(f);
}

if (missing.length) {
  console.error('Missing', missing.length, 'files:\n' + missing.join('\n'));
  process.exit(1);
}
console.log('OK: all', files.size, 'referenced files exist.');
