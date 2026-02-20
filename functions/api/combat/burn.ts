// POST /api/combat/burn
// Body: { nftId: string, burnerDid: string }
// Burns a Wojak and awards credits if eligible (bottom 25% + burner != minter)

import { jsonResponse, errorResponse, isValidDid } from './_shared';

interface Env {
  DB: D1Database;
}

// Burn reward: 100 display credits = 10000 stored units
const BURN_CREDIT_AMOUNT = 10000;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json() as {
      nftId: string;
      burnerDid: string;
    };

    const { nftId, burnerDid } = body;

    if (!nftId || !burnerDid) {
      return errorResponse('Missing nftId or burnerDid', 400);
    }

    if (!isValidDid(burnerDid)) {
      return errorResponse('Invalid DID format', 400);
    }

    const db = context.env.DB;

    // Verify fighter exists and isn't already burned
    const fighter = await db.prepare(`
      SELECT cf.nft_id, cf.owner_did, cf.power_score, cf.edition_number,
             pm.wallet_address as minter_wallet
      FROM combat_fighters cf
      LEFT JOIN phase2_mints pm ON cf.nft_id = pm.mintgarden_launcher_id
      WHERE cf.nft_id = ?
    `).bind(nftId).first<{
      nft_id: string;
      owner_did: string;
      power_score: number;
      edition_number: number;
      minter_wallet: string | null;
    }>();

    if (!fighter) {
      return errorResponse('Fighter not found', 404);
    }

    // Check if already burned
    const burnCheck = await db.prepare(
      'SELECT burned_at FROM combat_fighters WHERE nft_id = ?'
    ).bind(nftId).first<{ burned_at: string | null }>();

    if (burnCheck?.burned_at) {
      return errorResponse('Fighter already burned', 400);
    }

    // Verify burner owns this NFT
    if (fighter.owner_did !== burnerDid) {
      return errorResponse('You do not own this Wojak', 403);
    }

    // Calculate 25th percentile threshold
    const thresholdRow = await db.prepare(`
      WITH ranked AS (
        SELECT power_score,
          NTILE(4) OVER (ORDER BY power_score ASC) as quartile
        FROM combat_fighters
        WHERE burned_at IS NULL
      )
      SELECT MAX(power_score) as threshold FROM ranked WHERE quartile = 1
    `).first<{ threshold: number }>();

    const threshold = thresholdRow?.threshold ?? 0;

    // Verify eligibility (bottom 25%)
    if (fighter.power_score > threshold) {
      return errorResponse(`Not eligible for burn. Power score (${fighter.power_score}) must be <= ${threshold}`, 400);
    }

    // Get burner's wallet for credit award
    const burnerPlayer = await db.prepare(
      'SELECT wallet_address FROM game_players WHERE did_id = ?'
    ).bind(burnerDid).first<{ wallet_address: string }>();

    if (!burnerPlayer) {
      return errorResponse('Player not registered', 403);
    }

    const burnerWallet = burnerPlayer.wallet_address;
    const minterWallet = fighter.minter_wallet;

    // Cannot burn NFTs you created
    if (minterWallet && minterWallet === burnerWallet) {
      return errorResponse(
        "You cannot burn Wojaks you created. Buy others' Wojaks and burn them to earn rewards.",
        400
      );
    }

    // Determine if credits should be awarded (burner != minter)
    const earnCredits = minterWallet && burnerWallet !== minterWallet;

    // Execute burn: mark as burned + award credits if eligible + grant one +50 power to assign
    const statements: D1PreparedStatement[] = [
      db.prepare(`
        UPDATE combat_fighters
        SET burned_at = datetime('now'),
            burned_by_did = ?
        WHERE nft_id = ?
      `).bind(burnerDid, nftId),
      db.prepare(`
        INSERT INTO burn_power_grants (did_id, nft_id) VALUES (?, NULL)
      `).bind(burnerDid),
    ];

    if (earnCredits) {
      statements.push(
        db.prepare(`
          INSERT INTO credit_events (
            wallet_address, nft_id, event_id, price_xch, floor_at_time,
            credits_earned, whale_multiplier, source, event_type, event_timestamp
          ) VALUES (?, ?, ?, 0, 0, ?, 100, 'burn', 'burn', datetime('now'))
        `).bind(
          burnerWallet,
          nftId,
          `burn_${nftId}_${burnerDid}`,
          BURN_CREDIT_AMOUNT
        )
      );
    }

    await db.batch(statements);

    return jsonResponse({
      success: true,
      nftId,
      editionNumber: fighter.edition_number,
      creditsAwarded: earnCredits ? BURN_CREDIT_AMOUNT / 100 : 0,
      message: 'Wojak burned! You earned 100 credits and +50 power to assign to one of your Wojaks.',
    });
  } catch (error) {
    console.error('[api/combat/burn] Error:', error);
    return errorResponse('Internal server error', 500);
  }
};
