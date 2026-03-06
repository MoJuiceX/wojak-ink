#!/usr/bin/env node
/**
 * Report (and optionally remove) generator layer files that are not referenced
 * by the YourWojak manifest. Dry-run by default.
 */

import { readFileSync, existsSync, readdirSync, statSync, writeFileSync, rmSync } from 'node:fs';
import path, { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const manifestPath = join(repoRoot, 'public/assets/wojak-layers/YourWojak-layers/manifest.json');
const assetDir = join(repoRoot, 'public/assets/wojak-layers/YourWojak-layers');

const INTENTIONAL_NON_MANIFEST_FILES = new Set([
  'Clothes_Suite-Bow_fill.png',
  'Face-wear_MOG-Glasses_blue.png',
  'Head_Cap_fill_armyl.png',
  'Marlboro-Menthol.png',
  'Marlboro-red.png',
  'McDonalds-Logo.png',
  'chia-TN.png',
]);

function parseArgs(argv) {
  return {
    delete: argv.includes('--delete'),
    jsonOut: getArg(argv, '--json-out') ?? join(repoRoot, 'reports', 'manifest-orphans.json'),
    textOut: getArg(argv, '--text-out') ?? join(repoRoot, 'reports', 'manifest-orphans.txt'),
  };
}

function readEnvOverride() {
  const envFiles = ['.env.local', '.env'];

  for (const file of envFiles) {
    const fullPath = join(repoRoot, file);
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

function getArg(argv, name) {
  const match = argv.find((arg) => arg.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : null;
}

function collectFiles(obj, referencedFiles) {
  if (!obj) return;
  if (typeof obj === 'string') {
    if ((obj.endsWith('.png') || obj.endsWith('.webp')) && !obj.startsWith('/')) {
      referencedFiles.add(obj);
    }
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item) => {
      if (typeof item === 'object' && item !== null && item.file) referencedFiles.add(item.file);
      else collectFiles(item, referencedFiles);
    });
    return;
  }
  for (const key of ['outlineFile', 'outline2File', 'fillFile', 'fill1File', 'fill2File', 'detailFile', 'layer0File', 'layer1File']) {
    if (obj[key]) referencedFiles.add(obj[key]);
  }
  for (const key of ['fillFiles', 'outlineFiles']) {
    if (Array.isArray(obj[key])) obj[key].forEach((f) => referencedFiles.add(f));
  }
  for (const key of ['detailOptions', 'frameFiles']) {
    if (Array.isArray(obj[key])) obj[key].forEach((item) => item.file && referencedFiles.add(item.file));
  }
  Object.values(obj).forEach((value) => collectFiles(value, referencedFiles));
}

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

function main() {
  const args = parseArgs(process.argv.slice(2));
  const layerBaseOverride = process.env.VITE_LAYER_BASE_URL || readEnvOverride();

  if (layerBaseOverride) {
    console.log(`[manifest-orphans] skipped — assets served from ${layerBaseOverride}`);
    return;
  }

  if (!existsSync(manifestPath)) {
    console.error(`[manifest-orphans] manifest not found at ${manifestPath}`);
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const referencedFiles = new Set();
  collectFiles(manifest, referencedFiles);

  const actualFiles = getFilesRecursive(assetDir);
  const orphaned = actualFiles.filter(
    (file) => !referencedFiles.has(file) && !INTENTIONAL_NON_MANIFEST_FILES.has(file)
  );

  const report = {
    generatedAt: new Date().toISOString(),
    assetDir: path.relative(repoRoot, assetDir),
    deleteMode: args.delete,
    referencedCount: referencedFiles.size,
    actualCount: actualFiles.length,
    intentionalNonManifestCount: [...INTENTIONAL_NON_MANIFEST_FILES].filter((file) => actualFiles.includes(file)).length,
    orphanedCount: orphaned.length,
    orphaned,
  };

  writeFileSync(args.jsonOut, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(
    args.textOut,
    [
      '# Manifest Orphan Report',
      '',
      `Generated: ${report.generatedAt}`,
      `Asset dir: ${report.assetDir}`,
      `Delete mode: ${report.deleteMode ? 'enabled' : 'dry-run'}`,
      `Referenced files: ${report.referencedCount}`,
      `Actual files: ${report.actualCount}`,
      `Intentional non-manifest files present: ${report.intentionalNonManifestCount}`,
      `Orphaned files: ${report.orphanedCount}`,
      '',
      ...report.orphaned.map((file) => `- ${file}`),
      '',
    ].join('\n'),
    'utf8'
  );

  if (args.delete) {
    for (const file of orphaned) {
      rmSync(join(assetDir, file));
    }
  }

  console.log(`[manifest-orphans] ${args.delete ? 'deleted' : 'identified'} ${orphaned.length} orphaned files`);
  console.log(`[manifest-orphans] wrote ${path.relative(repoRoot, args.jsonOut)} and ${path.relative(repoRoot, args.textOut)}`);
}

main();
