/**
 * Admin: AI Credit Analytics — /api/admin/ai-credit-analytics
 *
 * GET (no params)         — Full analytics overview
 * GET ?detail=purchases   — All individual purchases with wallet, amount, date
 * GET ?detail=usage       — All individual enhancements with wallet, category, date
 * GET ?detail=wallets     — Per-wallet breakdown (bought, used, remaining)
 * GET ?detail=daily       — Daily aggregates for charting
 *
 * Protected by ADMIN_SECRET Bearer token.
 * Data is already in the database — this endpoint just aggregates and serves it.
 */

interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://wojak.ink',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), { status, headers: corsHeaders });
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  // Admin auth
  const authHeader = request.headers.get('Authorization');
  if (!env.ADMIN_SECRET || authHeader !== `Bearer ${env.ADMIN_SECRET}`) {
    return json({ error: 'Unauthorized' }, 401);
  }
  if (!env.DB) {
    return json({ error: 'Service not configured' }, 500);
  }

  const url = new URL(request.url);
  const detail = url.searchParams.get('detail');
  const limit = Math.min(Number(url.searchParams.get('limit')) || 100, 500);

  try {
    // ── Detail: Individual purchases ──
    if (detail === 'purchases') {
      const rows = await env.DB.prepare(
        `SELECT
          id,
          wallet_address,
          bundle_tier,
          credits_purchased,
          xch_paid_mojos,
          status,
          created_at,
          confirmed_at
        FROM ai_credit_purchases
        ORDER BY created_at DESC
        LIMIT ?`
      ).bind(limit).all();

      const purchases = (rows.results ?? []).map((r: Record<string, unknown>) => ({
        id: r.id,
        wallet: r.wallet_address,
        tier: r.bundle_tier,
        credits: r.credits_purchased,
        xchPaid: Number(r.xch_paid_mojos ?? 0) / 1_000_000_000_000,
        status: r.status,
        createdAt: r.created_at,
        confirmedAt: r.confirmed_at,
      }));

      return json({ purchases, count: purchases.length });
    }

    // ── Detail: Individual usage (enhancements) ──
    if (detail === 'usage') {
      const rows = await env.DB.prepare(
        `SELECT
          e.id,
          e.wallet_address,
          e.category,
          e.prompt,
          e.reve_request_id AS provider_id,
          e.reve_version AS provider_model,
          e.created_at,
          u.credits_spent
        FROM ai_enhancements e
        LEFT JOIN ai_credit_usage u ON u.enhancement_id = e.id
        ORDER BY e.created_at DESC
        LIMIT ?`
      ).bind(limit).all();

      const usage = (rows.results ?? []).map((r: Record<string, unknown>) => ({
        id: r.id,
        wallet: r.wallet_address,
        category: r.category,
        prompt: r.prompt,
        providerId: r.provider_id,
        providerModel: r.provider_model,
        creditsSpent: r.credits_spent ?? 1,
        createdAt: r.created_at,
      }));

      return json({ usage, count: usage.length });
    }

    // ── Detail: Per-wallet breakdown ──
    if (detail === 'wallets') {
      const rows = await env.DB.prepare(
        `SELECT
          w.wallet_address,
          COALESCE(p.purchased, 0) AS credits_purchased,
          COALESCE(e.earned, 0) AS credits_earned,
          COALESCE(u.used, 0) AS credits_used,
          COALESCE(p.xch_total, 0) AS xch_paid_mojos,
          COALESCE(p.purchase_count, 0) AS purchase_count,
          COALESCE(u.enhancement_count, 0) AS enhancement_count,
          p.first_purchase,
          p.last_purchase,
          u.last_usage
        FROM (
          SELECT DISTINCT wallet_address FROM ai_credit_purchases WHERE status = 'confirmed'
          UNION
          SELECT DISTINCT wallet_address FROM ai_credit_usage
          UNION
          SELECT DISTINCT wallet_address FROM ai_credit_events
        ) w
        LEFT JOIN (
          SELECT
            wallet_address,
            SUM(credits_purchased) AS purchased,
            SUM(xch_paid_mojos) AS xch_total,
            COUNT(*) AS purchase_count,
            MIN(confirmed_at) AS first_purchase,
            MAX(confirmed_at) AS last_purchase
          FROM ai_credit_purchases
          WHERE status = 'confirmed'
          GROUP BY wallet_address
        ) p ON p.wallet_address = w.wallet_address
        LEFT JOIN (
          SELECT
            wallet_address,
            SUM(credits_earned) AS earned
          FROM ai_credit_events
          GROUP BY wallet_address
        ) e ON e.wallet_address = w.wallet_address
        LEFT JOIN (
          SELECT
            wallet_address,
            SUM(credits_spent) AS used,
            COUNT(*) AS enhancement_count,
            MAX(created_at) AS last_usage
          FROM ai_credit_usage
          GROUP BY wallet_address
        ) u ON u.wallet_address = w.wallet_address
        ORDER BY COALESCE(p.xch_total, 0) DESC
        LIMIT ?`
      ).bind(limit).all();

      const wallets = (rows.results ?? []).map((r: Record<string, unknown>) => ({
        wallet: r.wallet_address,
        creditsPurchased: r.credits_purchased,
        creditsEarned: r.credits_earned,
        creditsUsed: r.credits_used,
        creditsRemaining: Number(r.credits_purchased ?? 0) + Number(r.credits_earned ?? 0) - Number(r.credits_used ?? 0),
        xchPaid: Number(r.xch_paid_mojos ?? 0) / 1_000_000_000_000,
        purchaseCount: r.purchase_count,
        enhancementCount: r.enhancement_count,
        firstPurchase: r.first_purchase,
        lastPurchase: r.last_purchase,
        lastUsage: r.last_usage,
      }));

      return json({ wallets, count: wallets.length });
    }

    // ── Detail: Daily aggregates (for charting) ──
    if (detail === 'daily') {
      const days = Math.min(Number(url.searchParams.get('days')) || 30, 90);

      const [purchaseRows, usageRows] = await Promise.all([
        env.DB.prepare(
          `SELECT
            DATE(confirmed_at) AS day,
            COUNT(*) AS purchases,
            SUM(credits_purchased) AS credits,
            SUM(xch_paid_mojos) AS xch_mojos
          FROM ai_credit_purchases
          WHERE status = 'confirmed' AND confirmed_at >= DATE('now', '-' || ? || ' days')
          GROUP BY DATE(confirmed_at)
          ORDER BY day ASC`
        ).bind(days).all(),

        env.DB.prepare(
          `SELECT
            DATE(u.created_at) AS day,
            COUNT(*) AS enhancements,
            SUM(u.credits_spent) AS credits_used
          FROM ai_credit_usage u
          WHERE u.created_at >= DATE('now', '-' || ? || ' days')
          GROUP BY DATE(u.created_at)
          ORDER BY day ASC`
        ).bind(days).all(),
      ]);

      const dailyPurchases = (purchaseRows.results ?? []).map((r: Record<string, unknown>) => ({
        day: r.day,
        purchases: r.purchases,
        creditsSold: r.credits,
        xchRevenue: Number(r.xch_mojos ?? 0) / 1_000_000_000_000,
      }));

      const dailyUsage = (usageRows.results ?? []).map((r: Record<string, unknown>) => ({
        day: r.day,
        enhancements: r.enhancements,
        creditsUsed: r.credits_used,
      }));

      return json({ dailyPurchases, dailyUsage, days });
    }

    // ── Default: Overview (aggregates) ──
    const [
      purchaseSummary,
      usageSummary,
      earnedSummary,
      uniqueBuyers,
      uniqueUsers,
      pendingPurchases,
      recentPurchase,
      recentEnhancement,
      topCategory,
    ] = await Promise.all([
      // Total confirmed purchases
      env.DB.prepare(
        `SELECT
          COUNT(*) AS count,
          COALESCE(SUM(credits_purchased), 0) AS credits,
          COALESCE(SUM(xch_paid_mojos), 0) AS xch_mojos
        FROM ai_credit_purchases WHERE status = 'confirmed'`
      ).first<{ count: number; credits: number; xch_mojos: number }>(),

      // Total credit usage
      env.DB.prepare(
        `SELECT
          COUNT(*) AS enhancements,
          COALESCE(SUM(credits_spent), 0) AS credits
        FROM ai_credit_usage`
      ).first<{ enhancements: number; credits: number }>(),

      // Total earned credits (non-purchase)
      env.DB.prepare(
        'SELECT COALESCE(SUM(credits_earned), 0) AS credits FROM ai_credit_events'
      ).first<{ credits: number }>(),

      // Unique buyers
      env.DB.prepare(
        "SELECT COUNT(DISTINCT wallet_address) AS count FROM ai_credit_purchases WHERE status = 'confirmed'"
      ).first<{ count: number }>(),

      // Unique enhancement users
      env.DB.prepare(
        'SELECT COUNT(DISTINCT wallet_address) AS count FROM ai_credit_usage'
      ).first<{ count: number }>(),

      // Pending (unpaid) purchases
      env.DB.prepare(
        "SELECT COUNT(*) AS count FROM ai_credit_purchases WHERE status = 'pending'"
      ).first<{ count: number }>(),

      // Most recent purchase
      env.DB.prepare(
        "SELECT wallet_address, credits_purchased, confirmed_at FROM ai_credit_purchases WHERE status = 'confirmed' ORDER BY confirmed_at DESC LIMIT 1"
      ).first<{ wallet_address: string; credits_purchased: number; confirmed_at: string }>(),

      // Most recent enhancement
      env.DB.prepare(
        'SELECT wallet_address, category, prompt, created_at FROM ai_enhancements ORDER BY created_at DESC LIMIT 1'
      ).first<{ wallet_address: string; category: string; prompt: string; created_at: string }>(),

      // Most popular category
      env.DB.prepare(
        'SELECT category, COUNT(*) AS count FROM ai_enhancements GROUP BY category ORDER BY count DESC LIMIT 1'
      ).first<{ category: string; count: number }>(),
    ]);

    const totalCreditsSold = purchaseSummary?.credits ?? 0;
    const totalCreditsEarned = earnedSummary?.credits ?? 0;
    const totalCreditsUsed = usageSummary?.credits ?? 0;
    const totalXchRevenue = Number(purchaseSummary?.xch_mojos ?? 0) / 1_000_000_000_000;

    return json({
      overview: {
        totalCreditsSold,
        totalCreditsEarned,
        totalCreditsUsed,
        totalCreditsRemaining: totalCreditsSold + totalCreditsEarned - totalCreditsUsed,
        totalXchRevenue: Math.round(totalXchRevenue * 1000) / 1000,
        totalPurchases: purchaseSummary?.count ?? 0,
        totalEnhancements: usageSummary?.enhancements ?? 0,
        uniqueBuyers: uniqueBuyers?.count ?? 0,
        uniqueUsers: uniqueUsers?.count ?? 0,
        pendingPurchases: pendingPurchases?.count ?? 0,
        avgCreditsPerBuyer: (uniqueBuyers?.count ?? 0) > 0
          ? Math.round(totalCreditsSold / uniqueBuyers!.count)
          : 0,
        avgEnhancementsPerUser: (uniqueUsers?.count ?? 0) > 0
          ? Math.round((usageSummary?.enhancements ?? 0) / uniqueUsers!.count)
          : 0,
      },
      topCategory: topCategory
        ? { category: topCategory.category, enhancements: topCategory.count }
        : null,
      recentPurchase: recentPurchase
        ? {
            wallet: recentPurchase.wallet_address,
            credits: recentPurchase.credits_purchased,
            at: recentPurchase.confirmed_at,
          }
        : null,
      recentEnhancement: recentEnhancement
        ? {
            wallet: recentEnhancement.wallet_address,
            category: recentEnhancement.category,
            prompt: recentEnhancement.prompt,
            at: recentEnhancement.created_at,
          }
        : null,
      _hint: 'Add ?detail=purchases|usage|wallets|daily for detailed breakdowns. Add &limit=N (max 500) for more rows. Add &days=N (max 90) for daily chart data.',
    });
  } catch (error) {
    console.error('[Admin AI Credit Analytics] Error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
};
