export interface BaseAICreditBundle {
  tier: string;
  baseCredits: number;
  priceXch: number;
}

export interface DerivedAICreditBundle extends BaseAICreditBundle {
  credits: number;
  badge?: string;
  perCreditXch: number;
  savingsVsStarterXch: number;
}

export const AI_CREDIT_FULL_PROMO_END = new Date('2026-04-01T00:00:00Z');
export const AI_CREDIT_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const AI_CREDIT_MIN_DISCOUNT_PERCENT = 25;

export const BASE_AI_CREDIT_BUNDLES: readonly BaseAICreditBundle[] = [
  { tier: '1', baseCredits: 1, priceXch: 0.10 },
  { tier: '10', baseCredits: 10, priceXch: 0.80 },
  { tier: '25', baseCredits: 25, priceXch: 1.50 },
  { tier: '50', baseCredits: 50, priceXch: 2.40 },
] as const;

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getCurrentAICreditDiscountPercent(now = new Date()): number {
  if (now.getTime() < AI_CREDIT_FULL_PROMO_END.getTime()) {
    return 50;
  }

  const weeksSincePromoEnd = Math.floor((now.getTime() - AI_CREDIT_FULL_PROMO_END.getTime()) / AI_CREDIT_WEEK_MS);
  return Math.max(AI_CREDIT_MIN_DISCOUNT_PERCENT, 49 - weeksSincePromoEnd);
}

export function getCurrentAICreditDiscountEndsAt(now = new Date()): Date {
  if (now.getTime() < AI_CREDIT_FULL_PROMO_END.getTime()) {
    return AI_CREDIT_FULL_PROMO_END;
  }

  const elapsed = now.getTime() - AI_CREDIT_FULL_PROMO_END.getTime();
  const periodsSincePromoEnd = Math.floor(elapsed / AI_CREDIT_WEEK_MS);
  return new Date(AI_CREDIT_FULL_PROMO_END.getTime() + (periodsSincePromoEnd + 1) * AI_CREDIT_WEEK_MS);
}

export function getCurrentAICreditDiscountDaysLeft(now = new Date()): number {
  const periodEndsAt = getCurrentAICreditDiscountEndsAt(now);
  return Math.max(1, Math.ceil((periodEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
}

export function getDiscountedCredits(baseCredits: number, discountPercent: number): number {
  const multiplier = 100 / (100 - discountPercent);
  return Math.max(baseCredits, Math.round(baseCredits * multiplier));
}

export function getAICreditBundles(now = new Date()): DerivedAICreditBundle[] {
  const discountPercent = getCurrentAICreditDiscountPercent(now);
  const starterCredits = getDiscountedCredits(BASE_AI_CREDIT_BUNDLES[0].baseCredits, discountPercent);
  const starterRate = BASE_AI_CREDIT_BUNDLES[0].priceXch / starterCredits;

  return BASE_AI_CREDIT_BUNDLES.map((bundle, index) => {
    const credits = getDiscountedCredits(bundle.baseCredits, discountPercent);
    const perCreditXch = bundle.priceXch / credits;
    const savingsVsStarterXch = roundCurrency(Math.max(0, credits * starterRate - bundle.priceXch));

    return {
      ...bundle,
      credits,
      perCreditXch,
      savingsVsStarterXch,
      badge: index === 0 ? 'STARTER PACK' : `SAVE ${savingsVsStarterXch.toFixed(2)} XCH`,
    };
  });
}
