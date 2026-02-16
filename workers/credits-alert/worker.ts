/**
 * Credits Alert Worker
 *
 * Runs on a schedule (daily). Reads the credit_health report from KV
 * (written by credit-tracker after each cron run), checks /api/credits/status,
 * and POSTs to ALERT_WEBHOOK_URL if something looks wrong.
 *
 * Bindings:
 *   SITE_BASE_URL (var) — e.g. https://wojak.ink
 *   TRADE_VALUES_KV (KV) — shared KV namespace with credit-tracker
 *   CREDIT_TRACKER_RUN_URL (var, optional) — e.g. https://wojak-credit-tracker.xxx.workers.dev/run
 *   ALERT_WEBHOOK_URL (secret, optional) — Slack/Discord webhook; if unset, only logs
 */

interface Env {
  SITE_BASE_URL: string;
  TRADE_VALUES_KV: KVNamespace;
  CREDIT_TRACKER_RUN_URL?: string;
  ALERT_WEBHOOK_URL?: string;
}

const STATUS_PATH = '/api/credits/status';
const KV_KEY_CREDIT_HEALTH = 'credit_health';
const TOTAL_EVENTS_THRESHOLD = 50;

interface StatusBody {
  lastEventTimestamp: string | null;
  lastFloorSnapshotDate: string | null;
  eventsLast24h: number;
  totalEvents: number;
}

interface HealthReport {
  timestamp: string;
  duplicatesFound: number;
  duplicatesFixed: number;
  floorSnapshotOk: boolean;
  totalEvents: number;
  xchProcessed: number;
  xchInserted: number;
  catProcessed: number;
  catInserted: number;
  whitelistSize: number;
  issues: string[];
}

async function triggerCreditTracker(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'POST' });
    return res.ok;
  } catch (e) {
    console.error('[CreditsAlert] Credit tracker trigger failed:', e);
    return false;
  }
}

async function fetchStatus(baseUrl: string): Promise<{ ok: boolean; status?: number; body?: StatusBody }> {
  const url = baseUrl.replace(/\/$/, '') + STATUS_PATH;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return { ok: false, status: res.status };
    const body = (await res.json()) as StatusBody;
    return { ok: true, body };
  } catch (e) {
    console.error('[CreditsAlert] Status fetch failed:', e);
    return { ok: false };
  }
}

async function fetchHealthReport(kv: KVNamespace): Promise<HealthReport | null> {
  try {
    const raw = await kv.get(KV_KEY_CREDIT_HEALTH);
    if (!raw) return null;
    return JSON.parse(raw) as HealthReport;
  } catch {
    return null;
  }
}

function collectAlerts(status: StatusBody | null, health: HealthReport | null): string[] {
  const alerts: string[] = [];

  // --- Health report checks (Layer 2: Detection) ---
  if (health) {
    if (health.duplicatesFixed > 0) {
      alerts.push(`Auto-fixed ${health.duplicatesFixed} duplicate credit entries`);
    }

    if (!health.floorSnapshotOk) {
      alerts.push('No floor price snapshot for today — credits may use stale floor');
    }

    if (health.whitelistSize === 0) {
      alerts.push('CAT whitelist is empty — no CAT tokens will earn credits');
    }

    // Health report is stale (more than 2 hours old)
    const healthAge = Date.now() - new Date(health.timestamp).getTime();
    if (healthAge > 2 * 60 * 60 * 1000) {
      const hoursAgo = Math.round(healthAge / (60 * 60 * 1000));
      alerts.push(`Health report is ${hoursAgo}h old — credit-tracker may have stopped running`);
    }

    for (const issue of health.issues) {
      if (!alerts.some(a => a.includes(issue))) {
        alerts.push(issue);
      }
    }
  } else {
    alerts.push('No credit_health report found in KV — credit-tracker may not have run yet');
  }

  // --- Status API checks (original behavior) ---
  if (status) {
    if (status.eventsLast24h === 0 && status.totalEvents > TOTAL_EVENTS_THRESHOLD) {
      alerts.push(`No credit events in last 24h (total=${status.totalEvents}). Worker may be stuck or MintGarden may be down`);
    }
    if (!status.lastEventTimestamp && status.totalEvents > 0) {
      alerts.push('Status has totalEvents but no lastEventTimestamp');
    }
  }

  return alerts;
}

function formatAlertMessage(alerts: string[], status: StatusBody | null, health: HealthReport | null): string {
  const lines = ['**Credits Pipeline Alert**', ''];

  for (const alert of alerts) {
    lines.push(`- ${alert}`);
  }

  lines.push('');

  if (health) {
    lines.push(`Health: ${health.totalEvents} total events, XCH ${health.xchProcessed}/${health.xchInserted}, CAT ${health.catProcessed}/${health.catInserted}, whitelist ${health.whitelistSize} tokens`);
  }

  if (status) {
    lines.push(`Status: lastEvent=${status.lastEventTimestamp ?? 'null'}, lastFloor=${status.lastFloorSnapshotDate ?? 'null'}, events24h=${status.eventsLast24h}`);
  }

  return lines.join('\n');
}

async function sendAlert(env: Env, message: string): Promise<void> {
  const webhook = env.ALERT_WEBHOOK_URL;
  if (!webhook) {
    console.error('[CreditsAlert] ALERT_WEBHOOK_URL not set. Would have sent:', message);
    return;
  }
  try {
    const body = JSON.stringify({
      text: message,
      content: message,
    });
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (!res.ok) {
      console.error('[CreditsAlert] Webhook POST failed:', res.status, await res.text());
    }
  } catch (e) {
    console.error('[CreditsAlert] Webhook send failed:', e);
  }
}

async function run(env: Env): Promise<void> {
  const baseUrl = env.SITE_BASE_URL || 'https://wojak.ink';

  if (env.CREDIT_TRACKER_RUN_URL) {
    await triggerCreditTracker(env.CREDIT_TRACKER_RUN_URL);
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Fetch both health report (from KV) and status API in parallel
  const [health, statusResult] = await Promise.all([
    fetchHealthReport(env.TRADE_VALUES_KV),
    fetchStatus(baseUrl),
  ]);

  if (!statusResult.ok) {
    await sendAlert(env, `Credits status API failed: ${statusResult.status ?? 'network error'}. Check ${baseUrl}${STATUS_PATH}.`);
    return;
  }

  const alerts = collectAlerts(statusResult.body ?? null, health);
  if (alerts.length > 0) {
    const message = formatAlertMessage(alerts, statusResult.body ?? null, health);
    await sendAlert(env, message);
  } else {
    console.log('[CreditsAlert] All checks passed. No alerts.');
  }
}

export default {
  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    ctx.waitUntil(run(env));
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.url.endsWith('/run') && request.method === 'POST') {
      await run(env);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('Credits alert worker. POST /run to trigger check.', {
      status: 200,
    });
  },
};
