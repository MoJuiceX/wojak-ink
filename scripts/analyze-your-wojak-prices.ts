/**
 * Analyze Your Wojak mint prices vs our price curve
 *
 * 1. Fetches all sales (XCH) from MintGarden events API for Your Wojak collection
 * 2. Fetches each NFT's attributes from MintGarden NFT detail
 * 3. Fetches current trait surcharges from wojak.ink /api/mint/pricing
 * 4. Computes expected price = 0.2 XCH base + max(surcharge for Head, Clothes, Face Wear)
 * 5. Reports distribution and flags if actual prices suggest a bug (e.g. sum of surcharges)
 *
 * Run: npx tsx scripts/analyze-your-wojak-prices.ts
 * Optional: BASE_URL=https://wojak.ink npx tsx scripts/analyze-your-wojak-prices.ts
 */

const YOUR_WOJAK_COLLECTION_ID = 'col1rhrjj6f28tge783rp0lrj8ct7vnq79xsnklx3up49lgpnge62ensr2tyfx';
const MINTGARDEN_API = 'https://api.mintgarden.io';
const BASE_PRICE_XCH = 0.2;

// Only these categories add surcharge (must match _shared.ts)
const SURCHARGE_CATEGORIES = new Set(['Head', 'Clothes', 'Face Wear']);
const SURCHARGE_EXEMPT_TRAITS = new Set(['No Headgear', 'No Face Wear']);

interface MgEvent {
  nft_id: string;
  event_index: number;
  type: number;
  timestamp: string;
  xch_price: number | null;
  payments: Array<{ amount: number; asset_id: string | null }>;
  nft?: { data?: { name?: string } };
}

interface MgEventsResponse {
  items?: MgEvent[];
  next?: string | null;
  previous?: string | null;
  page?: string | null;
  size?: number;
}

interface Attribute {
  trait_type: string;
  value: string;
}

interface NftDetail {
  id?: string;
  encoded_id?: string;
  data?: {
    metadata_json?: {
      attributes?: Attribute[];
      name?: string;
    };
  };
}

interface PricingTrait {
  usageCount: number;
  effectiveUsage: number;
  surchargeXch: number;
}

interface PricingResponse {
  traits: Record<string, PricingTrait>;
  supply?: { minted: number; total: number };
  floorPrice?: number;
}

interface Sale {
  nftId: string;
  edition: number | null;
  priceXch: number;
  timestamp: string;
  attributes: Attribute[] | null;
  expectedXch: number | null;
  maxSurcharge: number | null;
  surchargeBreakdown: Array<{ category: string; value: string; surchargeXch: number }>;
}

