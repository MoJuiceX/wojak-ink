import { describe, expect, it } from 'vitest';
import { onRequestGet } from './[edition]';

describe('functions/api/farmers-plot/image/[edition]', () => {
  it('redirects valid editions to the stable image source', async () => {
    const response = await onRequestGet({
      params: { edition: '42' },
      request: new Request('https://wojak.ink/api/farmers-plot/image/42'),
    } as Parameters<typeof onRequestGet>[0]);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBeTruthy();
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
  });

  it('returns 400 for invalid editions', async () => {
    const response = await onRequestGet({
      params: { edition: '9999' },
      request: new Request('https://wojak.ink/api/farmers-plot/image/9999'),
    } as Parameters<typeof onRequestGet>[0]);

    expect(response.status).toBe(400);
  });

  it('serves the local fallback for missing upstream editions', async () => {
    const response = await onRequestGet({
      params: { edition: '2370' },
      request: new Request('https://wojak.ink/api/farmers-plot/image/2370'),
    } as Parameters<typeof onRequestGet>[0]);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('https://wojak.ink/assets/farmers-plot-fallbacks/2370.png');
  });
});
