/**
 * AI Credit Balance API — /api/ai/balance
 *
 * GET ?wallet=xch1...
 *
 * Returns the AI credit balance for a wallet address.
 * No BLS auth required — balance is not sensitive data.
 * Auth is only needed for spending credits (enhance endpoint).
 *
 * Response: {
 *   balance: number,
 *   creditsPurchased: number,
 *   creditsEarned: number,
 *   creditsUsed: number,
 * }
 */
import { jsonResponse, errorResponse, optionsResponse, getAICreditBalance } from './_shared';
import type { AIEnv } from './_shared';
import { isValidChiaAddress } from '../../lib/validation';

export const onRequest: PagesFunction<AIEnv> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'GET') return errorResponse('Method not allowed', 405);

  // Get wallet from query string (no auth required)
  const url = new URL(request.url);
  const wallet = url.searchParams.get('wallet');

  if (!wallet || !isValidChiaAddress(wallet)) {
    return errorResponse('Missing or invalid wallet parameter. Expected xch1... address.', 400);
  }

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
