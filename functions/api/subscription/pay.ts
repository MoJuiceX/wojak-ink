// POST /api/subscription/pay
// Body: { did: string, txId: string }
// Records payment and activates premium subscription

interface Env {
  DB: D1Database;
  TREASURY_XCH_ADDRESS?: string;
}

const PREMIUM_DURATION_DAYS = 30;
const PREMIUM_PRICE_XCH = 1.0;

function isValidDid(did: string): boolean {
  return /^did:chia:1[a-z0-9]{58}$/.test(did);
}

function isValidTxId(txId: string): boolean {
  // Chia transaction IDs are 64 hex characters
  return /^[a-f0-9]{64}$/i.test(txId);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json() as { did: string; txId: string };
    const { did, txId } = body;

    if (!did || !isValidDid(did)) {
      return Response.json({ error: 'Invalid DID format' }, { status: 400 });
    }

    if (!txId || !isValidTxId(txId)) {
      return Response.json({ error: 'Invalid transaction ID format' }, { status: 400 });
    }

    const db = context.env.DB;
    const treasuryAddress = context.env.TREASURY_XCH_ADDRESS;

    if (!treasuryAddress) {
      console.error('[subscription/pay] TREASURY_XCH_ADDRESS not configured');
      return Response.json({ error: 'Payment system not configured' }, { status: 503 });
    }

    // Check for duplicate txId
    const existingPayment = await db.prepare(
      'SELECT id FROM subscription_payments WHERE tx_id = ?'
    ).bind(txId).first();

    if (existingPayment) {
      return Response.json({ error: 'Transaction already processed' }, { status: 409 });
    }

    // Ensure subscription record exists
    const existingSub = await db.prepare(
      'SELECT * FROM subscriptions WHERE did_id = ?'
    ).bind(did).first();

    const now = new Date();
    const premiumExpires = addDays(now, PREMIUM_DURATION_DAYS).toISOString();

    if (!existingSub) {
      // Create subscription record
      await db.prepare(`
        INSERT INTO subscriptions (did_id, tier, premium_started_at, premium_expires_at)
        VALUES (?, 'premium', datetime('now'), ?)
      `).bind(did, premiumExpires).run();
    } else {
      // Update existing subscription to premium
      // If already premium, extend from current expiry
      const currentExpiry = existingSub.premium_expires_at as string | null;
      let newExpiry: string;

      if (currentExpiry && new Date(currentExpiry) > now) {
        // Extend from current expiry
        newExpiry = addDays(new Date(currentExpiry), PREMIUM_DURATION_DAYS).toISOString();
      } else {
        // Start fresh from now
        newExpiry = premiumExpires;
      }

      await db.prepare(`
        UPDATE subscriptions
        SET tier = 'premium',
            premium_started_at = COALESCE(premium_started_at, datetime('now')),
            premium_expires_at = ?,
            total_paid_xch = total_paid_xch + ?,
            updated_at = datetime('now')
        WHERE did_id = ?
      `).bind(newExpiry, PREMIUM_PRICE_XCH, did).run();
    }

    // Record the payment (status = pending, to be verified by worker)
    await db.prepare(`
      INSERT INTO subscription_payments (did_id, amount_xch, tx_id, payment_address, status, days_granted)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `).bind(did, PREMIUM_PRICE_XCH, txId, treasuryAddress, PREMIUM_DURATION_DAYS).run();

    // Get updated subscription
    const updatedSub = await db.prepare(
      'SELECT tier, premium_expires_at FROM subscriptions WHERE did_id = ?'
    ).bind(did).first<{ tier: string; premium_expires_at: string }>();

    console.log(`[subscription/pay] Premium activated for ${did.slice(0, 20)}... txId: ${txId.slice(0, 16)}...`);

    return Response.json({
      success: true,
      tier: 'premium',
      expiresAt: updatedSub?.premium_expires_at,
      battlesPerDay: 4,
    });
  } catch (error) {
    console.error('[subscription/pay] Error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
};
