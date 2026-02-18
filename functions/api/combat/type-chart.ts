// functions/api/combat/type-chart.ts
// GET /api/combat/type-chart — static type effectiveness data, cached 24h

import { TYPE_CHART, COMBAT_TYPES } from '../../../src/lib/combat/data/type-chart';

export const onRequestGet: PagesFunction = async () => {
  return new Response(JSON.stringify({ types: COMBAT_TYPES, chart: TYPE_CHART }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
