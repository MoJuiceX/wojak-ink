// Battle Resolution Cron
// Runs every hour. Calls the battle-resolve Pages Function endpoint
// to resolve any expired battles. Supplements the DID indexer's
// inline resolution (every 30 min) as a safety net.

export default {
  async scheduled(_event: ScheduledEvent, _env: unknown, _ctx: ExecutionContext) {
    console.log('[Battle Cron] Triggering battle resolution...');

    try {
      const res = await fetch('https://wojak.ink/api/game/battle-resolve', {
        method: 'POST',
      });

      if (!res.ok) {
        console.error(`[Battle Cron] API returned ${res.status}`);
        return;
      }

      const data = await res.json() as { resolved?: number; draws?: number };
      console.log(`[Battle Cron] Done. Resolved: ${data.resolved ?? 0}, Draws: ${data.draws ?? 0}`);
    } catch (err) {
      console.error('[Battle Cron] Error:', err);
    }
  },

  async fetch(): Promise<Response> {
    return new Response('Battle Resolution Cron. Runs hourly via scheduled trigger.', { status: 200 });
  },
};
