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
    jsonOut: path.join(repoRoot, 'reports', 'bundle-budget-latest.json'),
    mdOut: path.join(repoRoot, 'reports', 'bundle-budget-latest.md'),
    enforceHard: false,
  };
  for (const arg of argv) {
    if (arg === '--enforce-hard') out.enforceHard = true;
    else if (arg.startsWith('--dist-dir=')) out.distDir = path.resolve(repoRoot, arg.slice('--dist-dir='.length));
    else if (arg.startsWith('--json-out=')) out.jsonOut = path.resolve(repoRoot, arg.slice('--json-out='.length));
    else if (arg.startsWith('--md-out=')) out.mdOut = path.resolve(repoRoot, arg.slice('--md-out='.length));
  }
  return out;
}

function kb(bytes) {
  return Number((bytes / 1024).toFixed(2));
}

function classifyChunk(file) {
  if (!file.endsWith('.js')) return 'js-other';
  if (file.startsWith('index-')) return 'entry-index';
  if (file.startsWith('vendor-react-')) return 'vendor-react';
  if (file.startsWith('vendor-wallet-ui-')) return 'vendor-wallet-ui';
  if (file.startsWith('vendor-wallet-crypto-')) return 'vendor-wallet-crypto';
  if (file.startsWith('vendor-wallet-')) return 'vendor-wallet';
  if (file.startsWith('feature-generator-core-')) return 'feature-generator-core';
  return 'js-other';
}

const BUDGETS = {
  'entry-index': { softKb: 300, hardKb: 360 },
  'vendor-react': { softKb: 330, hardKb: 380 },
  'vendor-wallet': { softKb: 380, hardKb: 430 },
  'vendor-wallet-ui': { softKb: 220, hardKb: 280 },
  'vendor-wallet-crypto': { softKb: 120, hardKb: 160 },
  'feature-generator-core': { softKb: 180, hardKb: 240 },
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

  let entries;
  try {
    entries = await fs.readdir(args.distDir, { withFileTypes: true });
  } catch (error) {
    console.error(`[bundle-budget] dist assets dir not found: ${args.distDir}`);
    process.exitCode = 2;
    return;
  }

  const files = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const abs = path.join(args.distDir, entry.name);
    const stat = await fs.stat(abs);
    files.push({
      file: entry.name,
      bytes: stat.size,
      sizeKb: kb(stat.size),
      type: entry.name.endsWith('.css') ? 'css' : entry.name.endsWith('.js') ? 'js' : 'other',
      group: classifyChunk(entry.name),
    });
  }

  const jsFiles = files.filter((f) => f.type === 'js').sort((a, b) => b.bytes - a.bytes);
  const cssFiles = files.filter((f) => f.type === 'css').sort((a, b) => b.bytes - a.bytes);
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

  const report = {
    generatedAt: new Date().toISOString(),
    distDir: path.relative(repoRoot, args.distDir),
    totals: {
      jsFiles: jsFiles.length,
      cssFiles: cssFiles.length,
      jsKb: kb(jsFiles.reduce((sum, f) => sum + f.bytes, 0)),
      cssKb: kb(cssFiles.reduce((sum, f) => sum + f.bytes, 0)),
    },
    topJs: jsFiles.slice(0, 15).map(({ file, bytes, sizeKb, group }) => ({ file, bytes, sizeKb, group })),
    topCss: cssFiles.slice(0, 10).map(({ file, bytes, sizeKb }) => ({ file, bytes, sizeKb })),
    budgets: budgetChecks,
    summary: {
      hardBreaches: hardBreaches.length,
      softBreaches: softBreaches.length,
      status: hardBreaches.length ? 'hard-fail' : softBreaches.length ? 'soft-warn' : 'pass',
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

  await fs.writeFile(args.mdOut, `${md.join('\n')}\n`, 'utf8');

  console.log(`[bundle-budget] status=${report.summary.status} hard=${report.summary.hardBreaches} soft=${report.summary.softBreaches}`);
  console.log(`[bundle-budget] wrote ${path.relative(repoRoot, args.jsonOut)} and ${path.relative(repoRoot, args.mdOut)}`);

  if (args.enforceHard && hardBreaches.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[bundle-budget] ${error?.stack || error}`);
  process.exitCode = 1;
});
