import { jsonResponse, errorResponse, optionsResponse } from './_shared';
import type { AIEnv } from './_shared';

export const onRequest: PagesFunction<AIEnv> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'GET') return errorResponse('Method not allowed', 405);

  const url = new URL(request.url);
  const wallet = url.searchParams.get('wallet');
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 100);

  if (!wallet || wallet.length < 10) {
    return errorResponse('Missing or invalid wallet parameter', 400);
  }

  try {
    const rows = await env.DB
      .prepare(
        `SELECT id, r2_key, category, prompt, parent_enhancement_id, created_at
         FROM ai_enhancements
         WHERE wallet_address = ?
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .bind(wallet, limit)
      .all();

    return jsonResponse({
      creations: rows.results ?? [],
      total: rows.results?.length ?? 0,
    });
  } catch (err) {
    console.error('AI creations error:', err);
    return errorResponse('Internal error', 500);
  }
};
