/**
 * Credits Alert Worker
 *
 * Runs on a schedule (e.g. daily). Triggers the credit-tracker, checks
 * /api/credits/status, and POSTs to ALERT_WEBHOOK_URL if something looks wrong.
 *
 * Bindings:
 *   SITE_BASE_URL (var) — e.g. https://wojak.ink
 *   CREDIT_TRACKER_RUN_URL (var, optional) — e.g. https://wojak-credit-tracker.xxx.workers.dev/run
 *   ALERT_WEBHOOK_URL (secret, optional) — Slack/Discord webhook; if unset, only logs
 */

interface Env {
  SITE_BASE_URL: string;
  CREDIT_TRACKER_RUN_URL?: string;
  ALERT_WEBHOOK_URL?: string;
}

const STATUS_PATH = '/api/credits/status';
const TOTAL_EVENTS_THRESHOLD = 50; // only alert "no events in 24h" if we have some history

interface StatusBody {
  lastEventTimestamp: string | null;
  lastFloorSnapshotDate: string | null;
  eventsLast24h: number;
  totalEvents: number;
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

function shouldAlert(status: StatusBody): { alert: boolean; reason: string } {
  if (status.eventsLast24h === 0 && status.totalEvents > TOTAL_EVENTS_THRESHOLD) {
    return { alert: true, reason: `No credit events in the last 24h (totalEvents=${status.totalEvents}). Worker may be stuck or MintGarden may be down.` };
  }
  if (!status.lastEventTimestamp && status.totalEvents > 0) {
    return { alert: true, reason: 'Status has totalEvents but no lastEventTimestamp.' };
  }
  return { alert: false, reason: '' };
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
    await new Promise((r) => setTimeout(r, 2000)); // let worker run a bit before checking status
  }

  const result = await fetchStatus(baseUrl);
  if (!result.ok) {
    const message = `Credits status API failed: ${result.status ?? 'network error'}. Check ${baseUrl}${STATUS_PATH}.`;
    await sendAlert(env, message);
    return;
  }

  const body = result.body!;
  const { alert, reason } = shouldAlert(body);
  if (alert) {
    await sendAlert(env, `Credits alert: ${reason} Status: lastEvent=${body.lastEventTimestamp ?? 'null'}, lastFloor=${body.lastFloorSnapshotDate ?? 'null'}, events24h=${body.eventsLast24h}, total=${body.totalEvents}.`);
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
