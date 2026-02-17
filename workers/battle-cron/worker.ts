// Battle Resolution Cron
// Runs every hour. Calls the battle-resolve Pages Function endpoint
// to resolve any expired battles.

interface Env {
  ADMIN_SECRET: string;
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    console.log('[Battle Cron] Triggering battle resolution...');

    try {
      const res = await fetch('https://wojak.ink/api/game/battle-resolve', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.ADMIN_SECRET}`,
        },
      });

      if (!res.ok) {
        console.error(`[Battle Cron] API returned ${res.status}`);
        return;
      }

      const data = (await res.json()) as { resolved?: number; draws?: number };
      console.log(`[Battle Cron] Done. Resolved: ${data.resolved ?? 0}, Draws: ${data.draws ?? 0}`);
    } catch (err) {
      console.error('[Battle Cron] Error:', err);
    }
  },

  async fetch(): Promise<Response> {
    return new Response('Battle Resolution Cron. Runs hourly via scheduled trigger.', { status: 200 });
  },
};
