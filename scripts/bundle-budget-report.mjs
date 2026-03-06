#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const out = {
    distDir: path.join(repoRoot, 'dist', 'assets'),
    publicDir: path.join(repoRoot, 'public'),
    jsonOut: path.join(repoRoot, 'reports', 'bundle-budget-latest.json'),
    mdOut: path.join(repoRoot, 'reports', 'bundle-budget-latest.md'),
    enforceHard: false,
    maxJsAssetKb: 406,
    publicAssetThresholdKb: 250,
  };
  for (const arg of argv) {
    if (arg === '--enforce-hard') out.enforceHard = true;
    else if (arg.startsWith('--dist-dir=')) out.distDir = path.resolve(repoRoot, arg.slice('--dist-dir='.length));
    else if (arg.startsWith('--public-dir=')) out.publicDir = path.resolve(repoRoot, arg.slice('--public-dir='.length));
    else if (arg.startsWith('--json-out=')) out.jsonOut = path.resolve(repoRoot, arg.slice('--json-out='.length));
    else if (arg.startsWith('--md-out=')) out.mdOut = path.resolve(repoRoot, arg.slice('--md-out='.length));
    else if (arg.startsWith('--max-js-asset-kb=')) out.maxJsAssetKb = Number(arg.slice('--max-js-asset-kb='.length));
    else if (arg.startsWith('--public-asset-threshold-kb=')) out.publicAssetThresholdKb = Number(arg.slice('--public-asset-threshold-kb='.length));
  }
  return out;
}

function kb(bytes) {
  return Number((bytes / 1024).toFixed(2));
}

function classifyChunk(filePath) {
  const file = path.basename(filePath);
  if (!file.endsWith('.js')) return 'js-other';
  if (file === 'wallet-connect-standalone.js') return 'standalone-entry';
  if (file.startsWith('wallet-connect-standalone-runtime-')) return 'standalone-runtime';
  if (file.startsWith('wallet-connect-standalone-wallet-protocol-')) return 'standalone-wallet-protocol';
  if (file.startsWith('wallet-connect-standalone-wallet-core-')) return 'standalone-wallet-core';
  if (file.startsWith('wallet-connect-standalone-wallet-ui-')) return 'standalone-wallet-ui';
  if (file.startsWith('wallet-connect-standalone-wallet-crypto-')) return 'standalone-wallet-crypto';
  if (file.startsWith('wallet-connect-standalone-')) return 'standalone-other';
  if (file.startsWith('index-')) return 'entry-index';
  if (file.startsWith('vendor-react-')) return 'vendor-react';
  if (file.startsWith('vendor-wallet-ui-')) return 'vendor-wallet-ui';
  if (file.startsWith('vendor-wallet-crypto-')) return 'vendor-wallet-crypto';
  if (file.startsWith('vendor-wallet-')) return 'vendor-wallet';
  if (file.startsWith('vendor-animation-')) return 'vendor-animation';
  if (file.startsWith('vendor-socket-')) return 'vendor-socket';
  if (file.startsWith('vendor-data-')) return 'vendor-data';
  if (file.startsWith('vendor-icons-')) return 'vendor-icons';
  if (file.startsWith('vendor-')) return 'vendor-other';
  if (file.startsWith('html2canvas.esm-')) return 'vendor-html2canvas';
  if (file.startsWith('confetti.module-')) return 'app-shared';
  if (file.startsWith('feature-generator-core-')) return 'feature-generator-core';
  if (/^[A-Z][A-Za-z0-9]+-/.test(file)) return 'route-chunk';
  if (/^[a-z][A-Za-z0-9]+-/.test(file)) return 'app-shared';
  return 'js-other';
}

const BUDGETS = {
  'entry-index': { softKb: 300, hardKb: 360 },
  'vendor-react': { softKb: 330, hardKb: 380 },
  'vendor-wallet': { softKb: 380, hardKb: 430 },
  'vendor-wallet-ui': { softKb: 220, hardKb: 280 },
  'vendor-wallet-crypto': { softKb: 120, hardKb: 160 },
  'vendor-html2canvas': { softKb: 210, hardKb: 260 },
  'feature-generator-core': { softKb: 180, hardKb: 240 },
  'route-chunk': { softKb: 180, hardKb: 240 },
};

