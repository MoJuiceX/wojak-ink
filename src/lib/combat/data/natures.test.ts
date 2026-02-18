import { describe, it, expect } from 'vitest';
import { NATURES, getNature, getNatureByStats } from './natures';

describe('natures', () => {
  it('has exactly 25 natures', () => {
    expect(NATURES).toHaveLength(25);
  });

  it('Savage boosts attack, reduces sp_def', () => {
    const savage = getNature('Savage');
    expect(savage).toBeDefined();
    expect(savage!.boost).toBe('attack');
    expect(savage!.reduce).toBe('sp_def');
  });

  it('Balanced has null boost and null reduce', () => {
    const balanced = getNature('Balanced');
    expect(balanced).toBeDefined();
    expect(balanced!.boost).toBeNull();
    expect(balanced!.reduce).toBeNull();
  });

  it('getNatureByStats returns correct nature for attack+/sp_def-', () => {
    const nature = getNatureByStats('attack', 'sp_def');
    expect(nature.name).toBe('Savage');
  });

  it('getNatureByStats returns Balanced when both null', () => {
    const nature = getNatureByStats(null, null);
    expect(nature.name).toBe('Balanced');
  });
});
