/**
 * Trace XCH receiving addresses from Your Wojak sales (type=2 events).
 * Each event has payments; the event's address.encoded_id is one recipient.
 * Run: npx tsx scripts/trace-paid-mint-recipients.ts
 */
/* eslint-disable no-console */

const YOUR_WOJAK_COLLECTION_ID = 'col1rhrjj6f28tge783rp0lrj8ct7vnq79xsnklx3up49lgpnge62ensr2tyfx';
const MINTGARDEN_API = 'https://api.mintgarden.io';

interface Payment {
  puzzle_hash: string;
  amount: number;
  asset_id: string | null;
}

interface EventItem {
  nft_id: string;
  event_index: number;
  type: number;
  timestamp: string;
  xch_price: number;
  payments: Payment[];
  address: { id: string; encoded_id: string };
  previous_address?: { id: string; encoded_id: string };
  nft?: { data?: { name?: string } };
}

interface EventsResponse {
  items?: EventItem[];
  next?: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const recipientToEvents = new Map<string, { count: number; totalMojos: number; nftNames: string[] }>();
  const puzzleHashSeen = new Set<string>();
  let pageCursor: string | null = null;
  let pageNum = 0;
  const maxPages = 30;

  while (pageNum < maxPages) {
    const url = new URL(`${MINTGARDEN_API}/events`);
    url.searchParams.set('collection', YOUR_WOJAK_COLLECTION_ID);
    url.searchParams.set('type', '2');
    url.searchParams.set('size', '100');
    if (pageCursor) url.searchParams.set('page', pageCursor);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`MintGarden events: ${res.status}`);
    const data = (await res.json()) as EventsResponse;
    const items = data.items || [];
    if (items.length === 0) break;

    for (const ev of items) {
      const name = ev.nft?.data?.name ?? ev.nft_id.slice(0, 8);
      // Event's address = recipient of one of the two payments (the main XCH recipient)
      const addr = ev.address?.encoded_id;
      if (addr) {
        const rec = recipientToEvents.get(addr) ?? { count: 0, totalMojos: 0, nftNames: [] };
        rec.count += 1;
        const mainPayment = ev.payments?.find((p) => p.puzzle_hash === ev.address?.id);
        if (mainPayment) rec.totalMojos += mainPayment.amount;
        if (rec.nftNames.length < 3) rec.nftNames.push(name);
        recipientToEvents.set(addr, rec);
      }
      // Track the other payment's puzzle_hash (we don't get encoded_id for it in the API)
      for (const p of ev.payments ?? []) {
        puzzleHashSeen.add(p.puzzle_hash);
      }
    }

    pageCursor = data.next ?? null;
    if (!pageCursor) break;
    pageNum++;
    await sleep(350);
  }

  console.log('XCH receiving addresses from Your Wojak sales (type=2 events)\n');
  const sorted = [...recipientToEvents.entries()].sort((a, b) => b[1].count - a[1].count);
  for (const [encodedId, stats] of sorted) {
    const xch = (stats.totalMojos / 1_000_000_000_000).toFixed(4);
    console.log(`${encodedId}`);
    console.log(`  events: ${stats.count}  total XCH (approx): ${xch}  examples: ${stats.nftNames.join(', ')}`);
    console.log('');
  }
  console.log(`Total unique recipient addresses: ${sorted.length}`);
  console.log(`Total events scanned: ${[...recipientToEvents.values()].reduce((s, r) => s + r.count, 0)}`);
  console.log(`Other payment puzzle_hashes (e.g. royalties) not resolved to address: ${puzzleHashSeen.size} unique`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
