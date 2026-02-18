// POST /api/game/nft-name
// Body: { did: string, editionNumber: number, name: string }
// Lets players name their Phase 2 NFTs.

import { isValidDid } from './_shared';
import { verifyGamePlayer, isAuthError } from './_auth';

interface Env {
  DB: D1Database;
}

const NAME_REGEX = /^[a-zA-Z0-9 .,!?'-]+$/;
const MAX_NAME_LENGTH = 30;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json() as {
      did: string;
      editionNumber: number;
      name: string;
    };

    const { did, editionNumber, name } = body;

    const authResult = await verifyGamePlayer(context.env, did);
    if (isAuthError(authResult)) return authResult;

    if (!did || !isValidDid(did)) {
      return Response.json({ error: 'Invalid DID' }, { status: 400 });
    }

    if (!editionNumber || typeof editionNumber !== 'number') {
      return Response.json({ error: 'Invalid edition number' }, { status: 400 });
    }

    const trimmed = (name || '').trim();
    if (!trimmed || trimmed.length > MAX_NAME_LENGTH) {
      return Response.json({ error: `Name must be 1-${MAX_NAME_LENGTH} characters` }, { status: 400 });
    }

    if (!NAME_REGEX.test(trimmed)) {
      return Response.json({ error: 'Name can only contain letters, numbers, spaces, and basic punctuation' }, { status: 400 });
    }

    // Verify player owns this NFT (verifyGameAuth already checked player exists)
    const holding = await context.env.DB.prepare(
      "SELECT nft_id FROM did_holdings WHERE did_id = ? AND edition_number = ? AND collection = 'phase2'"
    ).bind(did, editionNumber).first();

    if (!holding) {
      return Response.json({ error: 'You do not own this NFT' }, { status: 403 });
    }

    // Update name
    const fullName = `Your Wojak #${editionNumber}: ${trimmed}`;
    await context.env.DB.prepare(
      `INSERT INTO nft_names (edition_number, custom_name, full_name)
       VALUES (?, ?, ?)
       ON CONFLICT(edition_number) DO UPDATE SET custom_name = ?, full_name = ?`
    ).bind(editionNumber, trimmed, fullName, trimmed, fullName).run();

    return Response.json({
      success: true,
      name: fullName,
      customName: trimmed,
    });
  } catch (err) {
    console.error('NFT name error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
