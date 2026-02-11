/**
 * Credit Reconciliation — run audit since date and exit 1 if events are missing
 *
 * Use from cron or GitHub Actions to detect when MintGarden events are not
 * yet in the DB (worker lag or backfill gap). On MISSING_EVENTS, exit 1 so
 * alerting can fire.
 *
 * Usage:
 *   npx tsx scripts/credits-reconcile.ts
 *   npx tsx scripts/credits-reconcile.ts --since=2026-01-05 --compare=https://wojak.ink
 *
 * Env:
 *   SITE_BASE_URL — default for --compare (default https://wojak.ink)
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_SINCE = '2026-01-05';
const DEFAULT_COMPARE = process.env.SITE_BASE_URL || 'https://wojak.ink';

function parseArgs(): { since: string; compare: string } {
  const args = process.argv.slice(2);
  let since = DEFAULT_SINCE;
  let compare = DEFAULT_COMPARE;
  for (const arg of args) {
    if (arg.startsWith('--since=')) since = arg.slice(8).trim();
    if (arg.startsWith('--compare=')) compare = arg.slice(10).trim() || DEFAULT_COMPARE;
  }
  return { since, compare };
}

function runAudit(since: string, compare: string): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(
      'npx',
      ['tsx', 'scripts/audit-credits-since-date.ts', `--since=${since}`, `--compare=${compare}`],
      { stdio: 'inherit', cwd: path.resolve(__dirname, '..') }
    );
    child.on('close', (code) => resolve(code ?? 0));
    child.on('error', () => resolve(1));
  });
}

interface Report {
  status: string;
  since?: string;
  missingCount?: number;
  compareBase?: string;
}

function readReport(since: string): Report | null {
  const sinceNoDashes = since.replace(/-/g, '');
  const reportPath = path.join(__dirname, `audit-credits-since-${sinceNoDashes}-report.json`);
  if (!fs.existsSync(reportPath)) return null;
  try {
    const raw = fs.readFileSync(reportPath, 'utf8');
    return JSON.parse(raw) as Report;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const { since, compare } = parseArgs();
  console.log('Credits reconciliation: audit since', since, 'compare', compare);
  const exitCode = await runAudit(since, compare);
  if (exitCode !== 0) {
    console.error('Audit script exited with', exitCode);
    process.exit(exitCode);
  }
  const report = readReport(since);
  if (!report) {
    console.error('No report file found (run with --compare to generate report).');
    process.exit(1);
  }
  if (report.status === 'MISSING_EVENTS') {
    console.error('Reconciliation failed: MISSING_EVENTS');
    console.error('Missing count:', report.missingCount ?? '?');
    console.error('Re-run backfill or fix worker, then re-run this script.');
    process.exit(1);
  }
  console.log('Reconciliation OK:', report.status);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
