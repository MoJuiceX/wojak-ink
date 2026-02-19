// GET /api/subscription/status?did=xxx
// Returns subscription tier, battles per day, remaining battles

interface Env {
  DB: D1Database;
}

// Subscription constants
const TRIAL_DURATION_DAYS = 14;
const TRIAL_BATTLES_PER_DAY = 4;
const FREE_BATTLES_PER_DAY = 1;
const PREMIUM_BATTLES_PER_DAY = 4;

function isValidDid(did: string): boolean {
  return /^did:chia:1[a-z0-9]{58}$/.test(did);
}

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

interface SubscriptionRow {
  did_id: string;
  tier: string;
  trial_started_at: string | null;
  trial_expires_at: string | null;
  premium_started_at: string | null;
  premium_expires_at: string | null;
  total_paid_xch: number;
}

export interface SubscriptionStatus {
  tier: 'trial' | 'free' | 'premium';
  battlesPerDay: number;
  battlesToday: number;
  battlesRemaining: number;
  trialDaysRemaining?: number;
  expiresAt?: string;
}

// Get subscription status for a DID (can be called from other endpoints)
export async function getSubscriptionStatus(db: D1Database, did: string): Promise<SubscriptionStatus> {
  const now = new Date();
  const today = getTodayString();

  // Look up existing subscription
  let sub = await db.prepare(
    'SELECT * FROM subscriptions WHERE did_id = ?'
  ).bind(did).first<SubscriptionRow>();

  // If no record, create trial
  if (!sub) {
    const trialStart = now.toISOString();
    const trialExpires = addDays(now, TRIAL_DURATION_DAYS).toISOString();

    await db.prepare(`
      INSERT INTO subscriptions (did_id, tier, trial_started_at, trial_expires_at)
      VALUES (?, 'trial', ?, ?)
    `).bind(did, trialStart, trialExpires).run();

    sub = {
      did_id: did,
      tier: 'trial',
      trial_started_at: trialStart,
      trial_expires_at: trialExpires,
      premium_started_at: null,
      premium_expires_at: null,
      total_paid_xch: 0,
    };
  }

  // Count battles today
  const battleCount = await db.prepare(`
    SELECT COUNT(*) as cnt FROM battles
    WHERE (fighter_a_did = ? OR fighter_b_did = ?)
    AND DATE(created_at) = ?
  `).bind(did, did, today).first<{ cnt: number }>();
  const battlesToday = battleCount?.cnt ?? 0;

  // Determine current tier and battles per day
  let tier: 'trial' | 'free' | 'premium' = 'free';
  let battlesPerDay = FREE_BATTLES_PER_DAY;
  let expiresAt: string | undefined;
  let trialDaysRemaining: number | undefined;

  // Check premium first
  if (sub.tier === 'premium' && sub.premium_expires_at) {
    const premiumExpires = new Date(sub.premium_expires_at);
    if (premiumExpires > now) {
      tier = 'premium';
      battlesPerDay = PREMIUM_BATTLES_PER_DAY;
      expiresAt = sub.premium_expires_at;
    } else {
      // Premium expired, downgrade to free
      await db.prepare(`
        UPDATE subscriptions SET tier = 'free', updated_at = datetime('now') WHERE did_id = ?
      `).bind(did).run();
    }
  }
  // Check trial if not premium
  else if (sub.tier === 'trial' && sub.trial_expires_at) {
    const trialExpires = new Date(sub.trial_expires_at);
    if (trialExpires > now) {
      tier = 'trial';
      battlesPerDay = TRIAL_BATTLES_PER_DAY;
      expiresAt = sub.trial_expires_at;
      trialDaysRemaining = Math.ceil((trialExpires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    } else {
      // Trial expired, downgrade to free
      await db.prepare(`
        UPDATE subscriptions SET tier = 'free', updated_at = datetime('now') WHERE did_id = ?
      `).bind(did).run();
    }
  }

  const battlesRemaining = Math.max(0, battlesPerDay - battlesToday);

  return {
    tier,
    battlesPerDay,
    battlesToday,
    battlesRemaining,
    trialDaysRemaining,
    expiresAt,
  };
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const did = url.searchParams.get('did');

    if (!did || !isValidDid(did)) {
      return Response.json({ error: 'Invalid DID' }, { status: 400 });
    }

    const status = await getSubscriptionStatus(context.env.DB, did);

    return Response.json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error('[subscription/status] Error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
};
