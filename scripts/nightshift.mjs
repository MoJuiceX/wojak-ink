#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const out = {
    dryRun: true,
    real: false,
    resume: false,
    queue: '.nightshift/tasks.json',
    policy: '.nightshift/policy.json',
    maxHours: 8,
    maxTasks: 20,
    softFailures: 5,
    hardFailures: 10,
    allowE2E: false,
    reportOnly: false,
    state: null,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') { out.dryRun = true; out.real = false; continue; }
    if (arg === '--real') { out.real = true; out.dryRun = false; continue; }
    if (arg === '--resume') { out.resume = true; continue; }
    if (arg === '--allow-e2e') { out.allowE2E = true; continue; }
    if (arg === '--report-only') { out.reportOnly = true; continue; }
    const [k, v] = arg.split('=');
    if (!v) continue;
    if (k === '--queue') out.queue = v;
    else if (k === '--policy') out.policy = v;
    else if (k === '--max-hours') out.maxHours = Number(v);
    else if (k === '--max-tasks') out.maxTasks = Number(v);
    else if (k === '--soft-failures') out.softFailures = Number(v);
    else if (k === '--hard-failures') out.hardFailures = Number(v);
    else if (k === '--state') out.state = v;
  }
  return out;
}

function tsStamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function isoNow() {
  return new Date().toISOString();
}

