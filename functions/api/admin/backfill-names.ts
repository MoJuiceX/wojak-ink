// POST /api/admin/backfill-names
// Admin endpoint to fetch MintGarden profile names for players missing display names.
// Uses NFT→owner lookup (the /profiles/{did} endpoint returns 404 for all DIDs).
// Protected by ADMIN_SECRET Bearer token.
//
// Query params:
//   ?dry_run=true  — show what would be updated without writing
//   ?limit=25      — max players to process (default: 25, max: 50)

interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

// Same regex as syncDIDProfileName in did-indexer and display-name.ts
const NAME_REGEX = /^[a-zA-Z0-9 '\-._]+$/;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const authHeader = context.request.headers.get('Authorization');
  if (!context.env.ADMIN_SECRET || authHeader !== `Bearer ${context.env.ADMIN_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(context.request.url);
  const dryRun = url.searchParams.get('dry_run') === 'true';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '25') || 25, 50);

  // Find verified players with no profile, random name, or missing display name.
  // Also grab a sample NFT for each so we can look up their name via MintGarden.
  const nameless = await context.env.DB.prepare(`
    SELECT gp.did_id,
      (SELECT dh.nft_id FROM did_holdings dh WHERE dh.did_id = gp.did_id LIMIT 1) as sample_nft
    FROM game_players gp
    LEFT JOIN did_profiles dp ON dp.did_id = gp.did_id
    WHERE gp.phase1_verified = 1
      AND (dp.did_id IS NULL OR dp.name_source = 'random' OR dp.display_name IS NULL)
    ORDER BY gp.power_level DESC
    LIMIT ?
  `).bind(limit).all();

  const results: Array<{ did: string; status: string; name?: string | null; rawName?: string | null }> = [];
  let fetched = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of nameless.results) {
    const did = row.did_id as string;
    const sampleNft = row.sample_nft as string | null;

    if (!sampleNft) {
      results.push({ did: did.slice(0, 30), status: 'no_nft' });
      skipped++;
      continue;
    }

    // Rate limit between API calls
    if (fetched > 0) {
      await new Promise(r => setTimeout(r, 500));
    }

    try {
      // Fetch NFT data — the owner object includes the DID's on-chain name
      const res = await fetch(`https://api.mintgarden.io/nfts/${sampleNft}`, {
        headers: { 'Accept': 'application/json' },
      });
      fetched++;

      if (!res.ok) {
        results.push({ did: did.slice(0, 30), status: 'api_error' });
        skipped++;
        continue;
      }

      const data = await res.json() as { owner?: { name?: string } };
      const chainName = data.owner?.name?.trim();

      if (chainName && chainName.length >= 2 && chainName.length <= 20 && NAME_REGEX.test(chainName)) {
        if (!dryRun) {
          await context.env.DB.prepare(`
            INSERT INTO did_profiles (did_id, display_name, name_source, created_at, updated_at)
            VALUES (?, ?, 'chain', datetime('now'), datetime('now'))
            ON CONFLICT(did_id) DO UPDATE SET
              display_name = CASE WHEN name_source = 'random' OR name_source IS NULL THEN ? ELSE display_name END,
              name_source = CASE WHEN name_source = 'random' OR name_source IS NULL THEN 'chain' ELSE name_source END,
              updated_at = datetime('now')
          `).bind(did, chainName, chainName).run();
        }
        updated++;
        results.push({ did: did.slice(0, 30), status: 'updated', name: chainName });
      } else {
        results.push({ did: did.slice(0, 30), status: 'no_valid_name', rawName: chainName || null });
        skipped++;
      }
    } catch (err) {
      results.push({ did: did.slice(0, 30), status: 'error', rawName: String(err).slice(0, 100) });
      skipped++;
    }
  }

  return Response.json({
    dryRun,
    total: nameless.results.length,
    fetched,
    updated,
    skipped,
    results,
  });
};
