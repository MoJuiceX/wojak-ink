import { jsonResponse, errorResponse, optionsResponse, getAICreditBalance, requireAuth } from './_shared';
import type { AIEnv } from './_shared';

export const onRequest: PagesFunction<AIEnv> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'GET') return errorResponse('Method not allowed', 405);

  const auth = await requireAuth(request, env.DB);
  if (auth instanceof Response) return auth;
  const wallet = auth.walletAddress;

  try {
    const balance = await getAICreditBalance(env.DB, wallet);

    const purchasedResult = await env.DB
      .prepare('SELECT COALESCE(SUM(credits_purchased), 0) as total FROM ai_credit_purchases WHERE wallet_address = ? AND status = ?')
      .bind(wallet, 'confirmed')
      .first<{ total: number }>();

    const earnedResult = await env.DB
      .prepare('SELECT COALESCE(SUM(credits_earned), 0) as total FROM ai_credit_events WHERE wallet_address = ?')
      .bind(wallet)
      .first<{ total: number }>();

    const usedResult = await env.DB
      .prepare('SELECT COALESCE(SUM(credits_spent), 0) as total FROM ai_credit_usage WHERE wallet_address = ?')
      .bind(wallet)
      .first<{ total: number }>();

    return jsonResponse({
      balance,
      creditsPurchased: purchasedResult?.total ?? 0,
      creditsEarned: earnedResult?.total ?? 0,
      creditsUsed: usedResult?.total ?? 0,
    });
  } catch (err) {
    console.error('AI balance error:', err);
    return errorResponse('Internal error', 500);
  }
};
