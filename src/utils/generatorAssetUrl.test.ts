import { describe, expect, it } from 'vitest';

import { resolveGeneratorAssetUrl } from './generatorAssetUrl';

describe('resolveGeneratorAssetUrl', () => {
  it('returns absolute app paths unchanged', () => {
    expect(resolveGeneratorAssetUrl('/assets/wojak-layers/tattoos/tattoos_1_anchor.png?v=1', 'https://layers.wojak.ink/YourWojak-layers'))
      .toBe('/assets/wojak-layers/tattoos/tattoos_1_anchor.png?v=1');
  });

  it('resolves parent-relative paths against an absolute base path', () => {
    expect(resolveGeneratorAssetUrl('../CLOTHES/CLOTHES_Topless_.png', 'https://layers.wojak.ink/YourWojak-layers'))
      .toBe('https://layers.wojak.ink/CLOTHES/CLOTHES_Topless_.png');
  });

  it('resolves parent-relative paths against an app-local base path', () => {
    expect(resolveGeneratorAssetUrl('../tattoos/tattoos_1_anchor.png', '/assets/wojak-layers/YourWojak-layers'))
      .toBe('/assets/wojak-layers/tattoos/tattoos_1_anchor.png');
  });
});
