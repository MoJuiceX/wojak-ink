import { jsonResponse, errorResponse, optionsResponse, requireAuth } from './_shared';
import type { AIEnv } from './_shared';

export const onRequest: PagesFunction<AIEnv> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'GET') return errorResponse('Method not allowed', 405);

  const auth = await requireAuth(request, env.DB);
  if (auth instanceof Response) return auth;
  const wallet = auth.walletAddress;

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 100);

  try {
    const rows = await env.DB
      .prepare(
        `SELECT id, r2_key, category, prompt, parent_enhancement_id, ai_trait_overrides, created_at
         FROM ai_enhancements
         WHERE wallet_address = ?
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .bind(wallet, limit)
      .all();

    const creations = (rows.results ?? []).map((row: Record<string, unknown>) => {
      let aiTraitOverrides: Record<string, string> = {};
      if (row.ai_trait_overrides && typeof row.ai_trait_overrides === 'string') {
        try { aiTraitOverrides = JSON.parse(row.ai_trait_overrides); } catch { /* ignore */ }
      }
      return {
        id: row.id,
        r2Key: row.r2_key,
        category: row.category,
        prompt: row.prompt,
        parentEnhancementId: row.parent_enhancement_id,
        createdAt: row.created_at,
        aiTraitOverrides,
      };
    });

    return jsonResponse({ creations, total: creations.length });
  } catch (err) {
    console.error('AI creations error:', err);
    return errorResponse('Internal error', 500);
  }
};
