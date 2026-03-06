#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import lighthouse from 'lighthouse';
import { launch as launchChrome } from 'chrome-launcher';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const routes = [];
  const out = {
    host: '127.0.0.1',
    port: 4174,
    outDir: path.join(repoRoot, 'reports', 'lighthouse'),
    routes,
    reuseServer: false,
  };

  for (const arg of argv) {
    if (arg.startsWith('--port=')) out.port = Number(arg.slice('--port='.length));
    else if (arg.startsWith('--host=')) out.host = arg.slice('--host='.length);
    else if (arg.startsWith('--out-dir=')) out.outDir = path.resolve(repoRoot, arg.slice('--out-dir='.length));
    else if (arg.startsWith('--route=')) routes.push(arg.slice('--route='.length));
    else if (arg === '--reuse-server') out.reuseServer = true;
  }

  if (routes.length === 0) {
    out.routes = ['/', '/gallery', '/generator'];
  }

  return out;
}

function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) {
          resolve();
          return;
        }
        retry(new Error(`Server responded with status ${res.statusCode}`));
      });
      req.on('error', retry);
      req.setTimeout(2_000, () => {
        req.destroy(new Error('Request timed out'));
      });
    };

    const retry = (error) => {
      if (Date.now() - start >= timeoutMs) {
        reject(error);
        return;
      }
      setTimeout(attempt, 500);
    };

    attempt();
  });
}

function routeToSlug(route) {
  if (route === '/') return 'home';
  return route.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'route';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await fs.mkdir(args.outDir, { recursive: true });

  const baseUrl = `http://${args.host}:${args.port}`;
  let previewProcess = null;

  if (!args.reuseServer) {
    previewProcess = spawn(
      'npm',
      ['run', 'preview', '--', '--host', args.host, '--port', String(args.port), '--strictPort'],
      {
        cwd: repoRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, FORCE_COLOR: '0' },
      }
    );

    const previewLogPath = path.join(args.outDir, 'preview-server.log');
    const previewLog = await fs.open(previewLogPath, 'w');
    previewProcess.stdout.on('data', (chunk) => previewLog.write(chunk));
    previewProcess.stderr.on('data', (chunk) => previewLog.write(chunk));
    previewProcess.on('exit', async () => {
      await previewLog.close();
    });
  }

  try {
    await waitForServer(`${baseUrl}/`);

    const chrome = await launchChrome({
      chromeFlags: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage'],
    });

    const rows = [];

    try {
      for (const route of args.routes) {
        const slug = routeToSlug(route);
        const targetUrl = `${baseUrl}${route}`;
        const result = await lighthouse(targetUrl, {
          port: chrome.port,
          output: ['html', 'json'],
          logLevel: 'error',
          onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
          preset: 'desktop',
        });

        const [htmlReport, jsonReport] = Array.isArray(result.report)
          ? result.report
          : [result.report, JSON.stringify(result.lhr, null, 2)];

        await fs.writeFile(path.join(args.outDir, `${slug}.html`), htmlReport, 'utf8');
        await fs.writeFile(path.join(args.outDir, `${slug}.json`), jsonReport, 'utf8');

        rows.push({
          route,
          performance: Math.round((result.lhr.categories.performance?.score ?? 0) * 100),
          accessibility: Math.round((result.lhr.categories.accessibility?.score ?? 0) * 100),
          bestPractices: Math.round((result.lhr.categories['best-practices']?.score ?? 0) * 100),
          seo: Math.round((result.lhr.categories.seo?.score ?? 0) * 100),
          fcpMs: result.lhr.audits['first-contentful-paint']?.numericValue ?? null,
          lcpMs: result.lhr.audits['largest-contentful-paint']?.numericValue ?? null,
          tbtMs: result.lhr.audits['total-blocking-time']?.numericValue ?? null,
          cls: result.lhr.audits['cumulative-layout-shift']?.numericValue ?? null,
          speedIndexMs: result.lhr.audits['speed-index']?.numericValue ?? null,
        });
      }
    } finally {
      await chrome.kill();
    }

    const md = [
      '# Lighthouse Baseline',
      '',
      `- Base URL: \`${baseUrl}\``,
      `- Generated: ${new Date().toISOString()}`,
      '',
      '| Route | Perf | A11y | Best | SEO | FCP (ms) | LCP (ms) | TBT (ms) | CLS | Speed Index (ms) |',
      '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
      ...rows.map((row) =>
        `| ${row.route} | ${row.performance} | ${row.accessibility} | ${row.bestPractices} | ${row.seo} | ${Math.round(row.fcpMs ?? 0)} | ${Math.round(row.lcpMs ?? 0)} | ${Math.round(row.tbtMs ?? 0)} | ${(row.cls ?? 0).toFixed(3)} | ${Math.round(row.speedIndexMs ?? 0)} |`
      ),
      '',
    ];

    await fs.writeFile(path.join(args.outDir, 'summary.md'), `${md.join('\n')}\n`, 'utf8');
    console.log(`Wrote Lighthouse reports to ${path.relative(repoRoot, args.outDir)}`);
  } finally {
    if (previewProcess) {
      previewProcess.kill('SIGTERM');
    }
  }
}

main().catch((error) => {
  console.error('[lighthouse-baseline] failed:', error);
  process.exitCode = 1;
});