async function readJson(file) {
  const raw = await fs.readFile(file, 'utf8');
  return JSON.parse(raw);
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function compileRegexes(patterns, flags = 'g') {
  return (patterns || []).map((p) => new RegExp(p, flags));
}

function redact(text, redactors) {
  if (!text) return text;
  let out = text;
  for (const rx of redactors) {
    out = out.replace(rx, (...args) => {
      const match = args[0];
      if (args.length >= 3 && typeof args[1] === 'string') {
        const firstGroup = args[1];
        if (match !== firstGroup) {
          return match.replace(firstGroup, `${firstGroup}[REDACTED]`);
        }
      }
      return '[REDACTED]';
    });
  }
  return out;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function normalizeCommand(command) {
  const legacyTaskMatch = command.match(/^\s*codex\s+--task\s+(['"])([\s\S]*)\1\s*$/);
  if (legacyTaskMatch) {
    const prompt = legacyTaskMatch[2];
    // Queue files authored by humans may still use the legacy `codex --task` form.
    // Normalize to a non-interactive invocation so Night Shift can execute unattended.
    return `codex exec --full-auto --cd ${shellQuote(repoRoot)} ${shellQuote(prompt)}`;
  }
  return command;
}

function classifyCommand(command, policy, allowE2E = false) {
  if (allowE2E && /playwright\s+test/.test(command)) {
    return { allowed: true, reason: 'allow-e2e override' };
  }

  for (const frag of policy.denyIfContains || []) {
    if (command.includes(frag)) {
      return { allowed: false, reason: `denied substring: ${frag}` };
    }
  }
  for (const pattern of policy._denyRegexes || []) {
    if (pattern.test(command)) {
      return { allowed: false, reason: `denied pattern: ${pattern}` };
    }
  }
  return { allowed: true, reason: 'allowed' };
}

function expandCommandTemplate(command, state) {
  const replacements = {
    '{{RUN_ID}}': state.runId,
    '{{LOG_PATH}}': path.relative(repoRoot, state.logPath),
    '{{REPORT_PATH}}': path.relative(repoRoot, state.reportPath),
    '{{STATE_PATH}}': path.relative(repoRoot, state.statePath),
    '{{REPO_ROOT}}': repoRoot,
  };
  let expanded = command;
  for (const [token, value] of Object.entries(replacements)) {
    expanded = expanded.split(token).join(value);
  }
  return normalizeCommand(expanded);
}

async function runGit(args, { cwd = repoRoot } = {}) {
  const result = await runCommand(`git ${args.join(' ')}`, {
    cwd,
    timeoutMs: 30000,
    redactors: [],
    shell: process.env.SHELL || '/bin/zsh',
    log: null,
  });
  if (result.code !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  return (result.stdout || '').trim();
}

function clip(text, max = 1500) {
  if (!text) return '';
  return text.length <= max ? text : `${text.slice(0, max)}\n...[truncated ${text.length - max} chars]`;
}

function summarizeCommandOutput(result, command = '') {
  const combined = `${result.stdout || ''}\n${result.stderr || ''}`.trim();
  if (!combined) return '';
  const lines = combined.split(/\r?\n/);
  const isVitestCommand = /\bvitest\b|npm run test:unit/.test(command);
  const isBuildCommand = /\bnpm run build\b/.test(command);
  const testsPassed = /Test Files\s+\d+\s+passed/i.test(combined);
  const stderrBlockHeaders = lines.filter((l) => /^stderr \|/i.test(l)).length;

  const normalizedLines = lines.filter((l) => {
    if (!(isVitestCommand && testsPassed)) return true;
    if (/^stderr \|/i.test(l)) return false;
    if (/^\(node:\d+\) Warning: `--localstorage-file` was provided without a valid path/i.test(l)) return false;
    if (/^\(Use `node --trace-warnings \.\.\.`/i.test(l)) return false;
    return true;
  });

  const interesting = normalizedLines.filter((l) => /error|fail|warning|vulnerab|built in|problems|PASS|FAIL|Test Files|Failed Tests|chunks are larger|chunkSizeWarningLimit|Orphaned:|Intentional non-manifest/i.test(l));
  const chosenLines = (interesting.length ? interesting : normalizedLines).slice(0, 20);
  if (isVitestCommand && testsPassed && stderrBlockHeaders > 0) {
    chosenLines.unshift(`[NightShift] Suppressed ${stderrBlockHeaders} passing-test stderr block headers in report excerpt (see log for full output).`);
  }
  if (isBuildCommand) {
    const chunkRows = [];
    for (const l of lines) {
      const m = l.match(/dist\/assets\/([^\s]+\.js)\s+([\d.]+)\s+kB/);
      if (!m) continue;
      chunkRows.push({ file: m[1], sizeKb: Number(m[2]) });
    }
    if (chunkRows.length) {
      const top = chunkRows.sort((a, b) => b.sizeKb - a.sizeKb).slice(0, 3);
      const summary = top.map((c) => `${c.file} (${c.sizeKb.toFixed(2)}kB)`).join(', ');
      chosenLines.unshift(`[NightShift] Largest JS chunks: ${summary}`);
    }
  }
  const chosen = chosenLines.join('\n');
  return clip(chosen, 3000);
}

async function runCommand(command, opts) {
  const {
    cwd,
    timeoutMs,
    redactors,
    shell,
    log,
  } = opts;

  return new Promise((resolve) => {
    const childEnv = {
      ...process.env,
      // Mark all Night Shift child processes as unattended so downstream tools
      // (notably Playwright) can enforce production-safe defaults.
      NIGHTSHIFT_UNATTENDED: '1',
    };
    const child = spawn(shell, ['-lc', command], { cwd, env: childEnv });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const startedAt = Date.now();

    const appendLog = async (chunk, streamName) => {
      if (!log) return;
      const text = redact(chunk.toString(), redactors);
      await fs.appendFile(log, `[${new Date().toISOString()}] [${streamName}] ${text}`);
    };

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      if (stdout.length > 200000) stdout = stdout.slice(-200000);
      void appendLog(chunk, 'stdout');
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      if (stderr.length > 200000) stderr = stderr.slice(-200000);
      void appendLog(chunk, 'stderr');
    });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 5000).unref();
    }, timeoutMs);

    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({
        code: code ?? (timedOut ? 124 : 1),
        signal,
        timedOut,
        stdout: redact(stdout, redactors),
        stderr: redact(stderr, redactors),
        durationMs: Date.now() - startedAt,
      });
    });
  });
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

function backoffMs(attempt) {
  return [5000, 15000, 45000][attempt - 1] ?? 45000;
}

async function findLatestStateFile(stateDir) {
  try {
    const files = (await fs.readdir(stateDir))
      .filter((f) => /^nightshift-\d{8}-\d{6}\.json$/.test(f))
      .sort();
    if (!files.length) return null;
    return path.join(stateDir, files.at(-1));
  } catch {
    return null;
  }
}

async function writeState(statePath, state) {
  await fs.writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function taskIsRunnable(task, taskStatuses) {
  if (task.enabled === false) return { runnable: false, reason: task.disabledReason || 'disabled' };
  for (const dep of task.dependsOn || []) {
    const depStatus = taskStatuses[dep];
    if (depStatus !== 'success' && depStatus !== 'planned') {
      return { runnable: false, reason: `waiting on dependency: ${dep} (${depStatus || 'not-run'})` };
    }
  }
  return { runnable: true, reason: 'ready' };
}

async function preflight(policy, args, redactors, logPath) {
  const shell = process.env.SHELL || '/bin/zsh';
  const [branchRes, topRes, gitDirRes, commonDirRes, worktreesRes] = await Promise.all([
    runCommand('git rev-parse --abbrev-ref HEAD', { cwd: repoRoot, timeoutMs: 30000, redactors, shell, log: logPath }),
    runCommand('git rev-parse --show-toplevel', { cwd: repoRoot, timeoutMs: 30000, redactors, shell, log: logPath }),
    runCommand('git rev-parse --git-dir', { cwd: repoRoot, timeoutMs: 30000, redactors, shell, log: logPath }),
    runCommand('git rev-parse --git-common-dir', { cwd: repoRoot, timeoutMs: 30000, redactors, shell, log: logPath }),
    runCommand('git worktree list', { cwd: repoRoot, timeoutMs: 30000, redactors, shell, log: logPath }),
  ]);

  const branch = branchRes.stdout.trim();
  const topLevel = topRes.stdout.trim();
  const gitDir = gitDirRes.stdout.trim();
  const gitCommonDir = commonDirRes.stdout.trim();
  const isLinkedWorktree = gitDir !== gitCommonDir || gitDir.includes('/worktrees/');
  const branchOk = new RegExp(policy.branchPattern).test(branch);

  const issues = [];
  if (!branchOk) issues.push(`branch '${branch}' does not match policy pattern`);
  if (policy.requireWorktree && !isLinkedWorktree) issues.push('not running from a linked git worktree');
  if (args.real && issues.length) {
    throw new Error(`Preflight failed: ${issues.join('; ')}`);
  }

  return { branch, topLevel, gitDir, gitCommonDir, isLinkedWorktree, worktreeList: worktreesRes.stdout.trim(), issues };
}

function makeReport(state, policy, args) {
  const lines = [];
  lines.push(`# Night Shift Report — ${state.runId}`);
  lines.push('');
  lines.push(`- Mode: ${state.mode}`);
  lines.push(`- Started: ${state.startedAt}`);
  lines.push(`- Finished: ${state.finishedAt || isoNow()}`);
  lines.push(`- Branch: ${state.preflight.branch}`);
  lines.push(`- Worktree: ${state.preflight.topLevel}`);
  lines.push(`- Safe policy: ${state.policyPath}`);
  lines.push(`- Queue: ${state.queuePath}`);
  lines.push(`- Stop conditions: maxHours=${args.maxHours}, maxTasks=${args.maxTasks}, softFailures=${args.softFailures}, hardFailures=${args.hardFailures}`);
  lines.push('');

  if (state.preflight.issues?.length) {
    lines.push('## Preflight Warnings');
    for (const issue of state.preflight.issues) lines.push(`- ${issue}`);
    lines.push('');
  }

  lines.push('## Summary');
  lines.push(`- Tasks attempted: ${state.summary.attempted}`);
  lines.push(`- Succeeded: ${state.summary.succeeded}`);
  lines.push(`- Failed: ${state.summary.failed}`);
  lines.push(`- Skipped: ${state.summary.skipped}`);
  lines.push(`- Planned only: ${state.summary.planned}`);
  lines.push(`- Report-only mode activated: ${state.summary.reportOnlyModeActivated ? 'yes' : 'no'}`);
  lines.push('');

  lines.push('## Task Results');
  lines.push('| ID | Status | Risk | Mode | Mutates | Duration | Notes |');
  lines.push('|---|---|---|---|---:|---:|---|');
  for (const task of state.tasks) {
    lines.push(`| ${task.id} | ${task.status} | ${task.risk} | ${task.mode} | ${task.mutatesCode ? 'yes' : 'no'} | ${task.durationMs ?? 0}ms | ${task.note || ''} |`);
  }
  lines.push('');

  lines.push('## Findings (Auto-generated next steps)');
  const nextSteps = [];
  for (const task of state.tasks) {
    for (const cmd of task.commands || []) {
      const s = cmd.summary || '';
      const lintHasErrors = /\b\d+\s+problems?\s+\(\s*[1-9]\d*\s+errors?/i.test(s);
      if (lintHasErrors) nextSteps.push('Prioritize ESLint hard errors before warning cleanup.');
      if (/Failed Tests|Test Files\s+4 failed|9 failed/i.test(s)) nextSteps.push('Fix current unit test regressions (mint pipeline + brittle combat trait-count assertion).');
      const auditHasDirectFindings = /swiper|lodash/i.test(s) || /"total"\s*:\s*[1-9]\d*/i.test(s);
      if (auditHasDirectFindings) nextSteps.push('Patch direct dependency vulnerabilities (`swiper`, `lodash`) with gated checks.');
      if (/chunks are larger than|chunkSizeWarningLimit|Adjust chunk size limit/i.test(s)) nextSteps.push('Create code-splitting plan for main chunk and review manualChunks strategy.');
      if (/Orphaned:\s*(?!0\b)\d+/i.test(s)) nextSteps.push('Review manifest orphan assets and decide remove vs intentional keep.');
      if (/Test Files\s+\d+\s+passed/i.test(s) && /stderr \|/i.test(s)) nextSteps.push('Reduce noisy expected test stderr output to keep nightly reports focused on regressions.');
    }
  }
  for (const item of [...new Set(nextSteps)].slice(0, 12)) lines.push(`- ${item}`);
  if (!nextSteps.length) lines.push('- No automatic findings were derived from command output in this run.');
  lines.push('');

  lines.push('## Command Details');
  for (const task of state.tasks) {
    lines.push(`### ${task.id} — ${task.status}`);
    if (task.note) lines.push(`- Note: ${task.note}`);
    for (const cmd of task.commands || []) {
      lines.push(`- Command: \`${cmd.command}\``);
      lines.push(`  - Status: ${cmd.status}`);
      if (cmd.classification) lines.push(`  - Policy: ${cmd.classification.allowed ? 'allowed' : 'blocked'} (${cmd.classification.reason})`);
      if (typeof cmd.durationMs === 'number') lines.push(`  - Duration: ${cmd.durationMs}ms`);
      if (cmd.attempts) lines.push(`  - Attempts: ${cmd.attempts}`);
      if (cmd.summary) {
        lines.push('  - Excerpt:');
        lines.push('');
        lines.push('```text');
        lines.push(cmd.summary);
        lines.push('```');
      }
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const queuePath = path.resolve(repoRoot, args.queue);
  const policyPath = path.resolve(repoRoot, args.policy);
  const queue = await readJson(queuePath);
  const policy = await readJson(policyPath);
  policy._denyRegexes = compileRegexes(policy.denyCommandPatterns, 'i');
  const redactors = compileRegexes(policy.secretRedactionPatterns, 'g');

  await ensureDir(path.join(repoRoot, 'logs'));
  await ensureDir(path.join(repoRoot, 'reports'));
  await ensureDir(path.join(repoRoot, '.nightshift', 'state'));

  let statePath = args.state ? path.resolve(repoRoot, args.state) : null;
  let state = null;

  if (args.resume) {
    if (!statePath) statePath = await findLatestStateFile(path.join(repoRoot, '.nightshift', 'state'));
    if (!statePath) throw new Error('No state file found to resume.');
    state = await readJson(statePath);
    state.mode = args.real ? 'real' : 'dry-run';
    state.resumedAt = isoNow();
  }

  if (!state) {
    const runId = `nightshift-${tsStamp()}`;
    const logPath = path.join(repoRoot, 'logs', `${runId}.log`);
    const reportPath = path.join(repoRoot, 'reports', `${runId}.md`);
    statePath = path.join(repoRoot, '.nightshift', 'state', `${runId}.json`);
    await fs.writeFile(logPath, `# Night Shift Log ${runId}\n`, 'utf8');

    const preflightInfo = await preflight(policy, args, redactors, logPath);

    state = {
      version: 1,
      runId,
      mode: args.real ? 'real' : 'dry-run',
      startedAt: isoNow(),
      queuePath,
      policyPath,
      logPath,
      reportPath,
      statePath,
      preflight: preflightInfo,
      tasks: [],
      summary: {
        attempted: 0,
        succeeded: 0,
        failed: 0,
        skipped: 0,
        planned: 0,
        reportOnlyModeActivated: false,
      },
    };
  }

  const runStartedMs = Date.now();
  let reportOnlyMode = args.reportOnly || state.summary.reportOnlyModeActivated || false;
  if (args.reportOnly) {
    state.summary.reportOnlyModeActivated = true;
  }
  const taskStatuses = Object.fromEntries(state.tasks.map((t) => [t.id, t.status]));
  const existingTaskIds = new Set(state.tasks.map((t) => t.id));

  for (const task of queue.tasks) {
    if (existingTaskIds.has(task.id) && args.resume) continue;

    const elapsedHours = (Date.now() - runStartedMs) / 3600000;
    if (state.summary.attempted >= args.maxTasks) break;
    if (elapsedHours >= args.maxHours) break;
    if (state.summary.failed >= args.hardFailures) break;

    const runnable = taskIsRunnable(task, taskStatuses);
    const taskRecord = {
      id: task.id,
      title: task.title,
      category: task.category,
      risk: task.risk,
      mode: task.mode,
      mutatesCode: !!task.mutatesCode,
      status: 'pending',
      note: '',
      durationMs: 0,
      startedAt: isoNow(),
      commands: [],
    };

    if (!runnable.runnable) {
      taskRecord.status = task.enabled === false ? 'disabled' : 'skipped';
      taskRecord.note = runnable.reason;
      state.tasks.push(taskRecord);
      taskStatuses[task.id] = taskRecord.status;
      if (taskRecord.status === 'disabled' || taskRecord.status === 'skipped') state.summary.skipped += 1;
      await writeState(statePath, state);
      continue;
    }

    if (reportOnlyMode && task.mutatesCode) {
      taskRecord.status = 'skipped';
      taskRecord.note = 'mutating task skipped after soft failure threshold (report-only mode)';
      state.tasks.push(taskRecord);
      taskStatuses[task.id] = taskRecord.status;
      state.summary.skipped += 1;
      await writeState(statePath, state);
      continue;
    }

    state.summary.attempted += 1;

    if (args.dryRun) {
      taskRecord.status = 'planned';
      taskRecord.note = runnable.reason;
      for (const rawCommand of task.commands || []) {
        const command = expandCommandTemplate(rawCommand, state);
        taskRecord.commands.push({
          template: rawCommand,
          command,
          status: 'planned',
          classification: classifyCommand(command, policy, args.allowE2E),
        });
      }
      state.tasks.push(taskRecord);
      taskStatuses[task.id] = 'planned';
      state.summary.planned += 1;
      await writeState(statePath, state);
      continue;
    }

    const taskStart = Date.now();
    let taskFailed = false;
    let failedReason = '';
    const nonBlockingFailures = [];

    for (const rawCommand of task.commands || []) {
      const command = expandCommandTemplate(rawCommand, state);
      const classification = classifyCommand(command, policy, args.allowE2E);
      const cmdRecord = {
        template: rawCommand,
        command,
        classification,
        status: 'pending',
        attempts: 0,
        durationMs: 0,
        summary: '',
      };
      taskRecord.commands.push(cmdRecord);

      if (!classification.allowed) {
        cmdRecord.status = 'blocked';
        cmdRecord.summary = classification.reason;
        taskFailed = true;
        failedReason = `blocked by policy: ${classification.reason}`;
        break;
      }

      const isNonBlockingReportTask = task.mode === 'report' && task.failOnCommandError !== true;
      const retries = Number.isFinite(task.retries)
        ? task.retries
        : (isNonBlockingReportTask ? 1 : (queue.defaults?.retries ?? 3));
      const timeoutMs = Number.isFinite(task.timeoutMs) ? task.timeoutMs : (queue.defaults?.timeoutMs ?? 900000);

      for (let attempt = 1; attempt <= retries; attempt += 1) {
        cmdRecord.attempts = attempt;
        await fs.appendFile(state.logPath, `\n[${isoNow()}] START ${task.id} :: ${command} (attempt ${attempt}/${retries})\n`, 'utf8');
        const result = await runCommand(command, {
          cwd: repoRoot,
          timeoutMs,
          redactors,
          shell: process.env.SHELL || '/bin/zsh',
          log: state.logPath,
        });
        cmdRecord.durationMs += result.durationMs;
        cmdRecord.summary = summarizeCommandOutput(result, command);

        if (result.code === 0) {
          cmdRecord.status = 'success';
          await fs.appendFile(state.logPath, `[${isoNow()}] END ${task.id} :: success (${result.durationMs}ms)\n`, 'utf8');
          break;
        }

        cmdRecord.status = result.timedOut ? 'timeout' : 'failed';
        await fs.appendFile(state.logPath, `[${isoNow()}] END ${task.id} :: ${cmdRecord.status} code=${result.code} (${result.durationMs}ms)\n`, 'utf8');

        if (attempt < retries) {
          const waitMs = backoffMs(attempt);
          await fs.appendFile(state.logPath, `[${isoNow()}] RETRY in ${waitMs}ms\n`, 'utf8');
          await sleep(waitMs);
          continue;
        }

        if (isNonBlockingReportTask) {
          cmdRecord.status = 'failed_nonblocking';
          nonBlockingFailures.push(command);
        } else {
          taskFailed = true;
          failedReason = `command failed: ${command}`;
        }
      }

      if (taskFailed) break;
    }

    taskRecord.durationMs = Date.now() - taskStart;
    taskRecord.status = taskFailed ? 'failed' : 'success';
    if (taskFailed) {
      taskRecord.note = failedReason;
    } else if (nonBlockingFailures.length) {
      taskRecord.note = `completed with ${nonBlockingFailures.length} non-blocking command failure(s)`;
    } else {
      taskRecord.note = 'completed';
    }
    state.tasks.push(taskRecord);
    taskStatuses[task.id] = taskRecord.status;

    if (taskFailed) {
      state.summary.failed += 1;
      if (!reportOnlyMode && state.summary.failed >= args.softFailures) {
        reportOnlyMode = true;
        state.summary.reportOnlyModeActivated = true;
      }
    } else {
      state.summary.succeeded += 1;
    }

    await writeState(statePath, state);
  }

  state.finishedAt = isoNow();
  const report = makeReport(state, policy, args);
  await fs.writeFile(state.reportPath, report, 'utf8');
  await writeState(statePath, state);

  console.log(JSON.stringify({
    runId: state.runId,
    mode: state.mode,
    logPath: path.relative(repoRoot, state.logPath),
    reportPath: path.relative(repoRoot, state.reportPath),
    statePath: path.relative(repoRoot, state.statePath),
    summary: state.summary,
  }, null, 2));
}

main().catch(async (error) => {
  console.error(`[nightshift] ${error?.stack || error}`);
  process.exitCode = 1;
});
