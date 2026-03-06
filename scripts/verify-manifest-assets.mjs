#!/usr/bin/env node
/**
 * Verify that every file referenced in YourWojak-layers/manifest.json
 * exists in that directory, and optionally check for orphaned files.
 *
 * Run from repo root: node scripts/verify-manifest-assets.mjs [--strict]
 * --strict: Also fail on orphaned files (files not in manifest)
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function readEnvOverride() {
  const envFiles = ['.env.local', '.env'];

  for (const file of envFiles) {
    const fullPath = join(__dirname, '..', file);
    if (!existsSync(fullPath)) continue;

    const raw = readFileSync(fullPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^VITE_LAYER_BASE_URL=(.*)$/);
      if (!match) continue;
      return match[1].trim().replace(/^['"]|['"]$/g, '');
    }
  }

  return '';
}

const layerBaseOverride = process.env.VITE_LAYER_BASE_URL || readEnvOverride();

// Skip verification when assets are served from R2 (not local)
if (layerBaseOverride) {
  console.log(`✅ Skipping local asset verification — assets served from ${layerBaseOverride}`);
  process.exit(0);
}

const manifestPath = join(__dirname, '../public/assets/wojak-layers/YourWojak-layers/manifest.json');
const assetDir = join(__dirname, '../public/assets/wojak-layers/YourWojak-layers');

const strictMode = process.argv.includes('--strict');

// Some generator assets are intentionally referenced directly by UI/canvas code
// (outside the G2 manifest data model), so they appear "orphaned" from a
// manifest-only perspective. Keep this allowlist explicit and small.
const INTENTIONAL_NON_MANIFEST_FILES = new Set([
  'Clothes_Suite-Bow_fill.png',
  'Face-wear_MOG-Glasses_blue.png',
  'Head_Cap_fill_armyl.png',
  'Marlboro-Menthol.png',
  'Marlboro-red.png',
  'McDonalds-Logo.png',
  'chia-TN.png',
]);

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const referencedFiles = new Set();

function collectFiles(obj) {
  if (!obj) return;
  if (typeof obj === 'string') {
    // Skip absolute paths (e.g., g1Path references to /assets/wojak-layers/HEAD/)
    if ((obj.endsWith('.png') || obj.endsWith('.webp')) && !obj.startsWith('/')) {
      referencedFiles.add(obj);
    }
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item) => {
      if (typeof item === 'object' && item !== null && item.file) referencedFiles.add(item.file);
      else collectFiles(item);
    });
    return;
  }
  // Skip g1Path - these are legacy G1 paths in a different directory
  for (const key of ['outlineFile', 'outline2File', 'fillFile', 'fill1File', 'fill2File', 'detailFile', 'layer0File', 'layer1File']) {
    if (obj[key]) referencedFiles.add(obj[key]);
  }
  for (const key of ['fillFiles', 'outlineFiles']) {
    if (Array.isArray(obj[key])) obj[key].forEach((f) => referencedFiles.add(f));
  }
  for (const key of ['detailOptions', 'frameFiles']) {
    if (Array.isArray(obj[key])) obj[key].forEach((item) => item.file && referencedFiles.add(item.file));
  }
  Object.values(obj).forEach(collectFiles);
}

// Recursively get all PNG/WebP files in directory
function getFilesRecursive(dir, base = '') {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const relPath = base ? `${base}/${entry}` : entry;
    if (statSync(fullPath).isDirectory()) {
      files.push(...getFilesRecursive(fullPath, relPath));
    } else if (entry.endsWith('.png') || entry.endsWith('.webp')) {
      files.push(relPath);
    }
  }
  return files;
}

collectFiles(manifest);

// Check for missing files
const missing = [];
for (const f of referencedFiles) {
  if (!existsSync(join(assetDir, f))) missing.push(f);
}

// Check for orphaned files
const actualFiles = new Set(getFilesRecursive(assetDir));
const orphaned = [...actualFiles].filter(
  (f) => !referencedFiles.has(f) && !INTENTIONAL_NON_MANIFEST_FILES.has(f)
);
const allowedNonManifestPresent = [...actualFiles].filter((f) => INTENTIONAL_NON_MANIFEST_FILES.has(f));

let hasError = false;

if (missing.length) {
  console.error('\n❌ Missing', missing.length, 'files referenced in manifest:\n  ' + missing.join('\n  '));
  hasError = true;
}

if (orphaned.length > 0 && strictMode) {
  console.error('\n❌ Found', orphaned.length, 'orphaned files (not in manifest):\n  ' + orphaned.slice(0, 20).join('\n  '));
  if (orphaned.length > 20) console.error('  ... and', orphaned.length - 20, 'more');
  hasError = true;
}

if (hasError) {
  process.exit(1);
}

console.log('\n✅ Manifest validation passed:');
console.log('   Referenced files:', referencedFiles.size);
console.log('   Actual files:', actualFiles.size);
console.log('   Missing:', missing.length);
if (allowedNonManifestPresent.length) {
  console.log('   Intentional non-manifest files:', allowedNonManifestPresent.length);
}
if (strictMode || orphaned.length === 0) {
  console.log('   Orphaned:', orphaned.length);
} else {
  console.log('   Orphaned:', orphaned.length, '(run with --strict to fail)');
}
