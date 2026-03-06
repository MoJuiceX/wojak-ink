import { describe, expect, it } from 'vitest';

import {
  CONFIRM_DEDUP_MS,
  CONFIRM_DEDUP_MS_POST_ACCEPT,
  POLL_INTERVAL_ACTIVE,
  POST_ACCEPT_POLL_INTERVAL_MS,
  getAwaitingPaymentPollInterval,
  getConfirmCooldownMs,
  getMintPollInterval,
  isPostAcceptFastWindowActive,
} from './mintPolling';

describe('mintPolling', () => {
  it('uses the active processing poll interval outside awaiting_payment', () => {
    expect(getMintPollInterval({
      step: 'uploading_ipfs',
      elapsedMs: 45_000,
      now: 100_000,
      postAcceptFastUntilMs: 0,
    })).toBe(POLL_INTERVAL_ACTIVE);
  });

  it('applies the awaiting_payment backoff schedule by elapsed time', () => {
    expect(getAwaitingPaymentPollInterval(0)).toBe(5000);
    expect(getAwaitingPaymentPollInterval(35_000)).toBe(10_000);
    expect(getAwaitingPaymentPollInterval(180_000)).toBe(15_000);
    expect(getAwaitingPaymentPollInterval(360_000)).toBe(20_000);
  });

  it('switches to fast polling during the post-accept window', () => {
    expect(isPostAcceptFastWindowActive(1000, 2000)).toBe(true);
    expect(getMintPollInterval({
      step: 'awaiting_payment',
      elapsedMs: 180_000,
      now: 1000,
      postAcceptFastUntilMs: 2000,
    })).toBe(POST_ACCEPT_POLL_INTERVAL_MS);
  });

  it('uses a shorter but safe confirm cooldown after wallet acceptance', () => {
    expect(getConfirmCooldownMs(1000, 500)).toBe(CONFIRM_DEDUP_MS);
    expect(getConfirmCooldownMs(1000, 2000)).toBe(CONFIRM_DEDUP_MS_POST_ACCEPT);
  });
});
