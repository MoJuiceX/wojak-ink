export const POLL_INTERVAL_ACTIVE = 3000;
export const POLL_MAX_DURATION = 10 * 60 * 1000; // 10 minutes
export const POST_ACCEPT_POLL_INTERVAL_MS = 1500;
export const POST_ACCEPT_WINDOW_MS = 15_000;
export const CONFIRM_DEDUP_MS = 10_000;
export const CONFIRM_DEDUP_MS_POST_ACCEPT = 5_000;

export const POLL_BACKOFF_SCHEDULE = [
  { afterMs: 0, intervalMs: 5000 },        // First 30s: every 5s
  { afterMs: 30_000, intervalMs: 10_000 }, // 30s-2min: every 10s
  { afterMs: 120_000, intervalMs: 15_000 },// 2-5min: every 15s
  { afterMs: 300_000, intervalMs: 20_000 },// 5min+: every 20s
] as const;

export function isPostAcceptFastWindowActive(now: number, postAcceptFastUntilMs: number): boolean {
  return postAcceptFastUntilMs > now;
}

export function getAwaitingPaymentPollInterval(elapsedMs: number): number {
  let interval: number = POLL_BACKOFF_SCHEDULE[0].intervalMs;
  for (const tier of POLL_BACKOFF_SCHEDULE) {
    if (elapsedMs >= tier.afterMs) interval = tier.intervalMs;
  }
  return interval;
}

export function getMintPollInterval(input: {
  step: string;
  elapsedMs: number;
  now: number;
  postAcceptFastUntilMs: number;
}): number {
  if (input.step !== 'awaiting_payment') return POLL_INTERVAL_ACTIVE;
  if (isPostAcceptFastWindowActive(input.now, input.postAcceptFastUntilMs)) {
    return POST_ACCEPT_POLL_INTERVAL_MS;
  }
  return getAwaitingPaymentPollInterval(input.elapsedMs);
}

export function getConfirmCooldownMs(now: number, postAcceptFastUntilMs: number): number {
  return isPostAcceptFastWindowActive(now, postAcceptFastUntilMs)
    ? CONFIRM_DEDUP_MS_POST_ACCEPT
    : CONFIRM_DEDUP_MS;
}
