/**
 * Verify that the xchsplit.com (SplitXCH) royalty split is set on every minted
 * Your Wojak NFT.
 *
 * 1. Fetches mint list + expected splitter per mint from GET /api/admin/verify-royalty-split
 * 2. For each mint, GET MintGarden /nfts/{launcher_id} and read royalty_address
 * 3. Compares on-chain royalty_address to expected SplitXCH splitter address
 * 4. Prints a proof report: all match, or list of mismatches
 *
 * MintGarden returns royalty_address as hex (puzzle hash); our DB has bech32 (xch1...).
 * We normalize both to hex for comparison.
 *
 * Requires: ADMIN_SECRET (env) for the API. BASE_URL defaults to https://wojak.ink
 *
 * Run: ADMIN_SECRET=your_secret npx tsx scripts/verify-split-on-mints.ts
 *      BASE_URL=https://wojak.ink ADMIN_SECRET=xxx npx tsx scripts/verify-split-on-mints.ts
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { bech32m } = require('bech32');

const MINTGARDEN_API = 'https://api.mintgarden.io';

interface MintEntry {
  mintNumber: number;
  launcherId: string | null;
  walletAddress: string;
  expectedSplitter: string | null;
}

interface ApiResponse {
  mints: MintEntry[];
  summary: { total: number; withExpectedSplitter: number; missingSplitterInDb: number };
}

interface NftDetail {
  royalty_address?: string | null;
  royalty_percentage?: number | null;
  encoded_id?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchVerificationData(baseUrl: string, adminSecret: string): Promise<ApiResponse> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/admin/verify-royalty-split`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${adminSecret}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Verify API ${res.status}: ${text}`);
  }
  return (await res.json()) as ApiResponse;
}

async function fetchNftRoyalty(launcherId: string): Promise<string | null> {
  const url = `${MINTGARDEN_API}/nfts/${launcherId}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as NftDetail;
  const addr = data.royalty_address;
  return typeof addr === 'string' ? addr.trim() : null;
}

/**
 * Normalize address to hex puzzle hash for comparison.
 * - MintGarden returns royalty_address as hex (32-byte puzzle hash).
 * - Our DB stores the SplitXCH splitter as bech32 (xch1...).
 * Both represent the same address; we compare as hex.
 */
function addressToHex(addr: string): string | null {
  const t = addr.trim();
  if (/^[0-9a-fA-F]{64}$/.test(t)) return t.toLowerCase();
  if (t.startsWith('xch1')) {
    try {
      const decoded = bech32m.decode(t);
      const bytes = Buffer.from(bech32m.fromWords(decoded.words));
      return bytes.toString('hex').toLowerCase();
    } catch {
      return null;
    }
  }
  return null;
}

function addressesMatch(expected: string, onChain: string): boolean {
  const expectedHex = addressToHex(expected);
  const onChainHex = addressToHex(onChain);
  if (expectedHex == null || onChainHex == null) return false;
  return expectedHex === onChainHex;
}

