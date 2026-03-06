import { describe, expect, it } from 'vitest';

import {
  SURCHARGE_DISCOUNT_MULTIPLIER,
  SURCHARGE_EXPONENT,
  SURCHARGE_SCALE,
  surchargeXch,
} from './_shared';

describe('_shared surcharge pricing', () => {
  it('returns zero for non-surcharge categories', () => {
    expect(surchargeXch(150, 'Background', 'Orange Grove')).toBe(0);
  });

  it('returns zero for exempt surcharge traits', () => {
    expect(surchargeXch(150, 'Head', 'No Headgear')).toBe(0);
    expect(surchargeXch(150, 'Face Wear', 'No Face Wear')).toBe(0);
  });

  it('applies the global 15 percent reduction to surcharge categories', () => {
    const effectiveUsage = 150;
    const legacyCurvePrice = SURCHARGE_SCALE * Math.pow(effectiveUsage - 1, SURCHARGE_EXPONENT);

    expect(surchargeXch(effectiveUsage, 'Head', 'Crown')).toBeCloseTo(
      legacyCurvePrice * SURCHARGE_DISCOUNT_MULTIPLIER,
      12,
    );
  });
});