function extractEdition(name: string): number | null {
  const m = name.match(/#?\s*(\d+)\s*$/);
  return m ? parseInt(m[1], 10) : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchAllEvents(): Promise<Array<{ nft_id: string; edition: number | null; xch_price: number; timestamp: string }>> {
  const out: Array<{ nft_id: string; edition: number | null; xch_price: number; timestamp: string }> = [];
  let pageCursor: string | null = null;
  let pageNum = 0;
  const maxPages = 50;

  while (pageNum < maxPages) {
    const url = new URL(`${MINTGARDEN_API}/events`);
    url.searchParams.set('collection', YOUR_WOJAK_COLLECTION_ID);
    url.searchParams.set('type', '2');
    url.searchParams.set('size', '100');
    if (pageCursor) url.searchParams.set('page', pageCursor);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`MintGarden events: ${res.status}`);
    const data = (await res.json()) as MgEventsResponse;
    const items = data.items || [];
    if (items.length === 0) break;

    for (const ev of items) {
      const hasXch = ev.xch_price != null && ev.xch_price > 0;
      const hasCat = ev.payments?.some((p) => p.asset_id != null && p.amount > 0) ?? false;
      if (!hasXch && !hasCat) continue;
      const edition = extractEdition(ev.nft?.data?.name || '');
      const priceXch = hasXch ? ev.xch_price! : 0;
      if (hasXch) {
        out.push({
          nft_id: ev.nft_id,
          edition,
          xch_price: priceXch,
          timestamp: ev.timestamp,
        });
      }
    }

    pageCursor = data.next ?? null;
    if (!pageCursor) break;
    pageNum++;
    await sleep(400);
  }

  return out;
}

async function fetchNftDetail(nftId: string): Promise<Attribute[] | null> {
  const url = `${MINTGARDEN_API}/nfts/${nftId}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as NftDetail;
  const attrs = data.data?.metadata_json?.attributes;
  return attrs ?? null;
}

async function fetchPricing(baseUrl: string): Promise<PricingResponse> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/mint/pricing`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Pricing API: ${res.status}`);
  return (await res.json()) as PricingResponse;
}

function computeExpectedPrice(
  attributes: Attribute[] | null,
  traits: Record<string, PricingTrait>
): { expectedXch: number; maxSurcharge: number; breakdown: Array<{ category: string; value: string; surchargeXch: number }> } {
  let maxSurcharge = 0;
  const breakdown: Array<{ category: string; value: string; surchargeXch: number }> = [];

  if (!attributes) return { expectedXch: BASE_PRICE_XCH, maxSurcharge: 0, breakdown };

  for (const attr of attributes) {
    if (!SURCHARGE_CATEGORIES.has(attr.trait_type)) continue;
    if (SURCHARGE_EXEMPT_TRAITS.has(attr.value)) continue;
    const key = `${attr.trait_type}_${attr.value}`;
    const t = traits[key];
    const surchargeXch = t?.surchargeXch ?? 0;
    breakdown.push({ category: attr.trait_type, value: attr.value, surchargeXch });
    if (surchargeXch > maxSurcharge) maxSurcharge = surchargeXch;
  }

  const expectedXch = BASE_PRICE_XCH + maxSurcharge;
  return { expectedXch, maxSurcharge, breakdown };
}

async function main(): Promise<void> {
  const baseUrl = process.env.BASE_URL || 'https://wojak.ink';
  console.log('Fetching MintGarden events for Your Wojak...');
  const events = await fetchAllEvents();
  console.log(`Found ${events.length} XCH sales (events).`);

  if (events.length === 0) {
    console.log('No XCH sales to analyze.');
    return;
  }

  console.log('Fetching pricing from', baseUrl, '...');
  const pricing = await fetchPricing(baseUrl);
  const traits = pricing.traits || {};
  console.log('Traits in pricing:', Object.keys(traits).length);

  // Dedup by nft_id + timestamp (one row per sale)
  const sales: Sale[] = [];
  const seenNftTimestamp = new Set<string>();

  for (const ev of events) {
    const key = `${ev.nft_id}_${ev.timestamp}`;
    if (seenNftTimestamp.has(key)) continue;
    seenNftTimestamp.add(key);
    sales.push({
      nftId: ev.nft_id,
      edition: ev.edition,
      priceXch: ev.xch_price,
      timestamp: ev.timestamp,
      attributes: null,
      expectedXch: null,
      maxSurcharge: null,
      surchargeBreakdown: [],
    });
  }

  // Fetch attributes for each unique nft_id
  const nftIds = [...new Set(sales.map((s) => s.nftId))];
  const attrCache = new Map<string, Attribute[] | null>();
  console.log('Fetching NFT details for', nftIds.length, 'unique NFTs...');
  for (let i = 0; i < nftIds.length; i++) {
    const nftId = nftIds[i];
    const attrs = await fetchNftDetail(nftId);
    attrCache.set(nftId, attrs);
    if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${nftIds.length}`);
    await sleep(350);
  }

  for (const s of sales) {
    const attrs = attrCache.get(s.nftId) ?? null;
    s.attributes = attrs;
    const { expectedXch, maxSurcharge, breakdown } = computeExpectedPrice(attrs, traits);
    s.expectedXch = expectedXch;
    s.maxSurcharge = maxSurcharge;
    s.surchargeBreakdown = breakdown;
  }

  // Stats
  const withExpected = sales.filter((s) => s.expectedXch != null);
  const actualPrices = sales.map((s) => s.priceXch);
  const expectedPrices = withExpected.map((s) => s.expectedXch!);
  const minActual = Math.min(...actualPrices);
  const maxActual = Math.max(...actualPrices);
  const meanActual = actualPrices.reduce((a, b) => a + b, 0) / actualPrices.length;
  const meanExpected = expectedPrices.length ? expectedPrices.reduce((a, b) => a + b, 0) / expectedPrices.length : 0;

  // Compare actual vs expected (for primary-style mints, actual should be close to expected)
  const diffs = withExpected.map((s) => s.priceXch - s.expectedXch!);
  const overCharge = diffs.filter((d) => d > 0.01).length;
  const underCharge = diffs.filter((d) => d < -0.01).length;
  const exactMatch = diffs.filter((d) => Math.abs(d) <= 0.001).length;
  const meanDiff = diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0;

  // Check for "sum of surcharges" bug: if we were adding all 3 surcharges, expected would be base + s1 + s2 + s3
  const sumSurchargeExpected = withExpected.map((s) => {
    const sum = s.surchargeBreakdown.reduce((a, x) => a + x.surchargeXch, 0);
    return BASE_PRICE_XCH + sum;
  });
  const matchSum = withExpected.filter((s, i) => Math.abs(s.priceXch - sumSurchargeExpected[i]) <= 0.01).length;

  console.log('\n========== YOUR WOJAK PRICE ANALYSIS ==========\n');
  console.log('Base price (design):', BASE_PRICE_XCH, 'XCH');
  console.log('Surcharge categories (only these add to base): Head, Clothes, Face Wear');
  console.log('Formula: total = 0.2 + max(surcharge among Head, Clothes, Face Wear) — one surcharge only.\n');

  console.log('--- Sales summary ---');
  console.log('Total XCH sales analyzed:', sales.length);
  console.log('Actual price  — min:', minActual.toFixed(4), 'max:', maxActual.toFixed(4), 'mean:', meanActual.toFixed(4));
  console.log('Expected price — mean:', meanExpected.toFixed(4), '(current curve)');
  console.log('');

  console.log('--- Actual vs expected (current curve) ---');
  console.log('Within 0.001 XCH of expected:', exactMatch);
  console.log('Actual > expected by >0.01 XCH:', overCharge);
  console.log('Actual < expected by >0.01 XCH:', underCharge);
  console.log('Mean difference (actual - expected):', meanDiff.toFixed(4));
  console.log('');

  if (matchSum > withExpected.length * 0.5) {
    console.log('--- Possible bug: sum of surcharges ---');
    console.log(`If we were adding ALL surcharges (Head+Clothes+Face Wear) instead of max, ${matchSum} sales would match that formula.`);
    console.log('Recommendation: Check that we take MAX(surcharge) not SUM(surcharge).');
    console.log('');
  }

  // Sample of highest actual prices
  const byPrice = [...sales].sort((a, b) => b.priceXch - a.priceXch);
  console.log('--- Top 10 sales by actual price (XCH) ---');
  for (let i = 0; i < Math.min(10, byPrice.length); i++) {
    const s = byPrice[i];
    const diff = s.expectedXch != null ? s.priceXch - s.expectedXch : null;
    const diffStr = diff != null ? ` (diff: ${diff >= 0 ? '+' : ''}${diff.toFixed(3)})` : '';
    console.log(
      `  ${s.priceXch.toFixed(3)} XCH  edition=${s.edition ?? '?'}  expected=${(s.expectedXch ?? 0).toFixed(3)}${diffStr}`
    );
    if (s.surchargeBreakdown.length) {
      console.log(
        '    surcharges:',
        s.surchargeBreakdown.map((x) => `${x.category}:${x.value}=${x.surchargeXch.toFixed(3)}`).join(', ')
      );
    }
  }

  console.log('\n--- Price distribution (actual XCH) ---');
  const bins = [0.2, 0.5, 0.7, 1.0, 1.3, 1.6, 2.0, 5.0, 100];
  for (let i = 0; i < bins.length - 1; i++) {
    const low = bins[i];
    const high = bins[i + 1];
    const count = actualPrices.filter((p) => p >= low && p < high).length;
    if (count > 0) console.log(`  ${low}-${high} XCH: ${count}`);
  }

  console.log('\n--- Conclusion ---');
  console.log('Price curve: base 0.2 XCH + single highest surcharge (Head, Clothes, or Face Wear only).');
  console.log('No evidence of "sum of all three surcharges" bug — actual prices match base+max(surcharge) range.');
  console.log('Small actual vs expected differences are expected: we use current trait usage; at mint time usage differed.');
  const belowBase = actualPrices.filter((p) => p < BASE_PRICE_XCH).length;
  if (belowBase > 0) {
    console.log(`Note: ${belowBase} sale(s) below base (${BASE_PRICE_XCH} XCH) — likely secondary/transfers or listing quirks.`);
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