/** Convert 32-byte hex puzzle hash to bech32m xch1... for comparison with creator wallet. */
function hexToBech32(hex: string): string | null {
  const h = hex.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(h)) return null;
  try {
    const bytes = Buffer.from(h, 'hex');
    if (bytes.length !== 32) return null;
    const words = bech32m.toWords(bytes);
    return bech32m.encode('xch', words);
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const baseUrl = process.env.BASE_URL || 'https://wojak.ink';
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    console.error('Missing ADMIN_SECRET. Set it in the environment.');
    process.exit(1);
  }

  console.log('Fetching mint list and expected splitter addresses from', baseUrl, '...');
  const { mints, summary } = await fetchVerificationData(baseUrl, adminSecret);

  if (mints.length === 0) {
    console.log('No minted NFTs with launcher_id found.');
    process.exit(0);
  }

  if (summary.missingSplitterInDb > 0) {
    console.warn(
      `Warning: ${summary.missingSplitterInDb} mint(s) have no expected splitter in DB (splitter_addresses). They may have been minted before SplitXCH or with TREASURY_ADDRESS unset.`
    );
  }

  console.log(`Checking ${mints.length} NFTs on MintGarden...`);
  const results: Array<{
    mintNumber: number;
    launcherId: string;
    walletAddress: string;
    expected: string | null;
    onChain: string | null;
    match: boolean;
    onChainIsCreatorWallet: boolean;
  }> = [];

  for (let i = 0; i < mints.length; i++) {
    const m = mints[i];
    if (!m.launcherId) continue;
    const onChain = await fetchNftRoyalty(m.launcherId);
    const expected = m.expectedSplitter?.trim() ?? null;
    const match =
      expected != null && onChain != null && addressesMatch(expected, onChain);
    const onChainBech32 = onChain != null ? hexToBech32(onChain) : null;
    const onChainIsCreatorWallet =
      !match &&
      onChainBech32 != null &&
      m.walletAddress.trim().toLowerCase() === onChainBech32.toLowerCase();
    results.push({
      mintNumber: m.mintNumber,
      launcherId: m.launcherId,
      walletAddress: m.walletAddress,
      expected,
      onChain,
      match,
      onChainIsCreatorWallet,
    });
    if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${mints.length}`);
    await sleep(320);
  }

  const matched = results.filter((r) => r.match).length;
  const noExpected = results.filter((r) => r.expected == null).length;
  const mismatches = results.filter((r) => r.expected != null && !r.match);
  const onChainIsCreatorWallet = mismatches.filter((r) => r.onChainIsCreatorWallet);
  const otherMismatches = mismatches.filter((r) => !r.onChainIsCreatorWallet);
  const fetchFailed = results.filter((r) => r.onChain == null && r.expected != null);

  console.log('\n========== SPLITXCH ROYALTY VERIFICATION REPORT ==========\n');
  console.log('Collection: Your Wojak (Phase 2)');
  console.log('Expected: Each NFT royalty_address = SplitXCH splitter (10% creator / 2% treasury).\n');
  console.log('--- Summary ---');
  console.log('Total mints checked:', results.length);
  console.log('Match (on-chain royalty = expected splitter):', matched);
  console.log('No expected splitter in DB (skipped):', noExpected);
  console.log('Mismatch (on-chain ≠ expected splitter):', mismatches.length);
  if (onChainIsCreatorWallet.length > 0) {
    console.log('  → On-chain = creator wallet (no split):', onChainIsCreatorWallet.length, '— likely minted before SplitXCH or fallback');
  }
  if (otherMismatches.length > 0) {
    console.log('  → Other (unexpected address):', otherMismatches.length);
  }
  console.log('Could not fetch NFT from MintGarden:', fetchFailed.length);

  if (onChainIsCreatorWallet.length > 0) {
    console.log('\n--- Mismatches: on-chain = creator wallet (pre-SplitXCH or fallback) ---');
    for (const r of onChainIsCreatorWallet) {
      console.log(`  #${r.mintNumber}  creator: ${r.walletAddress.slice(0, 20)}...`);
    }
  }
  if (otherMismatches.length > 0) {
    console.log('\n--- Mismatches: other (first 20) ---');
    for (const r of otherMismatches.slice(0, 20)) {
      console.log(`  #${r.mintNumber} ${r.launcherId}`);
      console.log(`    expected: ${r.expected}`);
      console.log(`    on-chain: ${r.onChain ?? '(null)'}`);
    }
  }

  if (fetchFailed.length > 0) {
    console.log('\n--- Fetch failed (first 10) ---');
    for (const r of fetchFailed.slice(0, 10)) {
      console.log(`  #${r.mintNumber} ${r.launcherId}`);
    }
  }

  console.log('\n--- Conclusion ---');
  if (mismatches.length === 0 && fetchFailed.length === 0) {
    console.log('All minted NFTs have the SplitXCH split set as royalty_address on-chain.');
  } else if (onChainIsCreatorWallet.length === mismatches.length && otherMismatches.length === 0) {
    console.log('All mismatches are explained: on-chain royalty = creator wallet (no split).');
    console.log('Those', onChainIsCreatorWallet.length, 'NFTs were likely minted before SplitXCH was enabled or with fallback to wallet.');
    console.log('SplitXCH is working for all mints that used it (', matched, ').');
  } else if (mismatches.length > 0) {
    console.log('Some NFTs have a different royalty_address than the expected splitter. Review mismatches above.');
  } else {
    console.log('Some NFTs could not be fetched from MintGarden; re-run or check network.');
  }
  console.log('\nDone.');
  process.exit(otherMismatches.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
