import { FARMERS_PLOT_IMAGE_BY_EDITION } from '../../../_data/farmersPlotImageManifest';

type Env = Record<string, unknown>;

const CACHE_CONTROL = 'public, max-age=31536000, immutable';

function parseEdition(rawEdition: string | string[] | undefined): number | null {
  const value = Array.isArray(rawEdition) ? rawEdition[0] : rawEdition;
  const parsed = Number.parseInt(String(value || ''), 10);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 4200) {
    return null;
  }

  return parsed;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const edition = parseEdition(context.params.edition);

  if (!edition) {
    return new Response(JSON.stringify({ error: 'Invalid edition' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }

  const target = FARMERS_PLOT_IMAGE_BY_EDITION[edition];
  if (!target) {
    return new Response(JSON.stringify({ error: 'Image not found' }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }

  const location = target.startsWith('http')
    ? target
    : new URL(target, context.request.url).toString();

  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      'Cache-Control': CACHE_CONTROL,
    },
  });
};

export const onRequest = onRequestGet;