function evaluateBudget(group, sizeKb) {
  const budget = BUDGETS[group];
  if (!budget) return { group, sizeKb, softKb: null, hardKb: null, level: 'info' };
  let level = 'pass';
  if (sizeKb > budget.hardKb) level = 'hard';
  else if (sizeKb > budget.softKb) level = 'soft';
  return { group, sizeKb, ...budget, level };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await fs.mkdir(path.dirname(args.jsonOut), { recursive: true });
  await fs.mkdir(path.dirname(args.mdOut), { recursive: true });

  let files;
  try {
    files = await collectFiles(args.distDir);
  } catch (error) {
    console.error(`[bundle-budget] dist assets dir not found: ${args.distDir}`);
    process.exitCode = 2;
    return;
  }

  const jsFiles = files.filter((f) => f.type === 'js').sort((a, b) => b.bytes - a.bytes);
  const cssFiles = files.filter((f) => f.type === 'css').sort((a, b) => b.bytes - a.bytes);
  const publicFiles = await collectPublicFiles(args.publicDir);
  const heavyPublicAssets = publicFiles
    .filter((f) => f.sizeKb >= args.publicAssetThresholdKb)
    .sort((a, b) => b.bytes - a.bytes);
  const standaloneJsFiles = jsFiles
    .filter((f) => f.group.startsWith('standalone-'))
    .sort((a, b) => b.bytes - a.bytes);
  const groupMax = new Map();
  for (const file of jsFiles) {
    const existing = groupMax.get(file.group);
    if (!existing || file.bytes > existing.bytes) groupMax.set(file.group, file);
  }

  const budgetChecks = [...groupMax.values()]
    .filter((f) => BUDGETS[f.group])
    .map((f) => ({ ...evaluateBudget(f.group, f.sizeKb), file: f.file }));

  const hardBreaches = budgetChecks.filter((b) => b.level === 'hard');
  const softBreaches = budgetChecks.filter((b) => b.level === 'soft');
  const perAssetHardBreaches = jsFiles.filter((f) => f.sizeKb > args.maxJsAssetKb);

  // Detect orphaned JS files (not in explicit groups or budget categories)
  const budgetedGroups = new Set(Object.keys(BUDGETS));
  const standaloneGroups = new Set([
    'standalone-entry',
    'standalone-runtime',
    'standalone-wallet-protocol',
    'standalone-wallet-core',
    'standalone-wallet-ui',
    'standalone-wallet-crypto',
    'standalone-other',
  ]);
  const classifiedNonBudgetGroups = new Set([
    'vendor-animation',
    'vendor-socket',
    'vendor-data',
    'vendor-icons',
    'vendor-other',
    'app-shared',
  ]);
  const orphanedJsFiles = jsFiles.filter((f) => {
    if (budgetedGroups.has(f.group)) return false; // Has budget
    if (standaloneGroups.has(f.group)) return false; // Standalone (tracked separately)
    if (classifiedNonBudgetGroups.has(f.group)) return false; // Explicitly classified informational groups
    return true; // Orphaned!
  });
  const orphanedHardBreaches = orphanedJsFiles.filter((f) => f.sizeKb > args.maxJsAssetKb);

  const report = {
    generatedAt: new Date().toISOString(),
    distDir: path.relative(repoRoot, args.distDir),
    limits: {
      maxJsAssetKb: args.maxJsAssetKb,
      publicAssetThresholdKb: args.publicAssetThresholdKb,
    },
    totals: {
      jsFiles: jsFiles.length,
      cssFiles: cssFiles.length,
      publicFiles: publicFiles.length,
      jsKb: kb(jsFiles.reduce((sum, f) => sum + f.bytes, 0)),
      cssKb: kb(cssFiles.reduce((sum, f) => sum + f.bytes, 0)),
    },
    topJs: jsFiles.slice(0, 15).map(({ file, bytes, sizeKb, group }) => ({ file, bytes, sizeKb, group })),
    topCss: cssFiles.slice(0, 10).map(({ file, bytes, sizeKb }) => ({ file, bytes, sizeKb })),
    topPublicAssets: heavyPublicAssets.slice(0, 20).map(({ file, bytes, sizeKb, ext }) => ({
      file,
      bytes,
      sizeKb,
      ext,
    })),
    standaloneJs: standaloneJsFiles.map(({ file, bytes, sizeKb, group }) => ({ file, bytes, sizeKb, group })),
    budgets: budgetChecks,
    perAssetHardBreaches: perAssetHardBreaches.map(({ file, bytes, sizeKb, group }) => ({
      file,
      bytes,
      sizeKb,
      group,
      hardKb: args.maxJsAssetKb,
    })),
    orphanedJs: orphanedJsFiles.map(({ file, bytes, sizeKb, group }) => ({
      file,
      bytes,
      sizeKb,
      group,
      hardKb: args.maxJsAssetKb,
      exceeded: sizeKb > args.maxJsAssetKb,
    })),
    summary: {
      hardBreaches: hardBreaches.length,
      softBreaches: softBreaches.length,
      perAssetHardBreaches: perAssetHardBreaches.length,
      orphanedJs: orphanedJsFiles.length,
      orphanedHardBreaches: orphanedHardBreaches.length,
      status:
        hardBreaches.length || perAssetHardBreaches.length || orphanedHardBreaches.length
          ? 'hard-fail'
          : softBreaches.length
            ? 'soft-warn'
            : 'pass',
    },
  };

  await fs.writeFile(args.jsonOut, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const md = [];
  md.push('# Bundle Budget Report');
  md.push('');
  md.push(`- Generated: ${report.generatedAt}`);
  md.push(`- Dist assets: \`${report.distDir}\``);
  md.push(`- Status: **${report.summary.status}**`);
  md.push(`- Hard breaches: ${report.summary.hardBreaches}`);
  md.push(`- Soft breaches: ${report.summary.softBreaches}`);
  md.push(`- Per-asset JS hard breaches (>${args.maxJsAssetKb}kB): ${report.summary.perAssetHardBreaches}`);
  md.push(`- Orphaned JS files (not in budget groups): ${report.summary.orphanedJs}`);
  md.push(`- Orphaned JS hard breaches (>${args.maxJsAssetKb}kB): ${report.summary.orphanedHardBreaches}`);
  md.push(`- Public assets over ${args.publicAssetThresholdKb}kB: ${report.topPublicAssets.length}`);
  md.push('');
  md.push('## Per-Asset JS Hard Limit');
  md.push(`All shipped JavaScript assets in \`${report.distDir}\` must be <= ${args.maxJsAssetKb} kB.`);
  md.push('');
  md.push('| File | Group | Size (kB) | Hard Limit | Status |');
  md.push('|---|---|---:|---:|---|');
  for (const row of jsFiles.slice(0, 20)) {
    const status = row.sizeKb > args.maxJsAssetKb ? 'hard' : 'pass';
    md.push(`| ${row.file} | ${row.group} | ${row.sizeKb.toFixed(2)} | ${args.maxJsAssetKb} | ${status} |`);
  }
  if (!jsFiles.length) {
    md.push('| (none) | - | - | - | info |');
  }
  md.push('');
  md.push('## Budget Checks');
  md.push('| Group | File | Size (kB) | Soft | Hard | Status |');
  md.push('|---|---|---:|---:|---:|---|');
  for (const b of budgetChecks.sort((a, b2) => b2.sizeKb - a.sizeKb)) {
    md.push(`| ${b.group} | ${b.file} | ${b.sizeKb.toFixed(2)} | ${b.softKb} | ${b.hardKb} | ${b.level} |`);
  }
  if (!budgetChecks.length) {
    md.push('| (none) | - | - | - | - | info |');
  }
  md.push('');
  md.push('## Standalone Wallet Assets');
  md.push('| File | Group | Size (kB) |');
  md.push('|---|---|---:|');
  for (const row of report.standaloneJs) {
    md.push(`| ${row.file} | ${row.group} | ${row.sizeKb.toFixed(2)} |`);
  }
  if (!report.standaloneJs.length) {
    md.push('| (none found) | - | - |');
  }
  md.push('');
  md.push('## Orphaned JS Files');
  md.push('⚠️ These files are not in explicit budget groups and may have been missed in optimization.');
  md.push('| File | Group | Size (kB) | Hard Limit | Status |');
  md.push('|---|---|---:|---:|---|');
  for (const row of report.orphanedJs) {
    const status = row.exceeded ? '⚠️ HARD' : 'info';
    md.push(`| ${row.file} | ${row.group} | ${row.sizeKb.toFixed(2)} | ${row.hardKb} | ${status} |`);
  }
  if (!report.orphanedJs.length) {
    md.push('| (none - all assets accounted for!) | - | - | - | ✓ |');
  }
  md.push('');
  md.push('## Top JS Chunks');
  md.push('| File | Group | Size (kB) |');
  md.push('|---|---|---:|');
  for (const row of report.topJs.slice(0, 10)) {
    md.push(`| ${row.file} | ${row.group} | ${row.sizeKb.toFixed(2)} |`);
  }
  md.push('');
  md.push('## Top CSS Assets');
  md.push('| File | Size (kB) |');
  md.push('|---|---:|');
  for (const row of report.topCss.slice(0, 10)) {
    md.push(`| ${row.file} | ${row.sizeKb.toFixed(2)} |`);
  }
  md.push('');
  md.push(`## Top Public Assets (>${args.publicAssetThresholdKb}kB)`);
  md.push('| File | Ext | Size (kB) |');
  md.push('|---|---|---:|');
  for (const row of report.topPublicAssets) {
    md.push(`| ${row.file} | ${row.ext} | ${row.sizeKb.toFixed(2)} |`);
  }
  if (!report.topPublicAssets.length) {
    md.push('| (none) | - | - |');
  }
  md.push('');

  await fs.writeFile(args.mdOut, `${md.join('\n')}\n`, 'utf8');

  console.log(`[bundle-budget] status=${report.summary.status} hard=${report.summary.hardBreaches} soft=${report.summary.softBreaches} orphaned=${report.summary.orphanedJs}`);
  console.log(`[bundle-budget] orphaned hard breaches=${report.summary.orphanedHardBreaches}`);
  console.log(`[bundle-budget] wrote ${path.relative(repoRoot, args.jsonOut)} and ${path.relative(repoRoot, args.mdOut)}`);

  if (args.enforceHard && (hardBreaches.length > 0 || perAssetHardBreaches.length > 0 || orphanedHardBreaches.length > 0)) {
    console.error(`[bundle-budget] FAIL: Found orphaned JS files exceeding ${args.maxJsAssetKb}kB hard limit`);
    process.exitCode = 1;
  }
}

async function collectFiles(rootDir) {
  const out = [];
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(abs);
        continue;
      }
      if (!entry.isFile()) continue;
      const stat = await fs.stat(abs);
      const rel = path.relative(rootDir, abs).replaceAll(path.sep, '/');
      out.push({
        file: rel,
        bytes: stat.size,
        sizeKb: kb(stat.size),
        type: rel.endsWith('.css') ? 'css' : rel.endsWith('.js') ? 'js' : 'other',
        group: classifyChunk(rel),
      });
    }
  }
  await walk(rootDir);
  return out;
}

async function collectPublicFiles(rootDir) {
  const out = [];
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(abs);
        continue;
      }
      if (!entry.isFile()) continue;
      const stat = await fs.stat(abs);
      const file = path.relative(repoRoot, abs).replace(/\\/g, '/');
      out.push({
        file,
        bytes: stat.size,
        sizeKb: kb(stat.size),
        ext: path.extname(abs).slice(1) || 'unknown',
      });
    }
  }

  await walk(rootDir);
  return out;
}

main().catch((error) => {
  console.error(`[bundle-budget] ${error?.stack || error}`);
  process.exitCode = 1;
});
