import { FARMERS_PLOT_IMAGE_BY_EDITION } from '../../../_data/farmersPlotImageManifest';

interface Env {
  FARMERS_PLOT_MEDIA_BASE_URL?: string;
}

const CACHE_CONTROL = 'public, max-age=31536000, immutable';

function parseEdition(rawEdition: string | string[] | undefined): number | null {
  const value = Array.isArray(rawEdition) ? rawEdition[0] : rawEdition;
  const parsed = Number.parseInt(String(value || ''), 10);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 4200) {
    return null;
  }

  return parsed;
}

function normalizePublicBaseUrl(rawValue: string | undefined): string | null {
  const trimmed = rawValue?.trim();
  if (!trimmed) return null;

  return trimmed.replace(/\/+$/, '');
}

function getR2Location(baseUrl: string | null, edition: number): string | null {
  if (!baseUrl) return null;
  return `${baseUrl}/${String(edition).padStart(4, '0')}.png`;
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

  const r2Location = getR2Location(
    normalizePublicBaseUrl(context.env?.FARMERS_PLOT_MEDIA_BASE_URL),
    edition
  );
  if (r2Location) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: r2Location,
        'Cache-Control': CACHE_CONTROL,
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
